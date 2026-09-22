import { render, screen } from '../../test-utils';
import RichTextEditor, { RichText } from './index';
import { EMPTY_DOC, isEmptyDoc, docTextLength, type RichTextDoc } from './schema';

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
  test('renders the formatting toolbar (German default labels)', async () => {
    render(<RichTextEditor value={null} onChange={() => {}} />);
    // Editor mounts after an effect (immediatelyRender: false), so await it.
    expect(await screen.findByLabelText('Fett')).toBeInTheDocument();
    expect(screen.getByLabelText('Kursiv')).toBeInTheDocument();
    expect(screen.getByLabelText('Unterstrichen')).toBeInTheDocument();
    expect(screen.getByLabelText('Durchgestrichen')).toBeInTheDocument();
    expect(screen.getByLabelText('Textfarbe')).toBeInTheDocument();
    expect(screen.getByLabelText('Farbe entfernen')).toBeInTheDocument();
  });
});
