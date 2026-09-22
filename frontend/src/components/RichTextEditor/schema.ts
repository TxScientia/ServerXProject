/**
 * Single source of truth for the rich-text format used across the app (RP posts,
 * later also world biography + place descriptions).
 *
 * Safety by construction: we store Tiptap's JSON document, never HTML. The editor
 * and the read-only renderer both use THIS extension list, so the only formatting
 * that can ever exist is bold / italic / underline / strike / colour, inside
 * paragraphs. Headings, lists, links, images, code — and therefore any HTML tag
 * or script — are impossible; there is no node/mark that can express them. The
 * backend validates stored JSON against the same whitelist.
 */
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import type { JSONContent } from '@tiptap/core';

/** A Tiptap/ProseMirror JSON document — the value we store and render. */
export type RichTextDoc = JSONContent;

/**
 * The allowed nodes and marks. Keep this the ONLY place extensions are declared;
 * the editor and renderer must never drift apart.
 *
 * Kept from StarterKit: document, paragraph, text, bold, italic, strike,
 * underline, hardBreak, undoRedo (undo/redo), dropcursor, gapcursor, trailingNode.
 * Everything below is switched off on purpose.
 */
export const richTextExtensions = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    link: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
  }),
  TextStyle,
  Color,
];

/** An empty document (one blank paragraph) — the value for a fresh editor. */
export const EMPTY_DOC: RichTextDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

/** True if the document contains no visible text (only blank paragraphs). */
export function isEmptyDoc(doc: RichTextDoc | null | undefined): boolean {
  if (!doc) return true;
  return !nodeHasText(doc);
}

function nodeHasText(node: JSONContent): boolean {
  if (typeof node.text === 'string' && node.text.trim().length > 0) return true;
  return (node.content ?? []).some(nodeHasText);
}

/** Total length of the visible text in a document (for the length-cap guard). */
export function docTextLength(doc: RichTextDoc | null | undefined): number {
  if (!doc) return 0;
  let total = 0;
  const walk = (node: JSONContent) => {
    if (typeof node.text === 'string') total += node.text.length;
    (node.content ?? []).forEach(walk);
  };
  walk(doc);
  return total;
}
