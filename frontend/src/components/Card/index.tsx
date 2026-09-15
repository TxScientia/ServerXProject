import { ReactNode } from 'react';
import styles from './Card.module.css';

type CardProps = {
  children: ReactNode;
  /** When provided, the card renders as a clickable button with hover feedback. */
  onClick?: () => void;
  /** Extra class(es) for a specific card type to extend the base look. */
  className?: string;
};

/**
 * Base card shell — shared size, color theme, border and hover for all card types
 * (PlotCard, EventCard, GesuchCard, …). Specific cards supply only their content.
 */
export default function Card({ children, onClick, className }: CardProps) {
  const classes = [styles.card, className].filter(Boolean).join(' ');

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {children}
      </button>
    );
  }
  return <div className={classes}>{children}</div>;
}
