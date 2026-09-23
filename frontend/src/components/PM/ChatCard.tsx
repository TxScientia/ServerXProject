import Card from '../Card';
import styles from './ChatCard.module.css';

interface ChatCardProps {
  displayName: string;
  memberCount: number;
  unreadCount: number;
  onClick: () => void;
}

export default function ChatCard({
  displayName,
  memberCount,
  unreadCount,
  onClick,
}: ChatCardProps) {
  return (
    <Card onClick={onClick} className={styles.chatCard}>
      <div className={styles.cardContent}>
        <div className={styles.cardLeft}>
          <div className={styles.chatName}>{displayName}</div>
          <div className={styles.memberCount}>{memberCount} Mitglieder</div>
        </div>
        {unreadCount > 0 && (
          <div className={styles.unreadBadge}>{unreadCount}</div>
        )}
      </div>
    </Card>
  );
}
