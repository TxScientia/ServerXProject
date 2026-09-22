import type { RichTextDoc } from '../RichTextEditor';

export type PostRead = {
  id: string;
  author_character_id: string;
  author_name: string | null;
  body: RichTextDoc;
  created_at: string;
  edited_at: string | null;
};

export type SceneStatus = 'active' | 'inactive' | 'finished';

export type SceneRead = {
  id: string;
  place_id: string;
  title: string;
  status: SceneStatus;
  last_post_at: string;
  finished_at: string | null;
  created_at: string;
  participant_ids: string[];
  post_count: number;
};

export type SceneWithPosts = SceneRead & { posts: PostRead[] };
