import styles from './Badge.module.css';

interface BadgeProps {
  count: number;
  /** Position variant for the badge */
  variant?: 'tab' | 'nav';
}

/**
 * Circular badge with count number.
 * Used for displaying unread message counts.
 */
export default function Badge({ count, variant = 'tab' }: BadgeProps) {
  if (count <= 0) return null;

  return <span className={`${styles.badge} ${styles[variant]}`}>{count}</span>;
}
