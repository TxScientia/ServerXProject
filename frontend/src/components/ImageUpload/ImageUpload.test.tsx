import { fireEvent, render, screen, waitFor } from '../../test-utils';
import ImageUpload from './index';
import { imageSrc, uploadImage, MAX_IMAGE_BYTES } from '../../images';

const url = `/api/images/${'a'.repeat(32)}.webp`;

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('only canonical self-hosted image references can render', () => {
  expect(imageSrc(url)).toBe(url);
  for (const unsafe of ['https://tracker.example/image.png', '//tracker.example/image.png',
    'data:image/png,anything', '/pictures/user-image.png', `${url}?redirect=evil`, 'javascript:alert(1)']) {
    expect(imageSrc(unsafe)).toBeUndefined();
  }
  const { container } = render(<ImageUpload label="Portrait" value="https://tracker.example/image.png" onChange={() => {}} />);
  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByText(/Externes Bild blockiert/)).toBeInTheDocument();
});

test('uploads file bytes with authentication and stores only the returned reference', async () => {
  localStorage.setItem('token', 'my-token');
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url }) });
  vi.stubGlobal('fetch', fetchMock);
  const change = vi.fn();
  render(<ImageUpload label="Portrait" value="" onChange={change} />);
  const file = new File(['pixels'], 'portrait.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Portrait'), { target: { files: [file] } });
  await waitFor(() => expect(change).toHaveBeenCalledWith(url));
  expect(fetchMock).toHaveBeenCalledWith('/api/images', expect.objectContaining({
    method: 'POST', body: file,
    headers: { Authorization: 'Bearer my-token', 'Content-Type': 'application/octet-stream' },
  }));
});

test('shows validation errors without changing the existing image', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: 'Ungültiges Bild' }) }));
  const change = vi.fn();
  render(<ImageUpload label="Portrait" value={url} onChange={change} />);
  fireEvent.change(screen.getByLabelText('Portrait'), { target: { files: [new File(['bad'], 'image.png')] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Ungültiges Bild');
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByRole('img')).toHaveAttribute('src', url);
});

test('removing an image permanently deletes it before clearing the field', async () => {
  const change = vi.fn();
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
  vi.stubGlobal('fetch', fetchMock);
  render(<ImageUpload label="Portrait" value={url} onChange={change} />);
  fireEvent.click(screen.getByText('Bild endgültig löschen'));
  await waitFor(() => expect(change).toHaveBeenCalledWith(''));
  expect(fetchMock).toHaveBeenCalledWith(`/api/images/${'a'.repeat(32)}`, expect.objectContaining({ method: 'DELETE' }));
});

test('replacement tells the backend which image to permanently delete', async () => {
  const replacement = `/api/images/${'b'.repeat(32)}.webp`;
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: replacement }) });
  vi.stubGlobal('fetch', fetchMock);
  const change = vi.fn();
  render(<ImageUpload label="Portrait" value={url} onChange={change} />);
  fireEvent.change(screen.getByLabelText('Portrait'), { target: { files: [new File(['pixels'], 'new.png')] } });
  await waitFor(() => expect(change).toHaveBeenCalledWith(replacement));
  expect(fetchMock).toHaveBeenCalledWith(`/api/images?replace=${'a'.repeat(32)}`, expect.objectContaining({ method: 'POST' }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('failed deletion does not clear the existing field', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
  const change = vi.fn();
  render(<ImageUpload label="Portrait" value={url} onChange={change} />);
  fireEvent.click(screen.getByText('Bild endgültig löschen'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Bild konnte nicht gelöscht werden.');
  expect(change).not.toHaveBeenCalled();
});

test('retention requires an explicit opt-in', async () => {
  const change = vi.fn();
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  render(<ImageUpload label="Portrait" value={url} onChange={change} retainPrevious />);
  fireEvent.click(screen.getByText('Bild aus diesem Feld entfernen'));
  await waitFor(() => expect(change).toHaveBeenCalledWith(''));
  expect(fetchMock).not.toHaveBeenCalled();
});

test('rejects oversized files before starting a network request', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const file = new File(['x'], 'too-large.png');
  Object.defineProperty(file, 'size', { value: MAX_IMAGE_BYTES + 1 });
  await expect(uploadImage(file)).rejects.toThrow('10 MiB');
  expect(fetchMock).not.toHaveBeenCalled();
});
