export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  color_identity: string[];
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus';
  set: string;
  set_name: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    art_crop: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      art_crop: string;
    };
  }>;
}

export interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  released_at: string;
  card_count: number;
  icon_svg_uri: string;
}

export interface CardReview {
  id?: string;
  set_code: string;
  card_id: string;
  card_name: string;
  my_grade: number | null;
  my_review: string;
  pro_grade: number | null;
  pro_review: string;
}

export interface LSVCardData {
  cardName: string;
  grade: number;
  review: string;
}

export type ColorFilter = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic';

export interface Archetype {
  id?: string;
  set_code: string;
  name: string;
  colors: ColorFilter[];
  description: string;
  example_builds: string[];
}
