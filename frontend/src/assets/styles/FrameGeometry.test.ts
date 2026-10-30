import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('retains corner geometry and straight-line weight, thinning only curved strokes', () => {
  const palette = source('./CharacterPalette.module.css');
  expect(palette).toContain('--character-frame-corner: 16px');
  expect(palette).toContain('--character-frame-width: 1px');
  expect(palette).toContain('--character-frame-corner-width: 0.5px');
});

for (const path of ['./ResidentFrame.module.css', '../../pages/Lobby/Lobby.module.css', '../../components/WantedAds/WantedAds.module.css']) {
  test(`${path} keeps straight and curved stroke widths independent`, () => {
    const css = source(path);
    const straightLines = css.split('\n').filter((line) => line.includes('linear-gradient('));
    const corners = css.split('\n').filter((line) => line.includes('radial-gradient(')
      && (line.includes('var(--line)') || line.includes('var(--frame-color)')));
    expect(straightLines.length).toBeGreaterThanOrEqual(4);
    expect(corners.length).toBe(4);
    straightLines.forEach((line) => expect(line).toContain('--character-frame-width'));
    corners.forEach((line) => {
      expect(line).toContain('--character-frame-corner-width');
      expect(line).not.toContain('var(--character-frame-width,');
    });
  });
}
