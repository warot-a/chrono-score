-- chrono-score schema — multi-sport, starting with World Cup 2026

CREATE TABLE sports (
  id   serial PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL
);

CREATE TABLE tournaments (
  id          serial PRIMARY KEY,
  sport_id    int REFERENCES sports(id),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  season      text,
  start_date  date,
  end_date    date,
  external_id text,   -- e.g. "WC" for football-data.org
  config      jsonb DEFAULT '{}'
);

CREATE TABLE teams (
  id           serial PRIMARY KEY,
  code         text UNIQUE NOT NULL,  -- 3-letter code: BRA, FRA, …
  name         text NOT NULL,
  flag         text,                  -- emoji or image URL
  country_code text,
  strength     int DEFAULT 70
);

CREATE TABLE venues (
  id      serial PRIMARY KEY,
  name    text NOT NULL,
  city    text NOT NULL,
  country text NOT NULL
);

CREATE TABLE tournament_teams (
  id            serial PRIMARY KEY,
  tournament_id int REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id       int REFERENCES teams(id),
  group_letter  text,   -- "A".."L"; NULL for direct-elimination formats
  UNIQUE(tournament_id, team_id)
);

CREATE TABLE matches (
  id              serial PRIMARY KEY,
  tournament_id   int REFERENCES tournaments(id) ON DELETE CASCADE,
  external_id     text UNIQUE,
  stage           text NOT NULL DEFAULT 'group',   -- 'group' | 'ko'
  round_name      text NOT NULL,                   -- "Matchday 1" | "Round of 32" | …
  group_letter    text,
  home_team_id    int REFERENCES teams(id),
  away_team_id    int REFERENCES teams(id),
  venue_id        int REFERENCES venues(id),
  scheduled_at    timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'SCHEDULED',
  -- SCHEDULED | LIVE | PAUSED | FINISHED | POSTPONED | CANCELLED
  home_score      int,
  away_score      int,
  home_score_ht   int,
  away_score_ht   int,
  home_penalties  int,
  away_penalties  int,
  minute          int,             -- live match minute
  decided         text DEFAULT '', -- '' | 'a.e.t.' | 'pens'
  ko_number       int,             -- 73..104 for WC2026 KO matches
  home_slot       text,            -- KO bracket slot ref, e.g. 'W:A'
  away_slot       text,
  metadata        jsonb DEFAULT '{}'
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_scheduled  ON matches(scheduled_at);
CREATE INDEX idx_matches_status     ON matches(status);

-- Enable row-level security (Supabase default)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams   ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports  ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "public read matches"      ON matches      FOR SELECT USING (true);
CREATE POLICY "public read teams"        ON teams        FOR SELECT USING (true);
CREATE POLICY "public read venues"       ON venues       FOR SELECT USING (true);
CREATE POLICY "public read tt"           ON tournament_teams FOR SELECT USING (true);
CREATE POLICY "public read tournaments"  ON tournaments  FOR SELECT USING (true);
CREATE POLICY "public read sports"       ON sports       FOR SELECT USING (true);

-- Realtime: full row identity so UPDATE events carry old + new values
ALTER TABLE matches REPLICA IDENTITY FULL;
