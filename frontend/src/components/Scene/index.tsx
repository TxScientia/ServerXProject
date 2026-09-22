import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import type { RichTextDoc } from '../RichTextEditor';
import Post from '../Post';
import PostComposer from '../PostComposer';
import type { SceneRead, SceneWithPosts } from './types';
import styles from './Scene.module.css';

type Props = {
  storybookId: string;
  placeId: string;
  /** The viewer may moderate this plot (creator/editor) — can finish/reopen any scene. */
  canModerate?: boolean;
};

function postHeaders() {
  return { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() };
}

export default function Scene({ storybookId, placeId, canModerate = false }: Props) {
  const { t } = useTranslation();
  const [scenes, setScenes] = useState<SceneRead[]>([]);
  const [active, setActive] = useState<SceneWithPosts | null>(null);
  const [openHistory, setOpenHistory] = useState<Record<string, SceneWithPosts>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const myCharacterId = localStorage.getItem('characterId');
  const canPost = !!myCharacterId;

  const getScene = useCallback(
    (sceneId: string): Promise<SceneWithPosts> =>
      fetch(apiUrl(`/storybooks/${storybookId}/scenes/${sceneId}`), { headers: authHeaders() }).then(
        (r) => {
          if (!r.ok) throw new Error();
          return r.json();
        },
      ),
    [storybookId],
  );

  const load = useCallback(() => {
    setLoading(true);
    fetch(apiUrl(`/storybooks/${storybookId}/places/${placeId}/scenes`), { headers: authHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(async (list: SceneRead[]) => {
        setScenes(list);
        setOpenHistory({});
        const activeSummary = list.find((s) => s.status === 'active');
        setActive(activeSummary ? await getScene(activeSummary.id) : null);
        setError(null);
      })
      .catch(() => setError(t('scene.loadError')))
      .finally(() => setLoading(false));
  }, [storybookId, placeId, getScene, t]);

  useEffect(() => {
    load();
  }, [load]);

  const startScene = async ({ title, body }: { title?: string; body: RichTextDoc }) => {
    const resp = await fetch(apiUrl(`/storybooks/${storybookId}/places/${placeId}/scenes`), {
      method: 'POST',
      headers: postHeaders(),
      body: JSON.stringify({ title, body }),
    });
    if (!resp.ok) throw new Error();
    load();
  };

  const reply = async ({ body }: { body: RichTextDoc }) => {
    if (!active) return;
    const resp = await fetch(apiUrl(`/storybooks/${storybookId}/scenes/${active.id}/posts`), {
      method: 'POST',
      headers: postHeaders(),
      body: JSON.stringify({ body }),
    });
    if (!resp.ok) throw new Error();
    load();
  };

  // Participants and plot moderators may finish/reopen a scene.
  const canManage = (participantIds: string[]) =>
    canModerate || (myCharacterId != null && participantIds.includes(myCharacterId));

  const manageScene = async (sceneId: string, action: 'finish' | 'reopen') => {
    const resp = await fetch(apiUrl(`/storybooks/${storybookId}/scenes/${sceneId}/${action}`), {
      method: 'POST',
      headers: postHeaders(),
    });
    if (resp.ok) load();
    else setError(t('scene.saveError'));
  };

  const toggleHistory = async (scene: SceneRead) => {
    if (openHistory[scene.id]) {
      setOpenHistory((prev) => {
        const next = { ...prev };
        delete next[scene.id];
        return next;
      });
      return;
    }
    const detail = await getScene(scene.id);
    setOpenHistory((prev) => ({ ...prev, [scene.id]: detail }));
  };

  if (loading) return <p className={styles.muted}>{t('common.loading')}</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  const history = scenes.filter((s) => s.status !== 'active');

  const renderThread = (scene: SceneWithPosts, editable: boolean) =>
    scene.posts.map((p, i) => (
      <Post
        key={p.id}
        post={p}
        storybookId={storybookId}
        sceneId={scene.id}
        isFirst={i === 0}
        sceneTitle={scene.title}
        editable={editable && p.author_character_id === myCharacterId}
        onChanged={load}
      />
    ));

  return (
    <section className={styles.scene}>
      {active ? (
        <>
          <div className={styles.header}>
            <h2 className={styles.title}>{active.title}</h2>
            <div className={styles.headerRight}>
              <span className={styles.meta}>
                {t('scene.participants', { count: active.participant_ids.length })}
              </span>
              {canManage(active.participant_ids) && (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => manageScene(active.id, 'finish')}
                >
                  {t('scene.finish')}
                </button>
              )}
            </div>
          </div>
          {renderThread(active, canPost)}
          {canPost ? (
            <PostComposer mode="reply" onSubmit={reply} />
          ) : (
            <p className={styles.muted}>{t('scene.selectCharacterToPost')}</p>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.muted}>{t('scene.noActiveScene')}</p>
          {canPost ? (
            <PostComposer mode="newScene" onSubmit={startScene} />
          ) : (
            <p className={styles.muted}>{t('scene.selectCharacterToPost')}</p>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className={styles.history}>
          <h3 className={styles.historyTitle}>{t('scene.pastScenes')}</h3>
          {history.map((s) => (
            <div key={s.id} className={styles.historyItem}>
              <div className={styles.historyRow}>
                <button type="button" className={styles.historyToggle} onClick={() => toggleHistory(s)}>
                  <span>{openHistory[s.id] ? '▾' : '▸'}</span>
                  <span className={styles.historyName}>{s.title}</span>
                  <span className={styles.historyStatus}>{t(`scene.status.${s.status}`)}</span>
                </button>
                {/* Reopen only when the place is free (no active scene) and the viewer may manage it. */}
                {!active && canManage(s.participant_ids) && (
                  <button
                    type="button"
                    className={styles.reopenBtn}
                    onClick={() => manageScene(s.id, 'reopen')}
                  >
                    {t('scene.reopen')}
                  </button>
                )}
              </div>
              {openHistory[s.id] && <div>{renderThread(openHistory[s.id], false)}</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
