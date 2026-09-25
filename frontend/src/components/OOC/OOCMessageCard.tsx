import { RichText } from '../RichTextEditor';
import type { OOCMessage } from './types';
import styles from './OOC.module.css';

export default function OOCMessageCard({ message }: { message: OOCMessage }) {
  const author = message.author_name ?? '???';
  const timestamp = new Date(message.created_at).toLocaleString();

  return (
    <article className={styles.message}>
      <header className={styles.byline}>
        <span className={styles.avatar} aria-hidden="true">{author.charAt(0).toUpperCase()}</span>
        <span className={styles.author}>{author}</span>
        <time className={styles.time} dateTime={message.created_at}>{timestamp}</time>
      </header>
      <RichText value={message.body} />
    </article>
  );
}
