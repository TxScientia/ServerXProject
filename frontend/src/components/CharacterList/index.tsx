import { useTranslation } from 'react-i18next';
import styles from './CharacterList.module.css';

export type Character = {
  id: string;
  name: string;
  race: string;
  spec: string;
  gender: string;
  editorData?: Record<string, unknown>;
  isFavorite?: boolean;
};

type CharacterListProps = {
  characters: Character[];
  /** When provided, only the character-name cell selects the character. */
  onSelect?: (character: Character) => void;
  editorPageHref?: (character: Character) => string;
  profilePageHref?: (character: Character) => string;
  onToggleFavorite?: (character: Character) => void;
  onDelete?: (character: Character) => void;
  busyCharacterIds?: ReadonlySet<string>;
};

/**
 * A table of characters. Shared by the Lobby (your own characters, selectable)
 * and Residents (all characters, browse-only).
 */
export default function CharacterList({ characters, onSelect, editorPageHref, profilePageHref, onToggleFavorite, onDelete, busyCharacterIds }: CharacterListProps) {
  const { t } = useTranslation();
  const hasActions = Boolean(profilePageHref || editorPageHref || onToggleFavorite || onDelete);

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{t('characterList.colName')}</th>
          <th>{t('characterList.colRace')}</th>
          <th>{t('characterList.colSpec')}</th>
          <th>{t('characterList.colGender')}</th>
          {hasActions && <th>{t('characterList.colActions')}</th>}
        </tr>
      </thead>
      <tbody>
        {characters.map((c) => (
          <tr key={c.id}>
            <td
              className={onSelect ? styles.clickable : undefined}
              onClick={onSelect ? () => onSelect(c) : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onKeyDown={onSelect ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(c);
                }
              } : undefined}
              title={onSelect ? t('characterList.playAs') : undefined}
            >
              {c.name}
            </td>
            <td>{c.race}</td>
            <td>{c.spec}</td>
            <td>{c.gender}</td>
            {hasActions && (
              <td>
                {profilePageHref && (
                  <a
                    className={styles.iconButton}
                    href={profilePageHref(c)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`${c.name} Profil in neuem Tab öffnen`}
                    title="Profil in neuem Tab öffnen"
                  >
                    👁
                  </a>
                )}
                {editorPageHref && (
                  <a
                    className={styles.iconButton}
                    href={editorPageHref(c)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`${c.name} in neuem Tab bearbeiten`}
                    title="Editor in neuem Tab öffnen"
                  >
                    ↗
                  </a>
                )}
                {onToggleFavorite && (
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={busyCharacterIds?.has(c.id)}
                    aria-pressed={Boolean(c.isFavorite)}
                    aria-label={t(c.isFavorite ? 'characterList.unfavorite' : 'characterList.favorite', { name: c.name })}
                    title={t(c.isFavorite ? 'characterList.unfavorite' : 'characterList.favorite', { name: c.name })}
                    onClick={() => onToggleFavorite(c)}
                  >
                    {c.isFavorite ? '★' : '☆'}
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={busyCharacterIds?.has(c.id)}
                    aria-label={t('characterList.delete', { name: c.name })}
                    title={t('characterList.delete', { name: c.name })}
                    onClick={() => onDelete(c)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                    </svg>
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
