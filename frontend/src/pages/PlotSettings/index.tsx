import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import { Modal, ModalActions, ModalSpacer } from '../../components/Modal';
import InviteModal from '../../components/InviteModal/InviteModal';
import PlaceTreeEditor, { Place } from '../../components/PlaceTreeEditor';
import NewsComposer from '../../components/News/NewsComposer';
import NewsList from '../../components/News/NewsList';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import styles from './PlotSettings.module.css';

type Storybook = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  biography: string | null;
  visibility: string | null;
  tags: string[];
  places: Place[];
};

type Rank = {
  id: string;
  name: string;
  weight: number;
  created_at: string;
};

type Member = {
  character_id: string;
  name: string;
  role: string;
};

type LinkedSpace = {
  id: string;
  title: string;
  description: string | null;
};

type PendingLink = {
  id: string;
  source_space_id: string;
  source_title: string;
};

type RankDraft = {
  id?: string;
  name: string;
  weight: number;
};

type SettingsSection = 'general' | 'tree' | 'ranks' | 'members' | 'linked-plots' | 'news';

type StatusMessage = {
  kind: 'ok' | 'error';
  msg: string;
  section: SettingsSection;
};

const VISIBILITY_OPTIONS = [
  { value: 'generic', key: 'plotSettings.visGeneric' },
  { value: 'public', key: 'plotSettings.visPublic' },
  { value: 'private_listed', key: 'plotSettings.visPrivateListed' },
  { value: 'private_hidden', key: 'plotSettings.visPrivateHidden' },
];

const MAX_TAGS = 6;

