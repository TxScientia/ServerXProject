import type { RichTextDoc } from '../RichTextEditor';

export type OOCScope =
  | { type: 'global' }
  | { type: 'storybook'; storybookId: string };

/** Server-computed command result (dice / Magic Conch), stored instead of rich text. */
export type RollBody = { kind: 'dice' | 'conch'; text: string };

export type OOCMessage = {
  id: string;
  scope_type: 'global' | 'space';
  space_id: string | null;
  author_character_id: string;
  author_name: string | null;
  body: RichTextDoc | RollBody;
  kind: string | null;
  created_at: string;
  edited_at: string | null;
};
