-- Add columns to store real lineup and event data synced from football-data.org
ALTER TABLE matches ADD COLUMN IF NOT EXISTS lineups jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_events jsonb;
