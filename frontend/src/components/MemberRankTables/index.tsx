import { useTranslation } from 'react-i18next';
import styles from './MemberRankTables.module.css';

export type RankedMember = {
  character_id: string;
  name: string;
  role: string;
  rank_id: string | null;
  rank_name: string | null;
  rank_weight: number | null;
};

export type MemberRank = {
  id: string;
  name: string;
  weight: number;
  created_at?: string;
};

type Props = {
  members: RankedMember[];
  ranks?: MemberRank[];
  emptyText?: string;
};

type Group = {
  key: string;
  title: string;
  weight: number;
  members: RankedMember[];
};

export default function MemberRankTables({ members, ranks = [], emptyText }: Props) {
  const { t } = useTranslation();
  if (members.length === 0 && ranks.length === 0) return <p className={styles.muted}>{emptyText ?? t('members.empty')}</p>;

  const byRank = new Map<string, Group>();
  for (const rank of ranks) {
    byRank.set(rank.id, { key: rank.id, title: rank.name, weight: rank.weight, members: [] });
  }
  const unranked: RankedMember[] = [];
  for (const member of members) {
    if (!member.rank_id) {
      unranked.push(member);
      continue;
    }
    const key = member.rank_id;
    if (!byRank.has(key)) {
      byRank.set(key, {
        key,
        title: member.rank_name ?? t('members.unknownRank'),
        weight: member.rank_weight ?? Number.MAX_SAFE_INTEGER - 1,
        members: [],
      });
    }
    byRank.get(key)!.members.push(member);
  }

  const groups = [...byRank.values()].sort((a, b) => a.weight - b.weight || a.title.localeCompare(b.title));
  if (unranked.length > 0) {
    groups.push({ key: 'unranked', title: t('members.unranked'), weight: Number.MAX_SAFE_INTEGER, members: unranked });
  }

  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className={styles.groupTitle}>{group.title}</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('members.character')}</th>
                <th>{t('members.role')}</th>
              </tr>
            </thead>
            <tbody>
              {group.members.length === 0 ? (
                <tr>
                  <td colSpan={2} className={styles.muted}>{t('members.noMembersForRank')}</td>
                </tr>
              ) : (
                [...group.members].sort((a, b) => a.name.localeCompare(b.name)).map((member) => (
                  <tr key={member.character_id}>
                    <td>{member.name}</td>
                    <td><span className={styles.role}>{member.role}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
