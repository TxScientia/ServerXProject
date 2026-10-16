import { useTranslation } from 'react-i18next';
import styles from './CharacterList.module.css';

export type Character = {
  id: string;
  name: string;
  race: string;
  spec: string;
  gender: string;
  editorData?: Record<string, unknown>;
};

type CharacterListProps = {
  characters: Character[];
  /** When provided, each row is clickable (e.g. select-to-enter). */
  onSelect?: (character: Character) => void;
  editorPageHref?: (character: Character) => string;
  profilePageHref?: (character: Character) => string;
};

/**
 * A table of characters. Shared by the Lobby (your own characters, selectable)
 * and Residents (all characters, browse-only).
 */
export default function CharacterList({ characters, onSelect, editorPageHref, profilePageHref }: CharacterListProps) {
  const { t } = useTranslation();

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{t('characterList.colName')}</th>
          <th>{t('characterList.colRace')}</th>
          <th>{t('characterList.colSpec')}</th>
          <th>{t('characterList.colGender')}</th>
          {(profilePageHref || editorPageHref) && <th>Aktionen</th>}
        </tr>
      </thead>
      <tbody>
        {characters.map((c) => (
          <tr
            key={c.id}
            className={onSelect ? styles.clickable : undefined}
            onClick={onSelect ? () => onSelect(c) : undefined}
            title={onSelect ? t('characterList.playAs') : undefined}
          >
            <td>{c.name}</td>
            <td>{c.race}</td>
            <td>{c.spec}</td>
            <td>{c.gender}</td>
            {(profilePageHref || editorPageHref) && (
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
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
