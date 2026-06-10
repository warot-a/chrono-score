-- Seed data for FIFA World Cup 2026
-- Run this in Supabase SQL Editor after 001_schema.sql

-- ── Sports ───────────────────────────────────────────────────────────────────
INSERT INTO sports (name, slug) VALUES ('Football', 'football')
ON CONFLICT (slug) DO NOTHING;

-- ── Tournament ───────────────────────────────────────────────────────────────
INSERT INTO tournaments (sport_id, name, slug, season, start_date, end_date, external_id)
VALUES (
  (SELECT id FROM sports WHERE slug = 'football'),
  'FIFA World Cup 2026', 'worldcup-2026', '2026',
  '2026-06-11', '2026-07-19', 'WC'
)
ON CONFLICT (slug) DO NOTHING;

-- ── Venues ───────────────────────────────────────────────────────────────────
INSERT INTO venues (name, city, country) VALUES
  ('Estadio Azteca',            'Mexico City',      'Mexico'),
  ('Estadio Akron',             'Guadalajara',       'Mexico'),
  ('Estadio BBVA',              'Monterrey',         'Mexico'),
  ('BMO Field',                 'Toronto',           'Canada'),
  ('BC Place',                  'Vancouver',         'Canada'),
  ('SoFi Stadium',              'Los Angeles',       'United States'),
  ('Levi''s Stadium',           'San Francisco Bay', 'United States'),
  ('Lumen Field',               'Seattle',           'United States'),
  ('Arrowhead Stadium',         'Kansas City',       'United States'),
  ('AT&T Stadium',              'Dallas',            'United States'),
  ('NRG Stadium',               'Houston',           'United States'),
  ('Mercedes-Benz Stadium',     'Atlanta',           'United States'),
  ('Hard Rock Stadium',         'Miami',             'United States'),
  ('MetLife Stadium',           'New York / NJ',     'United States'),
  ('Lincoln Financial Field',   'Philadelphia',      'United States'),
  ('Gillette Stadium',          'Boston',            'United States')
ON CONFLICT DO NOTHING;

-- ── Teams (48 nations) ───────────────────────────────────────────────────────
INSERT INTO teams (code, name, flag, country_code, strength) VALUES
  ('MEX','Mexico','🇲🇽','mx',76),
  ('RSA','South Africa','🇿🇦','za',66),
  ('KOR','South Korea','🇰🇷','kr',75),
  ('CZE','Czechia','🇨🇿','cz',75),
  ('CAN','Canada','🇨🇦','ca',74),
  ('BIH','Bosnia & Herz.','🇧🇦','ba',73),
  ('QAT','Qatar','🇶🇦','qa',67),
  ('SUI','Switzerland','🇨🇭','ch',79),
  ('BRA','Brazil','🇧🇷','br',88),
  ('MAR','Morocco','🇲🇦','ma',82),
  ('HAI','Haiti','🇭🇹','ht',60),
  ('SCO','Scotland','🏴󠁧󠁢󠁳󠁣󠁴󠁿','gb-sct',73),
  ('USA','United States','🇺🇸','us',78),
  ('PAR','Paraguay','🇵🇾','py',72),
  ('AUS','Australia','🇦🇺','au',71),
  ('TUR','Türkiye','🇹🇷','tr',77),
  ('GER','Germany','🇩🇪','de',85),
  ('CUW','Curaçao','🇨🇼','cw',59),
  ('CIV','Ivory Coast','🇨🇮','ci',75),
  ('ECU','Ecuador','🇪🇨','ec',77),
  ('NED','Netherlands','🇳🇱','nl',85),
  ('JPN','Japan','🇯🇵','jp',78),
  ('SWE','Sweden','🇸🇪','se',76),
  ('TUN','Tunisia','🇹🇳','tn',69),
  ('BEL','Belgium','🇧🇪','be',83),
  ('EGY','Egypt','🇪🇬','eg',74),
  ('IRN','Iran','🇮🇷','ir',72),
  ('NZL','New Zealand','🇳🇿','nz',60),
  ('ESP','Spain','🇪🇸','es',92),
  ('CPV','Cape Verde','🇨🇻','cv',62),
  ('KSA','Saudi Arabia','🇸🇦','sa',66),
  ('URU','Uruguay','🇺🇾','uy',82),
  ('FRA','France','🇫🇷','fr',90),
  ('SEN','Senegal','🇸🇳','sn',80),
  ('IRQ','Iraq','🇮🇶','iq',65),
  ('NOR','Norway','🇳🇴','no',79),
  ('ARG','Argentina','🇦🇷','ar',91),
  ('ALG','Algeria','🇩🇿','dz',73),
  ('AUT','Austria','🇦🇹','at',76),
  ('JOR','Jordan','🇯🇴','jo',64),
  ('POR','Portugal','🇵🇹','pt',86),
  ('COD','DR Congo','🇨🇩','cd',70),
  ('UZB','Uzbekistan','🇺🇿','uz',67),
  ('COL','Colombia','🇨🇴','co',81),
  ('ENG','England','🏴󠁧󠁢󠁥󠁮󠁧󠁿','gb-eng',88),
  ('CRO','Croatia','🇭🇷','hr',82),
  ('GHA','Ghana','🇬🇭','gh',72),
  ('PAN','Panama','🇵🇦','pa',66)
ON CONFLICT (code) DO NOTHING;

