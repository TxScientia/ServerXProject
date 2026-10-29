import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import type { Plot } from '../../components/PlotCard';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import styles from './StoryBooks.module.css';
import PageHeading from '../../components/PageHeading';

type Storybook = Plot;

export default function StoryBooks() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [storybooks, setStorybooks] = useState<Storybook[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  // Filters (client-side; the list is already fully loaded).
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [poolTags, setPoolTags] = useState<string[]>([]);

  const fetchStorybooks = useCallback(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    if (!localStorage.getItem('characterId')) {
      navigate('/lobby');
      return;
    }
    setError(null);
    fetch(apiUrl('/storybooks'), { headers: { ...authHeaders() } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setStorybooks)
      .catch(() => setError(t('storybooks.loadError')));
  }, [navigate, t]);

  useEffect(() => {
    fetchStorybooks();
  }, [fetchStorybooks]);

  // The admin-managed tag pool, used to offer tag filter chips.
  useEffect(() => {
    fetch(apiUrl('/tags'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((items: { name: string }[]) => setPoolTags(items.map((item) => item.name)))
      .catch(() => undefined);
  }, []);

  const toggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };

  const hasFilters = search.trim() !== '' || selectedTags.length > 0;

  const clearFilters = () => {
    setSearch('');
    setSelectedTags([]);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return storybooks.filter((sb) => {
      // One search box matches either the title or the creator.
      if (query) {
        const haystack = `${sb.title} ${sb.owner_character_name ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      // Tag match: a plot passes if it carries at least one of the selected tags.
      if (selectedTags.length > 0 && !selectedTags.some((tag) => sb.tags.includes(tag))) {
        return false;
      }
      return true;
    });
  }, [storybooks, search, selectedTags]);

  const handleCreate = () => {
    fetch(apiUrl('/storybooks'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...characterHeaders(),
      },
      body: JSON.stringify(form),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => {
        setShowModal(false);
        setForm({ title: '', description: '' });
        fetchStorybooks();
      })
      .catch(() => alert(t('storybooks.createError')));
  };

  const leftNav = (
    <div className={styles.sideNav}>
      <div className={styles.sideTitle}>{t('storybooks.sideTitle')}</div>

      <div className={styles.filterTitle}>{t('storybooks.filterBy')}</div>
      <label className={styles.filterField}>
        {t('storybooks.search')}
        <input
          className="text-input"
          placeholder={t('storybooks.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className={styles.filterField}>
        {t('storybooks.tags')}
        {poolTags.length === 0 ? (
          <span className={styles.muted}>{t('storybooks.noTags')}</span>
        ) : (
          <div className={styles.tagFilter}>
            {poolTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`${styles.tagChip} ${
                  selectedTags.includes(tag) ? styles.tagChipSelected : ''
                }`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasFilters && (
        <button type="button" className={styles.clearFilters} onClick={clearFilters}>
          {t('storybooks.clearFilters')}
        </button>
      )}
    </div>
  );

  return (
    <AppLayout leftNav={leftNav} scrollCenterFromPage hideCenterScrollbar growCenterFrame>
      <header className={styles.header}>
        <PageHeading title={t('storybooks.catalogTitle')} subtitle={t('storybooks.subtitle')} />
        <div className={styles.createRow}>
          <button className={`button ${styles.createButton}`} onClick={() => setShowModal(true)}>
            {t('storybooks.newPlot')}
          </button>
        </div>
      </header>

      {error && <p role="alert" className={styles.error}>{error}</p>}

      <section className={styles.catalog} aria-label={t('storybooks.catalogTitle')}>
        {!error && storybooks.length === 0 && (
          <p className={styles.muted}>{t('storybooks.empty')}</p>
        )}
        {storybooks.length > 0 && filtered.length === 0 && (
          <p className={styles.muted}>{t('storybooks.noMatches')}</p>
        )}
        {filtered.map((sb, index) => (
          <article key={sb.id} className={styles.book}>
            <div className={styles.storyPage}>
              <div className={styles.metadata}>
                <span>Storybook N° {String(index + 1).padStart(3, '0')}</span>
                <span>{t('plotCard.createdBy')} {sb.owner_character_name ?? '—'}</span>
              </div>
              <h2 className={styles.bookTitle}>{sb.title}</h2>
              <p className={styles.tags}>{sb.tags.join(' · ') || t('storybooks.untagged')}</p>
              <div className={styles.ornament} aria-hidden="true"><span>◇</span></div>
              <p className={styles.description}>{sb.description || t('storybooks.noDescription')}</p>
              <div className={styles.bookFooter}>
                <span className={styles.visibility}>
                  {t(sb.visibility === 'public' ? 'plotCard.public' : sb.visibility === 'generic' ? 'plotCard.generic' : 'plotCard.private')}
                </span>
                <Link className={styles.openBook} to={`/storybooks/${sb.id}`} aria-label={t('storybooks.openTitle', { title: sb.title })}>
                  {t('storybooks.open')} <span aria-hidden="true">⟶</span>
                </Link>
              </div>
            </div>
            <div className={styles.coverPage}>
              <div className={styles.cover}>
                {sb.image_url ? (
                  <img className={styles.coverImage} src={sb.image_url} alt="" />
                ) : (
                  <div className={styles.coverPlaceholder} aria-hidden="true">
                    <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M40 19C28 12 15 15 8 19v43c10-5 22-5 32 1 10-6 22-6 32-1V19c-7-4-20-7-32 0Zm0 0v44" />
                      <path d="m35 7 5-5 5 5-5 5Z M21 29c5-1 9 0 13 2m-13 8c5-1 9 0 13 2m12-10c4-2 8-3 13-2m-13 12c4-2 8-3 13-2" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>{t('storybooks.newPlotModal')}</h2>
            <label>
              {t('storybooks.plotTitle')}
              <input
                className="text-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              {t('storybooks.description')}
              <textarea
                className="text-input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className={styles.modalActions}>
              <button className="button" onClick={handleCreate} disabled={!form.title}>
                {t('common.create')}
              </button>
              <button className="button button--ghost" onClick={() => setShowModal(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
