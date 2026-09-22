/**
 * Read-only renderer: turns a stored RichTextDoc (Tiptap JSON) into formatted,
 * non-editable text. This is what a saved post shows in the thread — no toolbar,
 * no editing. Displaying many posts this way is cheap (no editor instance each).
 *
 * Safe by construction: generateHTML uses the same whitelist as the editor
 * (richTextExtensions), so the output can only ever contain the marks we allow —
 * there is no path for user-authored HTML/scripts to appear here.
 */
import { useMemo } from 'react';
import { generateHTML } from '@tiptap/core';
import { richTextExtensions, isEmptyDoc, type RichTextDoc } from './schema';
import styles from './RichTextEditor.module.css';

type Props = {
  value: RichTextDoc | null | undefined;
  className?: string;
};

export default function RichText({ value, className }: Props) {
  const html = useMemo(
    () => (value && !isEmptyDoc(value) ? generateHTML(value, richTextExtensions) : ''),
    [value],
  );

  if (!html) return null;

  const cls = className ? `${styles.content} ${className}` : styles.content;
  return <div className={cls} dangerouslySetInnerHTML={{ __html: html }} />;
}
