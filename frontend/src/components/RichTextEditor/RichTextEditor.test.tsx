import { fireEvent, render, screen, waitFor } from '../../test-utils';
import RichTextEditor, { RichText } from './index';
import { EMPTY_DOC, isEmptyDoc, docTextLength, type RichTextDoc } from './schema';

// jsdom has no range layout; ProseMirror needs it when toolbar focus scrolls.
beforeAll(() => {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: () => [],
  });
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => new DOMRect(),
  });
});

afterAll(() => {
  Reflect.deleteProperty(Range.prototype, 'getClientRects');
  Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
});

const boldDoc: RichTextDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Hallo' }] }],
};

const colorDoc: RichTextDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', marks: [{ type: 'textStyle', attrs: { color: '#ff0000' } }], text: 'Rot' }],
    },
  ],
};

function listDoc(type: 'bulletList' | 'orderedList'): RichTextDoc {
  return {
    type: 'doc',
    content: [{
      type,
      ...(type === 'orderedList' ? { attrs: { start: 3 } } : {}),
      content: [{ type: 'listItem', content: boldDoc.content }],
    }],
  };
}

describe('schema helpers', () => {
  test('isEmptyDoc is true for the empty doc and false with text', () => {
    expect(isEmptyDoc(EMPTY_DOC)).toBe(true);
    expect(isEmptyDoc(null)).toBe(true);
    expect(isEmptyDoc(boldDoc)).toBe(false);
  });

  test('docTextLength counts visible characters only', () => {
    expect(docTextLength(EMPTY_DOC)).toBe(0);
    expect(docTextLength(boldDoc)).toBe(5);
  });
});

describe('RichText (read-only renderer)', () => {
  test.each(['bulletList', 'orderedList'] as const)('renders saved %s content', (type) => {
    const doc = listDoc(type);
    const { container } = render(<RichText value={doc} />);
    expect(container.querySelector(type === 'bulletList' ? 'ul > li strong' : 'ol > li strong')).toHaveTextContent('Hallo');
    if (type === 'orderedList') expect(container.querySelector('ol')).toHaveAttribute('start', '3');
    expect(docTextLength(doc)).toBe(5);
    expect(isEmptyDoc(doc)).toBe(false);
  });

  test('renders bold text as a <strong> element', () => {
    render(<RichText value={boldDoc} />);
    expect(screen.getByText('Hallo').tagName).toBe('STRONG');
  });

  test('applies colour from the textStyle mark', () => {
    render(<RichText value={colorDoc} />);
    const span = screen.getByText('Rot');
    expect(span).toHaveStyle({ color: '#ff0000' });
  });

  test('renders nothing for an empty document', () => {
    const { container } = render(<RichText value={EMPTY_DOC} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('RichTextEditor', () => {
  test.each([
    ['Aufzählung', 'bulletList'],
    ['Nummerierte Liste', 'orderedList'],
  ])('toggles %s and emits list JSON', async (label, type) => {
    const onChange = vi.fn();
    render(<RichTextEditor value={boldDoc} onChange={onChange} />);
    const button = await screen.findByRole('button', { name: label });
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
    expect(onChange.mock.lastCall?.[0].content[0]).toMatchObject({
      type, content: [{ type: 'listItem', content: boldDoc.content }],
    });
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    expect(onChange.mock.lastCall?.[0].content[0].type).toBe('paragraph');
  });

  test('list controls are disabled when the editor is disabled', async () => {
    render(<RichTextEditor value={null} onChange={() => {}} disabled />);
    expect(await screen.findByRole('button', { name: 'Aufzählung' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nummerierte Liste' })).toBeDisabled();
  });

  test('renders the formatting toolbar (German default labels)', async () => {
    render(<RichTextEditor value={null} onChange={() => {}} />);
    // Editor mounts after an effect (immediatelyRender: false), so await it.
    expect(await screen.findByLabelText('Fett')).toBeInTheDocument();
    expect(screen.getByLabelText('Kursiv')).toBeInTheDocument();
    expect(screen.getByLabelText('Unterstrichen')).toBeInTheDocument();
    expect(screen.getByLabelText('Durchgestrichen')).toBeInTheDocument();
    expect(screen.getByLabelText('Textfarbe')).toBeInTheDocument();
    expect(screen.getByLabelText('Farbe entfernen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aufzählung' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nummerierte Liste' })).toBeInTheDocument();
  });
});