-- ── Tournament Teams + Group Assignments ─────────────────────────────────────
-- Using a temp helper to map code → id cleanly
DO $$
DECLARE
  tid int := (SELECT id FROM tournaments WHERE slug = 'worldcup-2026');
  groups text[][] := ARRAY[
    ARRAY['A','MEX'],ARRAY['A','RSA'],ARRAY['A','KOR'],ARRAY['A','CZE'],
    ARRAY['B','CAN'],ARRAY['B','BIH'],ARRAY['B','QAT'],ARRAY['B','SUI'],
    ARRAY['C','BRA'],ARRAY['C','MAR'],ARRAY['C','HAI'],ARRAY['C','SCO'],
    ARRAY['D','USA'],ARRAY['D','PAR'],ARRAY['D','AUS'],ARRAY['D','TUR'],
    ARRAY['E','GER'],ARRAY['E','CUW'],ARRAY['E','CIV'],ARRAY['E','ECU'],
    ARRAY['F','NED'],ARRAY['F','JPN'],ARRAY['F','SWE'],ARRAY['F','TUN'],
    ARRAY['G','BEL'],ARRAY['G','EGY'],ARRAY['G','IRN'],ARRAY['G','NZL'],
    ARRAY['H','ESP'],ARRAY['H','CPV'],ARRAY['H','KSA'],ARRAY['H','URU'],
    ARRAY['I','FRA'],ARRAY['I','SEN'],ARRAY['I','IRQ'],ARRAY['I','NOR'],
    ARRAY['J','ARG'],ARRAY['J','ALG'],ARRAY['J','AUT'],ARRAY['J','JOR'],
    ARRAY['K','POR'],ARRAY['K','COD'],ARRAY['K','UZB'],ARRAY['K','COL'],
    ARRAY['L','ENG'],ARRAY['L','CRO'],ARRAY['L','GHA'],ARRAY['L','PAN']
  ];
  g text[];
BEGIN
  FOREACH g SLICE 1 IN ARRAY groups LOOP
    INSERT INTO tournament_teams (tournament_id, team_id, group_letter)
    VALUES (tid, (SELECT id FROM teams WHERE code = g[2]), g[1])
    ON CONFLICT (tournament_id, team_id) DO NOTHING;
  END LOOP;
END $$;

-- ── KO Match Stubs (bracket structure — teams filled in as group stage ends) ──
-- Dates are approximate; sync route will update scores + status via external_id.
-- home_slot / away_slot encode the bracket references used by the UI.
DO $$
DECLARE
  tid int := (SELECT id FROM tournaments WHERE slug = 'worldcup-2026');
BEGIN
  INSERT INTO matches
    (tournament_id, stage, round_name, ko_number, home_slot, away_slot, scheduled_at, status)
  VALUES
    -- Round of 32 (Jun 28 – Jul 3)
    (tid,'ko','Round of 32', 73,'R:A','R:B', '2026-06-28 12:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 74,'W:E','3:sE','2026-06-28 15:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 75,'W:F','R:C', '2026-06-28 18:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 76,'W:C','R:F', '2026-06-29 21:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 77,'W:I','3:sI','2026-06-29 12:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 78,'R:E','R:I', '2026-06-29 15:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 79,'W:A','3:sA','2026-06-30 18:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 80,'W:L','3:sL','2026-06-30 21:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 81,'W:D','3:sD','2026-07-01 12:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 82,'W:G','3:sG','2026-07-01 15:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 83,'R:K','R:L', '2026-07-01 18:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 84,'W:H','R:J', '2026-07-02 21:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 85,'W:B','3:sB','2026-07-02 12:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 86,'W:J','R:H', '2026-07-02 15:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 87,'W:K','3:sK','2026-07-03 18:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 32', 88,'R:D','R:G', '2026-07-03 21:00:00+00','SCHEDULED'),
    -- Round of 16 (Jul 4-7)
    (tid,'ko','Round of 16', 89,'M:74','M:77','2026-07-04 12:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 16', 90,'M:73','M:75','2026-07-04 15:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 16', 91,'M:76','M:78','2026-07-05 18:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 16', 92,'M:79','M:80','2026-07-05 21:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 16', 93,'M:83','M:84','2026-07-06 12:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 16', 94,'M:81','M:82','2026-07-06 15:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 16', 95,'M:86','M:88','2026-07-07 18:00:00+00','SCHEDULED'),
    (tid,'ko','Round of 16', 96,'M:85','M:87','2026-07-07 21:00:00+00','SCHEDULED'),
    -- Quarter-finals (Jul 9-11)
    (tid,'ko','Quarter-final',97,'M:89','M:90','2026-07-09 12:00:00+00','SCHEDULED'),
    (tid,'ko','Quarter-final',98,'M:93','M:94','2026-07-09 15:00:00+00','SCHEDULED'),
    (tid,'ko','Quarter-final',99,'M:91','M:92','2026-07-10 18:00:00+00','SCHEDULED'),
    (tid,'ko','Quarter-final',100,'M:95','M:96','2026-07-11 21:00:00+00','SCHEDULED'),
    -- Semi-finals (Jul 14-15)
    (tid,'ko','Semi-final',  101,'M:97','M:98', '2026-07-14 12:00:00+00','SCHEDULED'),
    (tid,'ko','Semi-final',  102,'M:99','M:100','2026-07-15 15:00:00+00','SCHEDULED'),
    -- Third place + Final
    (tid,'ko','Third place', 103,'L:101','L:102','2026-07-18 18:00:00+00','SCHEDULED'),
    (tid,'ko','Final',       104,'M:101','M:102','2026-07-19 21:00:00+00','SCHEDULED');
END $$;
