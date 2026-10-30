import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import PlotCard, { Plot } from '../../components/PlotCard';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import styles from './StoryBooks.module.css';

type Storybook = Plot;

export default function StoryBooks() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [storybooks, setStorybooks] = useState<Storybook[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  // Filters (client-side; the list is already fully loaded).
  const [filterTitle, setFilterTitle] = useState('');
  const [filterCreator, setFilterCreator] = useState('');
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

  const hasFilters =
    filterTitle.trim() !== '' || filterCreator.trim() !== '' || selectedTags.length > 0;

  const clearFilters = () => {
    setFilterTitle('');
    setFilterCreator('');
    setSelectedTags([]);
  };

  const filtered = useMemo(() => {
    const title = filterTitle.trim().toLowerCase();
    const creator = filterCreator.trim().toLowerCase();
    return storybooks.filter((sb) => {
      if (title && !sb.title.toLowerCase().includes(title)) return false;
      if (creator && !(sb.owner_character_name ?? '').toLowerCase().includes(creator)) {
        return false;
      }
      // Tag match: a plot passes if it carries at least one of the selected tags.
      if (selectedTags.length > 0 && !selectedTags.some((tag) => sb.tags.includes(tag))) {
        return false;
      }
      return true;
    });
  }, [storybooks, filterTitle, filterCreator, selectedTags]);

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
      <button className={styles.sideItem} onClick={() => navigate('/storybooks')}>
        {t('storybooks.myPlots')}
      </button>
      <button className={styles.sideItem} onClick={() => navigate('/lobby')}>
        {t('storybooks.home')}
      </button>

      <hr className={styles.divider} />

      <div className={styles.filterTitle}>{t('storybooks.filterBy')}</div>
      <label className={styles.filterField}>
        {t('storybooks.filterTitle')}
        <input
          className="text-input"
          placeholder={t('storybooks.filterTitlePlaceholder')}
          value={filterTitle}
          onChange={(e) => setFilterTitle(e.target.value)}
        />
      </label>
      <label className={styles.filterField}>
        {t('storybooks.filterCreator')}
        <input
          className="text-input"
          placeholder={t('storybooks.filterCreatorPlaceholder')}
          value={filterCreator}
          onChange={(e) => setFilterCreator(e.target.value)}
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
    <AppLayout leftNav={leftNav}>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>{t('storybooks.pageTitle')}</h1>
        <button className="button" onClick={() => setShowModal(true)}>
          {t('storybooks.newPlot')}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('storybooks.generic')}</h2>
        <p className={styles.muted}>{t('storybooks.genericSoon')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('storybooks.worldsFromUsers')}</h2>
        {storybooks.length === 0 ? (
          <p className={styles.muted}>{t('storybooks.empty')}</p>
        ) : filtered.length === 0 ? (
          <p className={styles.muted}>{t('storybooks.noMatches')}</p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((sb) => (
              <PlotCard
                key={sb.id}
                plot={sb}
                onClick={() => navigate(`/storybooks/${sb.id}`)}
              />
            ))}
          </div>
        )}
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
