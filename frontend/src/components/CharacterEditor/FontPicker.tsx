import { useEffect, useState } from 'react';
import { LibraryFont, listFonts, loadFont } from '../../fonts';

export default function FontPicker({ value, onChange }: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [fonts, setFonts] = useState<LibraryFont[]>([]);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    let active = true;
    listFonts().then((items) => { if (active) setFonts(items); })
      .catch(() => { if (active) setStatus('Schriftbibliothek nicht erreichbar.'); });
    return () => { active = false; };
  }, []);

  const retrieve = async () => {
    if (!value.trim()) { setPreview(''); setStatus(''); return; }
    setStatus('Schrift wird geladen…');
    try {
      await loadFont(value);
      setPreview(value.trim());
      setStatus('Schrift lokal verfügbar.');
      setFonts(await listFonts());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Schrift konnte nicht geladen werden.');
    }
  };

  return (
    <div>
      <label>
        <span>Schrift für den Charakternamen</span>
        <small>Aus der Bibliothek wählen oder einen Google-Fonts-Namen eingeben. Neue Schriften werden auf unserem Server gespeichert. Leer = Standardschrift.</small>
        <input name="nameFontFamily" list="character-font-library" placeholder="z.B. Cinzel" value={value} onChange={onChange} maxLength={100} />
        <datalist id="character-font-library">
          {fonts.map((font) => <option key={font.family} value={font.family}>{font.cached ? 'Lokal verfügbar' : 'Starter-Schrift'}</option>)}
        </datalist>
      </label>
      <button type="button" onClick={retrieve}>Schrift laden / Vorschau</button>
      <small role="status">{status}</small>
      {preview && <p style={{ fontFamily: `${JSON.stringify(preview)}, serif`, fontSize: '1.5rem' }}>{preview} — Aa Bb Cc Äöü ß</p>}
    </div>
  );
}
