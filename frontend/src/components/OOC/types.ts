import type { RichTextDoc } from '../RichTextEditor';

export type OOCScope =
  | { type: 'global' }
  | { type: 'storybook'; storybookId: string };

export type OOCMessage = {
  id: string;
  scope_type: 'global' | 'space';
  space_id: string | null;
  author_character_id: string;
  author_name: string | null;
  body: RichTextDoc;
  created_at: string;
  edited_at: string | null;
};
