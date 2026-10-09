/**
 * Parse a timestamp string returned by the backend into a Date.
 *
 * Backend timestamps are UTC, but on some databases (e.g. SQLite) they are serialized
 * without a timezone designator (e.g. "2026-09-29T12:34:56"). The JS Date parser treats
 * such strings as LOCAL time, which shifts the displayed time by the browser's offset.
 * We append 'Z' when no timezone is present so the value is read as UTC; callers then
 * format to local as usual. Strings that already carry a tz (Z or ±hh:mm) are trusted.
 */
export function parseServerDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const s = value;
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  const looksDateTime = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s);
  if (hasTz || !looksDateTime) return new Date(s);
  return new Date(`${s.replace(' ', 'T')}Z`);
}
