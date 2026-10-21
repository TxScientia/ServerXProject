import { useEffect, useRef, useState } from 'react';
import { deleteImage, imageSrc, uploadImage } from '../../images';
import styles from './ImageUpload.module.css';

type Props = {
  value?: string | null;
  onChange: (url: string) => void;
  label: string;
  /** Opt in only for fields explicitly intended to retain previous uploads. */
  retainPrevious?: boolean;
};

export default function ImageUpload({ value, onChange, label, retainPrevious = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const latestChange = useRef(onChange);
  latestChange.current = onChange;
  useEffect(() => () => controller.current?.abort(), []);
  const src = imageSrc(value);

  const selectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError('');
    try {
      const url = await uploadImage(file, request.signal, retainPrevious ? undefined : value);
      if (!request.signal.aborted) latestChange.current(url);
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Upload fehlgeschlagen.');
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  };

  const removeImage = async () => {
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError('');
    try {
      if (!retainPrevious) await deleteImage(value, request.signal);
      if (!request.signal.aborted) latestChange.current('');
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Löschen fehlgeschlagen.');
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  };

  return (
    <div className={styles.upload}>
      <label>
        <span>{label}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} disabled={busy} />
      </label>
      <small>JPEG, PNG oder WebP · max. 10 MiB · lokal gespeichert, auf max. 2048 px optimiert. Keine Animationen.</small>
      {src && <img className={styles.preview} src={src} alt={`${label} – Vorschau`} referrerPolicy="no-referrer" />}
      {value && !src && <small>Externes Bild blockiert. Bitte erneut hochladen.</small>}
      {!retainPrevious && <small>Ein Bild pro Feld. Ersetzen oder Entfernen löscht das bisherige Bild sofort und endgültig – auch ohne Speichern des Formulars.</small>}
      {value && <button type="button" disabled={busy} onClick={removeImage}>{retainPrevious ? 'Bild aus diesem Feld entfernen' : 'Bild endgültig löschen'}</button>}
      {busy && <small role="status">Bild wird verarbeitet…</small>}
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
