export interface EmojiCategory {
  name: string;
  slug: string;
}

export interface EmojiComponent {
  name: string;
  slug: string;
  emoji: string;
}

export interface Emoji {
  emoji: string;
  name: string | null;
  slug: string | null;
  category: string;
  emoji_version: string | null;
  unicode_version: string | null;
  skin_tone_support: boolean | null;
  skin_tone_support_unicode_version?: string;
}
