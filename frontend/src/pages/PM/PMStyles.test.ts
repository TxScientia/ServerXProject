import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import en from '../../locales/en.json';
import de from '../../locales/de.json';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('PM uses the shared quote heading with the Byron subtitle in both languages', () => {
  const quote = '“LETTER WRITING IS THE ONLY DEVICE COMBINING SOLITUDE WITH GOOD COMPANY” — LORD BYRON';
  expect(en.pm.pageSubtitle).toBe(quote);
  expect(de.pm.pageSubtitle).toBe(quote);
  expect(source('./index.tsx')).toContain("<PageHeading title={t('pm.pageTitle')} subtitle={t('pm.pageSubtitle')} />");
});

test('new chat uses the standard button and requested label', () => {
  const page = source('./index.tsx');
  expect(page).toContain('className={`button ${styles.newChatBtn}`}');
  expect(page).toContain('NEUER CHAT');
  expect(page).not.toContain('+ Neuer Chat');
  const button = source('./PM.module.css').split('.newChatBtn {')[1].split('}')[0];
  expect(button).toContain('border-radius: 0;');
  expect(button).toContain('background: var(--color-button-bg);');
  expect(button).toContain('color: var(--color-button-text);');
  expect(button).not.toContain('linear-gradient');
});

test('new chat sits below the heading in the same action row as Gesuche', () => {
  const page = source('./index.tsx');
  expect(page).toContain('<div className={styles.actions}>');
  const css = source('./PM.module.css');
  const header = css.split('.header {')[1].split('}')[0];
  expect(header).toContain('flex-direction: column;');
  const actions = css.split('.actions {')[1].split('}')[0];
  const gesucheActions = source('../Gesuche/Gesuche.module.css').split('.actions {')[1].split('}')[0];
  expect(actions.trim()).toBe(gesucheActions.trim());
});

test('chat cards and unread indicators are square with button highlight colors', () => {
  const css = source('../../components/PM/ChatCard.module.css');
  expect(css.split('.chatCard {')[1].split('}')[0]).toContain('border-radius: 0;');
  const badge = css.split('.unreadBadge {')[1].split('}')[0];
  expect(badge).toContain('border-radius: 0;');
  expect(badge).toContain('background: var(--color-button-bg);');
  expect(badge).toContain('color: var(--color-button-text);');
  expect(css).not.toContain('var(--accent-color)');
});

test('new chat keeps a viewport-safe height and reserves empty search-result space', () => {
  const css = source('../../components/PM/CreateChatModal.module.css');
  const modal = css.split('.createChatModal {')[1].split('}')[0];
  expect(modal).toContain('height: min(44rem, calc(100dvh - 2 * var(--space-4)));');
  expect(modal).toContain('box-sizing: border-box;');
  expect(modal).toContain('overflow-y: auto;');
  const list = css.split('.createChatModal .characterList {')[1].split('}')[0];
  expect(list).toContain('flex: 1 1 0;');
  expect(list).toContain('min-height: 6rem;');
  expect(list).toContain('overflow-y: auto;');
  expect(css.split('.recipientField {')[1].split('}')[0]).toContain('max-height: 8rem;');
  expect(source('../../components/PM/CreateChatModal.tsx')).toContain('className={styles.createChatModal}');
});

test('recipient hover has a highlight line without shifting names', () => {
  const css = source('../../components/PM/CreateChatModal.module.css');
  const item = css.split('.charItem {')[1].split('}')[0];
  expect(item).toContain('border-left: 4px solid transparent;');
  expect(item).toContain('padding-left: 12px;');
  const hover = css.split('.charItem:focus-visible {')[1].split('}')[0];
  expect(hover).toContain('border-left-color: var(--color-accent);');
});

test('new chat dialog, controls and results have square corners', () => {
  const css = source('../../components/PM/CreateChatModal.module.css');
  for (const selector of ['.createChatModal', '.createChatModal :global(.button)', '.creatorSelect', '.recipientField', '.chip', '.groupNameInput', '.createChatModal .characterList']) {
    expect(css.split(`${selector} {`)[1].split('}')[0]).toContain('border-radius: 0;');
  }
  expect(css).not.toMatch(/border-radius:\s*[1-9]/);
});

test('chat name has the same visible input border and focus highlight as recipients', () => {
  const css = source('../../components/PM/CreateChatModal.module.css');
  const input = css.split('.groupNameInput {')[1].split('}')[0];
  expect(input).toContain('background: var(--color-input-bg);');
  expect(input).toContain('border: 1px solid var(--color-border);');
  const focus = css.split('.groupNameInput:focus {')[1].split('}')[0];
  expect(focus).toContain('border-color: var(--color-accent);');
  expect(focus).toContain('box-shadow: var(--focus-ring);');
});

test('PM navigation tabs are square and have extra top spacing', () => {
  const css = source('../../components/PM/PMNavigation.module.css');
  expect(css.split('.pmNav {')[1].split('}')[0]).toContain('padding-top: var(--space-4);');
  expect(css.split('.tab {')[1].split('}')[0]).toContain('border-radius: 0;');
});
