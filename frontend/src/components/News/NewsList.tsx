import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders } from '../../api';
import NewsCard from './NewsCard';
import type { NewsItem, NewsScope } from './types';
import styles from './News.module.css';

type Props = {
  scope: NewsScope;
  refreshKey?: number;
  emptyText?: string;
};

function endpoint(scope: NewsScope) {
  return scope.type === 'global' ? '/news' : `/storybooks/${scope.storybookId}/news`;
}

export default function NewsList({ scope, refreshKey = 0, emptyText }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const url = endpoint(scope);

  const load = useCallback(() => {
    setLoading(true);
    fetch(apiUrl(url), { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: NewsItem[]) => {
        setItems(data);
        setError(null);
      })
      .catch(() => setError(t('news.loadError')))
      .finally(() => setLoading(false));
  }, [url, t]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) return <p className={styles.muted}>{t('common.loading')}</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (items.length === 0) return <p className={styles.muted}>{emptyText ?? t('news.empty')}</p>;

  return (
    <div className={styles.stack}>
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  );
}
