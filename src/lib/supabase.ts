import { createClient } from '@supabase/supabase-js';
import type { CardReview, Archetype } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchReviewsForSet(setCode: string): Promise<CardReview[]> {
  const { data, error } = await supabase
    .from('card_reviews')
    .select('*')
    .eq('set_code', setCode);

  if (error) throw error;
  return data ?? [];
}

function stripPayload({ id, ...rest }: CardReview) {
  // Generate the UUID client-side when this is a new row. Relying on the
  // Postgres DEFAULT (gen_random_uuid) is fragile here: `defaultToNull: false`
  // requires PostgREST to honor `Prefer: missing=default`, and any tooling that
  // strips that header sends `id: null`, which violates NOT NULL. Providing the
  // id explicitly sidesteps the whole issue.
  return {
    ...rest,
    id: id ?? crypto.randomUUID(),
    updated_at: new Date().toISOString(),
  };
}

export async function upsertReview(review: CardReview): Promise<CardReview> {
  const { data, error } = await supabase
    .from('card_reviews')
    .upsert(stripPayload(review), { onConflict: 'set_code,card_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertManyReviews(reviews: CardReview[]): Promise<void> {
  const { error } = await supabase
    .from('card_reviews')
    .upsert(reviews.map(stripPayload), { onConflict: 'set_code,card_id' });

  if (error) throw error;
}

export async function fetchArchetypesForSet(setCode: string): Promise<Archetype[]> {
  const { data, error } = await supabase
    .from('set_archetypes')
    .select('*')
    .eq('set_code', setCode)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function upsertArchetype(archetype: Archetype): Promise<Archetype> {
  const payload = {
    ...archetype,
    id: archetype.id ?? crypto.randomUUID(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('set_archetypes')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteArchetype(id: string): Promise<void> {
  const { error } = await supabase
    .from('set_archetypes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
