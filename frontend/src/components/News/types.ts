import type { RichTextDoc } from '../RichTextEditor';

export type NewsKind = 'info' | 'update' | 'maintenance' | 'warning';

export type NewsItem = {
  id: string;
  scope_type: 'global' | 'space';
  space_id: string | null;
  title: string;
  body: RichTextDoc;
  kind: NewsKind;
  pinned: boolean;
  author_account_id: string;
  author_login_name: string | null;
  author_character_id: string | null;
  author_character_name: string | null;
  created_at: string;
  updated_at: string | null;
};

export type NewsScope =
  | { type: 'global' }
  | { type: 'storybook'; storybookId: string };
