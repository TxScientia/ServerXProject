import type { RichTextDoc } from '../RichTextEditor';

export type WantedAdScope =
  | { type: 'global' }
  | { type: 'storybook'; storybookId: string };

export type WantedAd = {
  id: string;
  scope_type: 'global' | 'space';
  space_id: string | null;
  title: string;
  body: RichTextDoc;
  author_character_id: string;
  author_name: string | null;
  created_at: string;
};
