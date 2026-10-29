import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

const globalCss = source('./global.css');
const paletteCss = source('./CharacterPalette.module.css');
const backgroundCss = source('./PageBackground.module.css');
const appCss = source('../../pageLayouts/appLayout/AppLayout.module.css');

test('dark backgrounds are dimmed, including the inverted palette background', () => {
  const dark = globalCss.split(":root[data-theme='light']")[0];
  expect(dark).toContain('--page-background-filter: brightness(0.35)');
  const darkPalette = paletteCss.split(":global(:root[data-theme='dark']) .palette {")[1].split('}')[0];
  expect(darkPalette).toContain('--page-background-filter: invert(1) brightness(0.35)');
});

test('dark palette retains its original surfaces and foreground colors', () => {
  const darkPalette = paletteCss.split(":global(:root[data-theme='dark']) .palette {")[1].split('}')[0];
  expect(darkPalette).toContain('--design-inner: #383939');
  expect(darkPalette).toContain('--design-outer: #454949');
  expect(darkPalette).toContain('--design-row-even: #3d3f3f');
  expect(darkPalette).toContain('--design-text: #acacac');
  expect(darkPalette).not.toContain('--design-accent-surface');
  expect(darkPalette).not.toMatch(/\n\s+filter:/);
});

test('light and parchment themes reset the background filter', () => {
  const light = globalCss.split(":root[data-theme='parchment'] {")[1].split('}')[0];
  expect(light).toContain('--page-background-filter: none');
});

test('the filter applies to background pseudo-elements, including the scroll gap', () => {
  const image = backgroundCss.split('.background::after {')[1].split('}')[0];
  const gap = appCss.split('.shell.pageScroll::before {')[1].split('}')[0];
  for (const layer of [image, gap]) {
    expect(layer).toContain('filter: var(--page-background-filter, none)');
    expect(layer).toContain('pointer-events: none');
  }
  expect(backgroundCss.split('.background {')[1].split('}')[0]).not.toContain('filter:');
});
