import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('shared page headings have a consistent size and a longer responsive underline', () => {
  const css = source('./CharacterPalette.module.css');
  const heading = css.split(':global(:root) .palette h1 {')[1].split('}')[0];
  expect(heading).toContain('font-size: 2rem;');
  expect(heading).toContain('text-transform: uppercase;');
  expect(heading).toContain('width: min(100%, 40rem);');
  expect(heading).toContain('box-sizing: border-box;');
  expect(heading).toContain('overflow-wrap: anywhere;');
  expect(heading).toContain('border-bottom: 1px solid var(--design-text);');
});

test('subtitles stay four pixels below the underline without added heading margin or flex gap', () => {
  const css = source('./CharacterPalette.module.css');
  const heading = css.split('.palette h1:has(+ p) {')[1].split('}')[0];
  const subtitle = css.split('.palette h1 + p {')[1].split('}')[0];
  expect(heading).toContain('margin-bottom: 0;');
  expect(subtitle).toContain('margin: 4px 0 0;');
  expect(subtitle).toContain('font-size: 0.875rem;');
  const header = source('../../pages/Gesuche/Gesuche.module.css').split('.header {')[1].split('}')[0];
  expect(header).toContain('gap: 0;');
});

test('subtitle typography matches across pages, including Storybooks and Gesuche', () => {
  const subtitle = source('./CharacterPalette.module.css').split('.palette h1 + p {')[1].split('}')[0];
  expect(subtitle).toContain("font-family: Calibri, 'Segoe UI', Arial, sans-serif;");
  expect(subtitle).toContain('font-size: 0.875rem;');
  expect(subtitle).toContain('font-weight: 400;');
  expect(subtitle).toContain('line-height: 1.5;');
  expect(subtitle).toContain('letter-spacing: normal;');
  expect(subtitle).toContain('text-transform: uppercase;');
  expect(source('../../pages/StoryBooks/StoryBooks.module.css')).not.toContain('.subtitle, .metadata');
});

for (const page of ['Gesuche', 'StoryBooks', 'News', 'Admin', 'StoryBookNews', 'StoryBookGesuche']) {
  test(`${page} uses the same heading component rather than local heading markup`, () => {
    const pageSource = source(`../../pages/${page}/index.tsx`);
    expect(pageSource).toContain('<PageHeading title=');
    expect(pageSource).not.toContain('<h1');
  });
}

test('Storybooks has no extra top offset and the shared heading has no padding or flex gap', () => {
  const header = source('../../pages/StoryBooks/StoryBooks.module.css').split('.header {')[1].split('}')[0];
  expect(header).toContain('padding: 0 0 32px;');
  const shared = source('../../components/PageHeading/PageHeading.module.css');
  expect(shared).toContain('padding: 0;');
  expect(shared).toContain('gap: 0;');
  expect(shared).toContain('width: 100%;');
});