export default function PlotSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [section, setSection] = useState<SettingsSection>('general');
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [rankDraft, setRankDraft] = useState<RankDraft | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    biography: '',
    visibility: 'public',
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [linkedSpaces, setLinkedSpaces] = useState<LinkedSpace[]>([]);
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const [inviteMode, setInviteMode] = useState<'character' | 'plot' | null>(null);
  const [newsRefreshKey, setNewsRefreshKey] = useState(0);

  const fetchStorybook = useCallback(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    if (!localStorage.getItem('characterId')) {
      navigate('/lobby');
      return;
    }
    fetch(apiUrl(`/storybooks/${id}`), { headers: { ...authHeaders() } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((sb: Storybook) => {
        setStorybook(sb);
        setForm({
          title: sb.title ?? '',
          description: sb.description ?? '',
          image_url: sb.image_url ?? '',
          biography: sb.biography ?? '',
          visibility: sb.visibility ?? 'public',
        });
        setTags(sb.tags ?? []);
      })
      .catch(() => setStatus({ kind: 'error', msg: t('plotSettings.loadError'), section: 'general' }));
  }, [id, navigate, t]);

  const fetchRanks = useCallback(() => {
    if (!id) return;
    fetch(apiUrl(`/storybooks/${id}/ranks`), { headers: { ...authHeaders() } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((items: Rank[]) => {
        setRanks([...items].sort((a, b) => a.weight - b.weight || a.created_at.localeCompare(b.created_at)));
      })
      .catch(() => setStatus({ kind: 'error', msg: t('plotSettings.rankLoadError'), section: 'ranks' }));
  }, [id, t]);

  const fetchMembers = useCallback(() => {
    if (!id) return;
    fetch(apiUrl(`/storybooks/${id}/members`), {
      headers: { ...authHeaders(), ...characterHeaders() },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((items: Member[]) => setMembers(items))
      .catch(() => setStatus({ kind: 'error', msg: t('plotSettings.membersLoadError'), section: 'members' }));
  }, [id, t]);

  const fetchLinkedPlots = useCallback(() => {
    if (!id) return;
    fetch(apiUrl(`/storybooks/${id}/linked-plots`), {
      headers: { ...authHeaders(), ...characterHeaders() },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: { linked_spaces: LinkedSpace[]; pending_invitations: PendingLink[] }) => {
        setLinkedSpaces(data.linked_spaces);
        setPendingLinks(data.pending_invitations);
      })
      .catch(() => setStatus({ kind: 'error', msg: t('plotSettings.linkedLoadError'), section: 'linked-plots' }));
  }, [id, t]);

  useEffect(() => {
    fetchStorybook();
  }, [fetchStorybook]);

  useEffect(() => {
    if (section === 'ranks') fetchRanks();
    if (section === 'members') fetchMembers();
    if (section === 'linked-plots') fetchLinkedPlots();
  }, [section, fetchRanks, fetchMembers, fetchLinkedPlots]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 3500);
    return () => window.clearTimeout(timer);
  }, [status]);

  const addTag = () => {
    const v = tagInput.trim();
    if (v && tags.length < MAX_TAGS && !tags.includes(v)) setTags([...tags, v]);
    setTagInput('');
  };

  const saveGeneral = () => {
    fetch(apiUrl(`/storybooks/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() },
      body: JSON.stringify({ ...form, tags }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => setStatus({ kind: 'ok', msg: t('plotSettings.saved'), section: 'general' }))
      .catch(() => setStatus({ kind: 'error', msg: t('plotSettings.saveError'), section: 'general' }));
  };

  const openNewRank = () => setRankDraft({ name: '', weight: 1 });
  const openEditRank = (rank: Rank) => setRankDraft({ id: rank.id, name: rank.name, weight: rank.weight });

  const saveRank = () => {
    if (!rankDraft) return;
    const name = rankDraft.name.trim();
    if (!name) return;
    const isEdit = Boolean(rankDraft.id);
    fetch(apiUrl(`/storybooks/${id}/ranks${isEdit ? `/${rankDraft.id}` : ''}`), {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() },
      body: JSON.stringify({ name, weight: rankDraft.weight }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => {
        setRankDraft(null);
        setStatus({ kind: 'ok', msg: t('plotSettings.rankSaved'), section: 'ranks' });
        fetchRanks();
      })
      .catch(() => setStatus({ kind: 'error', msg: t('plotSettings.rankSaveError'), section: 'ranks' }));
  };

  const deleteRank = () => {
    if (!rankDraft?.id) return;
    fetch(apiUrl(`/storybooks/${id}/ranks/${rankDraft.id}`), {
      method: 'DELETE',
      headers: { ...authHeaders(), ...characterHeaders() },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
      })
      .then(() => {
        setRankDraft(null);
        setStatus({ kind: 'ok', msg: t('plotSettings.rankDeleted'), section: 'ranks' });
        fetchRanks();
      })
      .catch(() => setStatus({ kind: 'error', msg: t('plotSettings.rankDeleteError'), section: 'ranks' }));
  };

  const handleInviteCharacter = (characterId: string) => {
    fetch(apiUrl(`/storybooks/${id}/invites/characters`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() },
      body: JSON.stringify({ character_id: characterId, space_id: id }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => {
        setInviteMode(null);
        setStatus({ kind: 'ok', msg: t('plotSettings.inviteSent'), section: 'members' });
      })
      .catch(() => setStatus({ kind: 'error', msg: t('plotSettings.inviteError'), section: 'members' }));
  };

  const handleInvitePlot = (targetSpaceId: string) => {
    fetch(apiUrl(`/storybooks/${id}/linked-plots/invite`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() },
      body: JSON.stringify({ target_space_id: targetSpaceId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => {
        setInviteMode(null);
        setStatus({ kind: 'ok', msg: t('plotSettings.inviteSent'), section: 'linked-plots' });
        fetchLinkedPlots();
      })
      .catch(() => setStatus({ kind: 'error', msg: t('plotSettings.inviteError'), section: 'linked-plots' }));
  };

  const rankOverlay = rankDraft && (
    <Modal title={rankDraft.id ? t('plotSettings.editRank') : t('plotSettings.addRank')}>
      <label>
        {t('plotSettings.rankName')}
        <input
          className="text-input"
          value={rankDraft.name}
          onChange={(e) => setRankDraft({ ...rankDraft, name: e.target.value })}
        />
      </label>
      <label>
        {t('plotSettings.rankPriority')}
        <input
          className="text-input"
          type="number"
          min="1"
          value={rankDraft.weight}
          onChange={(e) => setRankDraft({ ...rankDraft, weight: Math.max(1, Number(e.target.value) || 1) })}
        />
      </label>
      <p className={styles.muted}>{t('plotSettings.rankPriorityHelp')}</p>
      <ModalActions>
        {rankDraft.id && (
          <button type="button" className="button button--danger" onClick={deleteRank}>
            {t('plotSettings.delete')}
          </button>
        )}
        <ModalSpacer />
        <button type="button" className="button button--ghost" onClick={() => setRankDraft(null)}>
          {t('common.cancel')}
        </button>
        <button type="button" className="button" onClick={saveRank}>
          {t('common.save')}
        </button>
      </ModalActions>
    </Modal>
  );

  const leftNav = (
    <div className={styles.sideNav}>
      <button className={styles.backItem} onClick={() => navigate(`/storybooks/${id}`)}>
        {t('plotSettings.backToPlot')}
      </button>
      <button
        className={`${styles.sideItem} ${section === 'general' ? styles.active : ''}`.trim()}
        onClick={() => setSection('general')}
      >
        {t('plotSettings.general')}
      </button>
      <button
        className={`${styles.sideItem} ${section === 'tree' ? styles.active : ''}`.trim()}
        onClick={() => setSection('tree')}
      >
        {t('plotSettings.tree')}
      </button>
      <button
        className={`${styles.sideItem} ${section === 'ranks' ? styles.active : ''}`.trim()}
        onClick={() => setSection('ranks')}
      >
        {t('plotSettings.ranks')}
      </button>
      <button
        className={`${styles.sideItem} ${section === 'members' ? styles.active : ''}`.trim()}
        onClick={() => setSection('members')}
      >
        {t('plotSettings.members')}
      </button>
      <button
        className={`${styles.sideItem} ${section === 'linked-plots' ? styles.active : ''}`.trim()}
        onClick={() => setSection('linked-plots')}
      >
        {t('plotSettings.linkedPlots')}
      </button>
      <button
        className={`${styles.sideItem} ${section === 'news' ? styles.active : ''}`.trim()}
        onClick={() => setSection('news')}
      >
        {t('plotSettings.news')}
      </button>
    </div>
  );

  return (
    <AppLayout leftNav={leftNav}>
      <h1 className={styles.pageTitle}>{t('plotSettings.title')}</h1>
      {status && status.section === section && (
        <p className={status.kind === 'ok' ? styles.ok : styles.error}>{status.msg}</p>
      )}

      {!storybook ? (
        <p className={styles.muted}>{t('common.loading')}</p>
      ) : section === 'general' ? (
        <div className={styles.form}>
          <label className={styles.field}>
            {t('plotSettings.fieldTitle')}
            <input
              className="text-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>

          <label className={styles.field}>
            {t('plotSettings.plotImage')}
            <input
              className="text-input"
              value={form.image_url}
              placeholder={t('plotSettings.imageUrlPlaceholder')}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
          </label>

          <label className={styles.field}>
            {t('plotSettings.shortDescription')}
            <textarea
              className="text-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <div className={styles.field}>
            {t('plotSettings.tags')} <span className={styles.muted}>({tags.length}/{MAX_TAGS})</span>
            <div className={styles.tagRow}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter((x) => x !== tag))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className={styles.tagAdd}>
              <input
                className="text-input"
                value={tagInput}
                placeholder={t('plotSettings.addTag')}
                disabled={tags.length >= MAX_TAGS}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
            </div>
          </div>

          <label className={styles.field}>
            {t('plotSettings.visibility')}
            <select
              className="select-input"
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value })}
            >
              {VISIBILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.key)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            {t('plotSettings.biography')}
            <textarea
              className={`text-input ${styles.biography}`}
              value={form.biography}
              placeholder={t('plotSettings.biographyPlaceholder')}
              onChange={(e) => setForm({ ...form, biography: e.target.value })}
            />
          </label>

          <div>
            <button className="button" onClick={saveGeneral}>
              {t('common.save')}
            </button>
          </div>
        </div>
      ) : section === 'tree' ? (
        <PlaceTreeEditor
          storybookId={storybook.id}
          places={storybook.places}
          onChanged={fetchStorybook}
        />
      ) : section === 'members' ? (
        <div className={styles.listSection}>
          <div className={styles.listHeader}>
            <h2>{t('plotSettings.members')}</h2>
            <button className="button" onClick={() => setInviteMode('character')}>
              {t('plotSettings.inviteCharacter')}
            </button>
          </div>
          {members.length === 0 ? (
            <p className={styles.muted}>{t('plotSettings.noMembers')}</p>
          ) : (
            <div className={styles.list}>
              {members.map((m) => (
                <div key={m.character_id} className={styles.listCard}>
                  <strong>{m.name}</strong>
                  <span className={styles.roleBadge}>{m.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : section === 'linked-plots' ? (
        <div className={styles.listSection}>
          <div className={styles.listHeader}>
            <h2>{t('plotSettings.linkedPlots')}</h2>
            <button className="button" onClick={() => setInviteMode('plot')}>
              {t('plotSettings.invitePlot')}
            </button>
          </div>

          {pendingLinks.length > 0 && (
            <div className={styles.pendingBlock}>
              <h3 className={styles.muted}>{t('plotSettings.pendingLinks')}</h3>
              {pendingLinks.map((p) => (
                <div key={p.id} className={styles.listCard}>
                  <span>{p.source_title}</span>
                  <span className={styles.roleBadge}>{t('plotSettings.pending')}</span>
                </div>
              ))}
            </div>
          )}

          {linkedSpaces.length === 0 ? (
            <p className={styles.muted}>{t('plotSettings.noLinkedPlots')}</p>
          ) : (
            <div className={styles.list}>
              {linkedSpaces.map((s) => (
                <div key={s.id} className={styles.listCard}>
                  <div>
                    <strong>{s.title}</strong>
                    {s.description && <div className={styles.muted}>{s.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : section === 'news' ? (
        <div className={styles.listSection}>
          <div className={styles.listHeader}>
            <h2>{t('plotSettings.news')}</h2>
          </div>
          <NewsComposer
            scope={{ type: 'storybook', storybookId: storybook.id }}
            onCreated={() => setNewsRefreshKey((x) => x + 1)}
          />
          <h3>{t('news.latest')}</h3>
          <NewsList
            scope={{ type: 'storybook', storybookId: storybook.id }}
            refreshKey={newsRefreshKey}
            emptyText={t('news.emptyPlot')}
          />
        </div>
      ) : (
        <div className={styles.rankSection}>
          {ranks.length > 0 && (
            <div className={styles.rankList}>
              {ranks.map((rank) => (
                <div key={rank.id} className={styles.rankCard}>
                  <div>
                    <strong>{rank.name}</strong>
                    <div className={styles.muted}>{t('plotSettings.rankPriority')}: {rank.weight}</div>
                  </div>
                  <button type="button" className="button button--ghost" onClick={() => openEditRank(rank)}>
                    {t('plotSettings.edit')}
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="button" onClick={openNewRank}>
            {t('plotSettings.addNewRank')}
          </button>
        </div>
      )}
      {rankOverlay}
      {inviteMode === 'character' && (
        <InviteModal
          title={t('plotSettings.inviteCharacter')}
          type="character"
          onClose={() => setInviteMode(null)}
          onSelect={handleInviteCharacter}
          excludeIds={members.map((m) => m.character_id)}
        />
      )}
      {inviteMode === 'plot' && (
        <InviteModal
          title={t('plotSettings.invitePlot')}
          type="plot"
          onClose={() => setInviteMode(null)}
          onSelect={handleInvitePlot}
          excludeIds={[
            ...(storybook ? [storybook.id] : []),
            ...linkedSpaces.map((s) => s.id),
          ]}
        />
      )}
    </AppLayout>
  );
}
