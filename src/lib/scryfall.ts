import type { ScryfallCard, ScryfallSet } from '../types';

const BASE = 'https://api.scryfall.com';

const DRAFTABLE_SET_TYPES = new Set([
  'expansion', 'core', 'masters', 'draft_innovation', 'funny',
]);

async function scryfallDelay() {
  return new Promise(resolve => setTimeout(resolve, 100));
}

export async function fetchSets(): Promise<ScryfallSet[]> {
  const res = await fetch(`${BASE}/sets`);
  if (!res.ok) throw new Error('Failed to fetch sets from Scryfall');
  const data = await res.json();
  return (data.data as ScryfallSet[])
    .filter(s => DRAFTABLE_SET_TYPES.has(s.set_type))
    .sort((a, b) => b.released_at.localeCompare(a.released_at));
}

export async function fetchSetCards(setCode: string): Promise<ScryfallCard[]> {
  const cards: ScryfallCard[] = [];
  let url: string | null =
    `${BASE}/cards/search?q=set:${setCode}+game:paper&order=set&unique=cards`;

  while (url) {
    const res: Response = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch cards for set ${setCode}`);
    const data = await res.json() as { data: ScryfallCard[]; has_more: boolean; next_page: string };
    cards.push(...data.data);
    url = data.has_more ? data.next_page : null;
    if (url) await scryfallDelay();
  }

  return cards;
}

export function getCardImage(card: ScryfallCard, size: 'small' | 'normal' = 'normal'): string {
  if (card.image_uris) return card.image_uris[size];
  if (card.card_faces?.[0]?.image_uris) return card.card_faces[0].image_uris[size];
  return '';
}

export function getCardColors(card: ScryfallCard): string[] {
  return card.colors ?? card.color_identity ?? [];
}

export function getCardOracleText(card: ScryfallCard): string {
  if (card.oracle_text) return card.oracle_text;
  return card.card_faces?.map(f => f.oracle_text ?? '').join('\n//\n') ?? '';
}
