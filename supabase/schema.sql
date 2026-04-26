-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

CREATE TABLE IF NOT EXISTS card_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_code TEXT NOT NULL,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  my_grade NUMERIC(3,1),
  my_review TEXT DEFAULT '',
  pro_grade NUMERIC(3,1),
  pro_review TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(set_code, card_id)
);

-- Allow all operations without authentication (single-user app)
ALTER TABLE card_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON card_reviews FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_reviews_updated_at
  BEFORE UPDATE ON card_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Archetypes table
CREATE TABLE IF NOT EXISTS set_archetypes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_code TEXT NOT NULL,
  name TEXT NOT NULL,
  colors TEXT[] DEFAULT '{}',
  description TEXT DEFAULT '',
  example_builds TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE set_archetypes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON set_archetypes FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER set_archetypes_updated_at
  BEFORE UPDATE ON set_archetypes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
