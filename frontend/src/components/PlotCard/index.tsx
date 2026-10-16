import { useTranslation } from 'react-i18next';
import Card from '../Card';
import styles from './PlotCard.module.css';

export type Plot = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  visibility: string | null;
  owner_character_id: string;
  owner_character_name: string | null;
  member_count: number;
  tags: string[];
  created_at: string;
};

type PlotCardProps = {
  plot: Plot;
  onClick: () => void;
};

/** Up to two initials from a character name, e.g. "Mara Lindqvist" → "ML". */
function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const LayersIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5.5a3.5 3.5 0 0 1 0 6.9M22 20a6.5 6.5 0 0 0-5-6.3" />
  </svg>
);

const ImagePlaceholder = () => (
  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M4 18l5-5 4 4 3-3 4 4" />
  </svg>
);

/** Icon + translated label for a plot's visibility. */
function visibilityMeta(visibility: string | null) {
  switch (visibility) {
    case 'public':
      return { icon: <GlobeIcon />, key: 'plotCard.public' };
    case 'generic':
      return { icon: <LayersIcon />, key: 'plotCard.generic' };
    default: // private_listed | private_hidden | null
      return { icon: <LockIcon />, key: 'plotCard.private' };
  }
}

/** A StoryBook/plot card. Built on the shared Card shell. */
export default function PlotCard({ plot, onClick }: PlotCardProps) {
  const { t } = useTranslation();
  const vis = visibilityMeta(plot.visibility);

  return (
    <Card onClick={onClick} className={styles.plotCard}>
      <div className={styles.banner}>
        {plot.image_url ? (
          <img className={styles.bannerImage} src={plot.image_url} alt="" />
        ) : (
          <span className={styles.bannerPlaceholder}>
            <ImagePlaceholder />
          </span>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{plot.title}</h3>
        {plot.description && <p className={styles.description}>{plot.description}</p>}

        {plot.tags.length > 0 && (
          <div className={styles.tags}>
            {plot.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <hr className={styles.divider} />

        <div className={styles.footer}>
          <div className={styles.creator}>
            <span className={styles.avatar}>{initials(plot.owner_character_name)}</span>
            <span className={styles.creatorText}>
              <span className={styles.createdBy}>{t('plotCard.createdBy')}</span>
              <span className={styles.creatorName}>{plot.owner_character_name ?? '—'}</span>
            </span>
          </div>

          <span className={styles.visBadge}>
            {vis.icon}
            {t(vis.key)}
          </span>

          <span className={styles.members} title={t('plotCard.members', { count: plot.member_count })}>
            <PeopleIcon />
            {plot.member_count}
          </span>
        </div>
      </div>
    </Card>
  );
}
