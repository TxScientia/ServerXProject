import styles from './CharacterList.module.css';

export type Character = {
  id: string;
  name: string;
  race: string;
  spec: string;
  gender: string;
};

type CharacterListProps = {
  characters: Character[];
  /** When provided, each row is clickable (e.g. select-to-enter). */
  onSelect?: (character: Character) => void;
};

/**
 * A table of characters. Shared by the Lobby (your own characters, selectable)
 * and Residents (all characters, browse-only).
 */
export default function CharacterList({ characters, onSelect }: CharacterListProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Charaktername</th>
          <th>Rasse</th>
          <th>Spezifikation</th>
          <th>Geschlecht</th>
        </tr>
      </thead>
      <tbody>
        {characters.map((c) => (
          <tr
            key={c.id}
            className={onSelect ? styles.clickable : undefined}
            onClick={onSelect ? () => onSelect(c) : undefined}
            title={onSelect ? 'Als diesen Charakter spielen' : undefined}
          >
            <td>{c.name}</td>
            <td>{c.race}</td>
            <td>{c.spec}</td>
            <td>{c.gender}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
