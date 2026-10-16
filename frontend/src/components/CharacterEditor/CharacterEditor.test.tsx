import { formFromCharacter, payloadFromForm } from './index';

const character = { id: '1', name: 'Arthas', race: 'Mensch', spec: 'Paladin', gender: 'Männlich' };

test('defaults name typography to the existing profile styles', () => {
  const form = formFromCharacter(character);
  expect(form.editorData.nameFontFamily).toBe('');
  expect(form.editorData.nameFontSize).toBe('');
  expect(form.editorData.quote).toBe('');
});

test('preserves custom name typography when loading and saving a character', () => {
  const form = formFromCharacter({
    ...character,
    editorData: { nameFontFamily: 'Cormorant Garamond', nameFontSize: '72', quote: 'A character quote.' },
  });
  const payload = payloadFromForm(form);
  expect(payload.editorData.nameFontFamily).toBe('Cormorant Garamond');
  expect(payload.editorData.nameFontSize).toBe('72');
  expect(payload.editorData.quote).toBe('A character quote.');
});
