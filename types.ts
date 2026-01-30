export interface PraiseItem {
  id: number;
  originalText: string;
  translation: string;
  phonetic?: string;
  reference: string;
  category: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean;
}

export enum Theme {
  DAY = 'day',
  DARK = 'dark',
  NIGHT = 'night',
  GRADIENT = 'gradient'
}

export enum AccentColor {
  INDIGO = 'indigo',
  ROSE = 'rose',
  EMERALD = 'emerald',
  AMBER = 'amber',
  VIOLET = 'violet',
  SKY = 'sky'
}

export enum FontSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  XLARGE = 'xlarge'
}

export enum FontFamily {
  SANS = 'sans',
  SERIF = 'serif',
  MONO = 'mono',
  SCRIPT = 'script'
}

export enum PraiseCategory {
  ALL = 'All',
  NATURE = "Nature & Character",
  REFUGE = "Refuge & Strength",
  HEALER = "Healer & Restorer",
  GUIDE = "Guide & Provider",
  SALVATION = "Salvation & Redemption",
  COMFORT = "Comfort & Compassion",
  LOVE = "Love, Grace & Mercy",
  CREATOR = "Creator & Sustainer",
  POWER = "Power & Victory",
  TRINITY = "Trinity & Presence",
  JUSTICE = "Justice & Truth",
  FAITHFULNESS = "Faithfulness & Promises",
  TRANSFORMATION = "Transformation & Purpose",
  RESPONSE = "Response & Worship"
}