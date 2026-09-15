// jest-dom adds custom matchers for asserting on DOM nodes (works with Vitest's expect).
// e.g. expect(element).toHaveTextContent(/react/i)
import '@testing-library/jest-dom';

// jsdom under Vitest doesn't reliably expose localStorage as a global — provide a
// simple in-memory implementation so components using localStorage work in tests.
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}
