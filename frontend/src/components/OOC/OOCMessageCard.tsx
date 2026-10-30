import { RichText, type RichTextDoc } from '../RichTextEditor';
import type { OOCMessage, RollBody } from './types';
import RollMessageCard from './RollMessageCard';
import { parseServerDate } from '../../utils/datetime';
import styles from './OOC.module.css';

export default function OOCMessageCard({ message }: { message: OOCMessage }) {
  // Server-computed command results (dice / conch) render as a distinct, uneditable line.
  if (message.kind === 'roll') {
    return <RollMessageCard body={message.body as RollBody} createdAt={message.created_at} />;
  }

  const author = message.author_name ?? '???';
  const timestamp = parseServerDate(message.created_at).toLocaleString();

  return (
    <article className={styles.message}>
      <header className={styles.byline}>
        <span className={styles.avatar} aria-hidden="true">{author.charAt(0).toUpperCase()}</span>
        <span className={styles.author}>{author}</span>
        <time className={styles.time} dateTime={message.created_at}>{timestamp}</time>
      </header>
      <RichText value={message.body as RichTextDoc} />
    </article>
  );
}
