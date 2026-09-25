import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import WantedAdCard from './WantedAdCard';
import type { WantedAd, WantedAdScope } from './types';
import styles from './WantedAds.module.css';

interface WantedAdListProps {
  scope: WantedAdScope;
  refreshKey?: number;
  /** True if the current character moderates this plot (may delete any ad here). */
  canModerate?: boolean;
  emptyText?: string;
}

function endpoint(scope: WantedAdScope) {
  return scope.type === 'global' ? '/wanted-ads' : `/storybooks/${scope.storybookId}/wanted-ads`;
}

export default function WantedAdList({ scope, refreshKey = 0, canModerate = false, emptyText }: WantedAdListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ads, setAds] = useState<WantedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeCharacterId = localStorage.getItem('characterId') || '';

  const load = useCallback(() => {
    setLoading(true);
    fetch(apiUrl(endpoint(scope)), { headers: { ...authHeaders(), ...characterHeaders() } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: WantedAd[]) => {
        setAds(data);
        setError(null);
      })
      .catch(() => setError(t('gesuche.loadError')))
      .finally(() => setLoading(false));
  }, [scope, t]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('gesuche.deleteConfirm'))) return;
    try {
      const res = await fetch(apiUrl(`/wanted-ads/${id}`), {
        method: 'DELETE',
        headers: { ...authHeaders(), ...characterHeaders() },
      });
      if (!res.ok) throw new Error();
      load();
    } catch {
      setError(t('gesuche.deleteError'));
    }
  };

  const handleMessage = async (ad: WantedAd) => {
    try {
      const res = await fetch(apiUrl('/pm/chats/direct'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() },
        body: JSON.stringify({ character_id: ad.author_character_id }),
      });
      if (!res.ok) throw new Error();
      navigate('/pm');
    } catch {
      setError(t('gesuche.messageError'));
    }
  };

  if (loading) return <p className={styles.muted}>{t('common.loading')}</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (ads.length === 0) return <p className={styles.muted}>{emptyText ?? t('gesuche.empty')}</p>;

  return (
    <div className={styles.stack}>
      {ads.map((ad) => (
        <WantedAdCard
          key={ad.id}
          ad={ad}
          canDelete={ad.author_character_id === activeCharacterId || canModerate}
          canMessage={Boolean(activeCharacterId) && ad.author_character_id !== activeCharacterId}
          onDelete={handleDelete}
          onMessage={handleMessage}
        />
      ))}
    </div>
  );
}
