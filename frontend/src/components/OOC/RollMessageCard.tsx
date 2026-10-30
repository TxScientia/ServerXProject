import { parseServerDate } from '../../utils/datetime';
import type { RollBody } from './types';
import styles from './OOC.module.css';

/** Renders a server-computed command result (dice / Magic Conch) distinctly from
 * normal chat text. The result is authoritative and cannot be edited. */
export default function RollMessageCard({
  body,
  createdAt,
}: {
  body: RollBody;
  createdAt: string;
}) {
  const text = typeof body?.text === 'string' ? body.text : '';
  const timestamp = parseServerDate(createdAt).toLocaleString();

  return (
    <article className={styles.roll} data-kind={body?.kind}>
      <span className={styles.rollText}>{text}</span>
      <time className={styles.rollTime} dateTime={createdAt}>
        {timestamp}
      </time>
    </article>
  );
}
