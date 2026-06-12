/**
 * POST /api/sync
 * Called by Vercel Cron every 60 seconds during the tournament.
 * Fetches live match data from football-data.org and upserts to Supabase.
 *
 * Protected by CRON_SECRET header to prevent public abuse.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const FD_BASE = 'https://api.football-data.org/v4';
const WC_SLUG = 'worldcup-2026';

// football-data.org status → our status
const STATUS_MAP: Record<string, string> = {
  SCHEDULED: 'SCHEDULED',
  TIMED: 'SCHEDULED',
  IN_PLAY: 'LIVE',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED',
  SUSPENDED: 'POSTPONED',
  POSTPONED: 'POSTPONED',
  CANCELLED: 'CANCELLED',
  AWARDED: 'FINISHED',
};

// football-data.org stage label → our round_name
const ROUND_MAP: Record<string, string> = {
  GROUP_STAGE: 'Matchday', // will append matchday number below
  ROUND_OF_32: 'Round of 32',
  ROUND_OF_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-final',
  SEMI_FINALS: 'Semi-final',
  THIRD_PLACE: 'Third place',
  FINAL: 'Final',
};

interface FDScore {
  home: number | null;
  away: number | null;
}

interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null; // e.g. "GROUP_A"
  matchday: number | null;
  minute?: string | null;
  score: {
    winner: string | null;
    duration: string; // 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
    fullTime: FDScore;
    halfTime: FDScore;
    regularTime?: FDScore;
    extraTime?: FDScore;
    penalties?: FDScore;
  };
  homeTeam: { id: number; tla: string; name: string; crest: string };
  awayTeam: { id: number; tla: string; name: string; crest: string };
  venue?: string;
}

interface FDLineupPlayer {
  player: { id: number; name: string };
  position: string;
  shirtNumber: number;
}

interface FDTeamLineup {
  id: number;
  name: string;
  formation: string | null;
  startXI: FDLineupPlayer[];
  substitutes: FDLineupPlayer[];
  coach: { name: string } | null;
}

interface FDMatchDetail {
  id: number;
  status: string;
  lineups: { homeTeam: FDTeamLineup; awayTeam: FDTeamLineup } | null;
  goals: Array<{
    minute: number;
    injuryTime: number | null;
    type: string;
    team: { id: number; tla: string };
    scorer: { name: string } | null;
    assist: { name: string } | null;
    score: FDScore;
  }> | null;
  bookings: Array<{
    minute: number;
    team: { id: number; tla: string };
    player: { name: string };
    card: string; // 'YELLOW_CARD' | 'RED_CARD' | 'YELLOW_RED_CARD'
  }> | null;
  substitutions: Array<{
    minute: number;
    team: { id: number; tla: string };
    playerOut: { name: string };
    playerIn: { name: string };
  }> | null;
}

const FD_POS: Record<string, string> = {
  Goalkeeper: 'GK',
  'Centre-Back': 'CB',
  'Left-Back': 'LB',
  'Right-Back': 'RB',
  'Defensive Midfield': 'DM',
  'Central Midfield': 'CM',
  'Attacking Midfield': 'AM',
  'Left Winger': 'LW',
  'Right Winger': 'RW',
  'Left Midfield': 'LW',
  'Right Midfield': 'RW',
  'Centre-Forward': 'CF',
  'Second Striker': 'ST',
};

async function fdFetch(path: string) {
  const res = await fetch(FD_BASE + path, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`football-data.org ${path}: ${res.status}`);
  return res.json();
}

async function handler(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = supabaseAdmin();

  // Get tournament id
  const { data: tour, error: tErr } = await db.from('tournaments').select('id').eq('slug', WC_SLUG).single();

  if (tErr || !tour) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  // Fetch all matches from football-data.org
  const data = await fdFetch(`/competitions/WC/matches`);
  const fdMatches: FDMatch[] = data.matches;

  // Build team-code → DB team id map
  const { data: dbTeams } = await db.from('teams').select('id, code');
  const teamCodeToId: Record<string, number> = {};
  (dbTeams ?? []).forEach((t: { id: number; code: string }) => {
    teamCodeToId[t.code] = t.id;
  });

  // Build venue name → DB venue id map
  const { data: dbVenues } = await db.from('venues').select('id, name');
  const venueNameToId: Record<string, number> = {};
  (dbVenues ?? []).forEach((v: { id: number; name: string }) => {
    venueNameToId[v.name.toLowerCase()] = v.id;
  });

  // Fetch existing matches for this tournament (external_id → row)
  const { data: existing } = await db.from('matches').select('id, external_id, ko_number').eq('tournament_id', tour.id);

  const existingByExtId: Record<string, { id: number; ko_number: number | null }> = {};
  (existing ?? []).forEach((m: { id: number; external_id: string; ko_number: number | null }) => {
    existingByExtId[m.external_id] = m;
  });

  let upserted = 0;
  const upserts = [];

  for (const fm of fdMatches) {
    const extId = String(fm.id);
    const existing_ = existingByExtId[extId];

    const isGroup = fm.stage === 'GROUP_STAGE';
    const roundLabel = isGroup ? `Matchday ${fm.matchday ?? 1}` : (ROUND_MAP[fm.stage] ?? fm.stage);

    // Decide on `decided` field
    let decided = '';
    if (fm.score.duration === 'EXTRA_TIME') decided = 'a.e.t.';
    if (fm.score.duration === 'PENALTY_SHOOTOUT') decided = 'pens';

    const homeScore = fm.score.fullTime.home;
    const awayScore = fm.score.fullTime.away;

    // For penalties, fullTime shows regular-time score; penalties are separate
    const homePen = fm.score.penalties?.home ?? null;
    const awayPen = fm.score.penalties?.away ?? null;

    // Normalize TLA: football-data.org sometimes uses different codes
    const homeTla = normalizeTla(fm.homeTeam.tla);
    const awayTla = normalizeTla(fm.awayTeam.tla);

    const venueKey = (fm.venue ?? '').toLowerCase();
    const venueId =
      Object.entries(venueNameToId).find(([k]) => venueKey.includes(k) || k.includes(venueKey))?.[1] ?? null;

    const row = {
      tournament_id: tour.id,
      external_id: extId,
      stage: isGroup ? 'group' : 'ko',
      round_name: roundLabel,
      group_letter: fm.group ? fm.group.replace('GROUP_', '') : null,
      home_team_id: teamCodeToId[homeTla] ?? null,
      away_team_id: teamCodeToId[awayTla] ?? null,
      venue_id: venueId,
      scheduled_at: fm.utcDate,
      status: STATUS_MAP[fm.status] ?? fm.status,
      home_score: homeScore,
      away_score: awayScore,
      home_score_ht: fm.score.halfTime.home,
      away_score_ht: fm.score.halfTime.away,
      home_penalties: homePen,
      away_penalties: awayPen,
      minute: fm.minute ? parseInt(fm.minute) : null,
      decided,
      // ko_number and slot refs are pre-seeded; don't overwrite
      ...(existing_ ? {} : { ko_number: null, home_slot: null, away_slot: null }),
    };

    upserts.push(row);
    upserted++;
  }

  if (upserts.length > 0) {
    const { error } = await db.from('matches').upsert(upserts, { onConflict: 'external_id' });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // ── Fetch individual match details (lineups + events) ──────────────────────
  // Find FINISHED matches that haven't had their details stored yet.
  // Process up to 8 per cron run to stay within the 10 req/min rate limit.
  const { data: needsDetails } = await db
    .from('matches')
    .select('id, external_id')
    .eq('tournament_id', tour.id)
    .eq('status', 'FINISHED')
    .is('lineups', null)
    .not('external_id', 'is', null)
    .limit(8);

  let detailsFetched = 0;
  for (const row of needsDetails ?? []) {
    try {
      const detail: FDMatchDetail = await fdFetch(`/matches/${row.external_id}`);

      const lineups = detail.lineups
        ? buildLineupsPayload(detail.lineups)
        : null;

      const matchEvents = buildEventsPayload(detail);

      await db
        .from('matches')
        .update({ lineups, match_events: matchEvents })
        .eq('id', row.id);

      detailsFetched++;
    } catch {
      // Non-fatal — missing details don't break the sync
    }
  }

  return NextResponse.json({ upserted, detailsFetched });
}

// Vercel Cron uses GET; manual testing can use POST
export const GET = handler;
export const POST = handler;

// ── Detail payload builders ───────────────────────────────────────────────────

function buildLineupsPayload(lineups: { homeTeam: FDTeamLineup; awayTeam: FDTeamLineup }) {
  function mapPlayers(list: FDLineupPlayer[], starting: boolean) {
    return list.map((p) => ({
      no: p.shirtNumber,
      name: p.player.name,
      pos: FD_POS[p.position] ?? p.position,
      starting,
    }));
  }

  return {
    home: {
      formation: lineups.homeTeam.formation,
      coach: lineups.homeTeam.coach?.name ?? null,
      players: [
        ...mapPlayers(lineups.homeTeam.startXI ?? [], true),
        ...mapPlayers(lineups.homeTeam.substitutes ?? [], false),
      ],
    },
    away: {
      formation: lineups.awayTeam.formation,
      coach: lineups.awayTeam.coach?.name ?? null,
      players: [
        ...mapPlayers(lineups.awayTeam.startXI ?? [], true),
        ...mapPlayers(lineups.awayTeam.substitutes ?? [], false),
      ],
    },
  };
}

interface StoredEvent {
  type: 'goal' | 'yellow' | 'red' | 'sub';
  team: 'home' | 'away';
  min: string;
  sort: number;
  player: string;
  assist?: string;
  on?: string;
  off?: string;
}

function buildEventsPayload(detail: FDMatchDetail): StoredEvent[] {
  const events: StoredEvent[] = [];

  const homeId = detail.lineups?.homeTeam.id;

  function teamSide(fdTeamId: number): 'home' | 'away' {
    return fdTeamId === homeId ? 'home' : 'away';
  }

  for (const g of detail.goals ?? []) {
    if (!g.scorer) continue;
    const min = g.injuryTime ? `${g.minute}+${g.injuryTime}` : String(g.minute);
    const ev: StoredEvent = {
      type: 'goal',
      team: teamSide(g.team.id),
      min,
      sort: g.minute + (g.injuryTime ?? 0) * 0.1,
      player: g.scorer.name,
    };
    if (g.assist) ev.assist = g.assist.name;
    events.push(ev);
  }

  for (const b of detail.bookings ?? []) {
    const card = b.card === 'YELLOW_CARD' ? 'yellow' : 'red';
    events.push({
      type: card as 'yellow' | 'red',
      team: teamSide(b.team.id),
      min: String(b.minute),
      sort: b.minute,
      player: b.player.name,
    });
  }

  for (const s of detail.substitutions ?? []) {
    events.push({
      type: 'sub',
      team: teamSide(s.team.id),
      min: String(s.minute),
      sort: s.minute,
      player: s.playerIn.name,
      on: s.playerIn.name,
      off: s.playerOut.name,
    });
  }

  return events.sort((a, b) => a.sort - b.sort);
}

// Some TLA differences between football-data.org and FIFA
const TLA_FIXES: Record<string, string> = {
  BIH: 'BIH',
  KSA: 'KSA',
  KOR: 'KOR',
  CIV: 'CIV',
  USA: 'USA',
  GER: 'GER',
  FRA: 'FRA',
  ARG: 'ARG',
};
function normalizeTla(tla: string): string {
  return TLA_FIXES[tla] ?? tla;
}
