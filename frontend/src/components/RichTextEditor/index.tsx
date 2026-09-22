/**
 * RichTextEditor — the shared WYSIWYG editor (Tiptap) used to write RP posts, and
 * later the world biography + place descriptions. Body only: it has no title field
 * (the post composer adds that around it). Controlled via `value`/`onChange`, both
 * speaking RichTextDoc (JSON) — never HTML.
 *
 * The matching read-only display is `RichText` (see ./RichText). Both share the
 * same whitelist in ./schema so they can never drift apart.
 */
import { useEffect, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import { Placeholder } from '@tiptap/extensions';
import { richTextExtensions, EMPTY_DOC, type RichTextDoc } from './schema';
import RichText from './RichText';
import styles from './RichTextEditor.module.css';

export { RichText };
export * from './schema';

const DEFAULT_COLOR = '#eeeeee'; // matches --color-text; the color-input's fallback

type Props = {
  value: RichTextDoc | null;
  onChange: (value: RichTextDoc) => void;
  placeholder?: string; // already translated by the caller
  disabled?: boolean;
  autoFocus?: boolean;
  minRows?: number;
  'aria-label'?: string;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  autoFocus = false,
  minRows = 5,
  'aria-label': ariaLabel,
}: Props) {
  const { t } = useTranslation();

  // Keep onChange fresh without recreating the editor.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Re-render the toolbar on every editor transaction so active-state highlights
  // and the current colour stay in sync with the selection.
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const editor = useEditor({
    extensions: [...richTextExtensions, Placeholder.configure({ placeholder: placeholder ?? '' })],
    content: value ?? EMPTY_DOC,
    editable: !disabled,
    autofocus: autoFocus ? 'end' : false,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChangeRef.current(editor.getJSON()),
  });

  useEffect(() => {
    if (!editor) return;
    editor.on('transaction', rerender);
    return () => {
      editor.off('transaction', rerender);
    };
  }, [editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  // Sync external value changes (e.g. pre-filling when editing a post, or resetting
  // to empty after submit). Guarded so typing doesn't reset the cursor.
  useEffect(() => {
    if (!editor) return;
    const next = value ?? EMPTY_DOC;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(next)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const currentColor = (editor.getAttributes('textStyle').color as string) || DEFAULT_COLOR;

  const markBtn = (
    label: string,
    isActive: boolean,
    onClick: () => void,
    text: string,
    extraClass?: string,
  ) => (
    <button
      type="button"
      className={`${styles.toolBtn} ${isActive ? styles.toolBtnActive : ''} ${extraClass ?? ''}`.trim()}
      aria-label={label}
      aria-pressed={isActive}
      title={label}
      // onMouseDown + preventDefault keeps the editor selection while clicking.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar} role="toolbar" aria-label={t('editor.toolbar')}>
        {markBtn(t('editor.bold'), editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'B', styles.bold)}
        {markBtn(t('editor.italic'), editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'I', styles.italic)}
        {markBtn(t('editor.underline'), editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'U', styles.underline)}
        {markBtn(t('editor.strike'), editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'S', styles.strike)}
        <label className={styles.colorBtn} title={t('editor.color')} aria-label={t('editor.color')}>
          <span className={styles.colorSwatch} style={{ background: currentColor }} aria-hidden="true" />
          <input
            type="color"
            className={styles.colorInput}
            value={currentColor}
            disabled={disabled}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>
        <button
          type="button"
          className={styles.toolBtn}
          title={t('editor.clearColor')}
          aria-label={t('editor.clearColor')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().unsetColor().run()}
          disabled={disabled}
        >
          ⨯
        </button>
      </div>
      <EditorContent
        editor={editor}
        className={styles.content}
        style={{ minHeight: `${minRows * 1.6}rem` }}
        aria-label={ariaLabel}
      />
    </div>
  );
}
