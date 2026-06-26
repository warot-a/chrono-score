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

interface FDFetchResult {
  json: unknown;
  status: number;
}

async function fdFetch(path: string): Promise<FDFetchResult> {
  const res = await fetch(FD_BASE + path, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`football-data.org ${path}: ${res.status} ${res.statusText}`);
  return { json: await res.json(), status: res.status };
}

// fire-and-forget: ไม่ await เพื่อไม่ให้กระทบ response latency
function insertSyncLog(
  db: ReturnType<typeof supabaseAdmin>,
  log: {
    status: 'ok' | 'error';
    duration_ms: number;
    fd_status: number | null;
    match_count: number | null;
    upserted: number | null;
    error: string | null;
  },
) {
  void db.from('sync_logs').insert(log);
}

async function handler(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const db = supabaseAdmin();

  // ── ตัวแปรสำหรับ logging ──────────────────────────────────────────────────
  let fdHttpStatus: number | null = null;
  let matchCount: number | null = null;

  try {
    // Get tournament id
    const { data: tour, error: tErr } = await db.from('tournaments').select('id').eq('slug', WC_SLUG).single();

    if (tErr || !tour) {
      insertSyncLog(db, {
        status: 'error',
        duration_ms: Date.now() - startTime,
        fd_status: null,
        match_count: null,
        upserted: null,
        error: tErr?.message ?? 'Tournament not found',
      });
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Fetch all matches from football-data.org
    const { json: data, status: fdStatus } = await fdFetch(`/competitions/WC/matches`);
    fdHttpStatus = fdStatus;
    const fdMatches: FDMatch[] = (data as { matches: FDMatch[] }).matches;
    matchCount = fdMatches.length;

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
    const { data: existing } = await db
      .from('matches')
      .select('id, external_id, ko_number, home_team_id, away_team_id')
      .eq('tournament_id', tour.id);

    const existingByExtId: Record<
      string,
      { id: number; ko_number: number | null; home_team_id: number | null; away_team_id: number | null }
    > = {};
    (existing ?? []).forEach(
      (m: {
        id: number;
        external_id: string;
        ko_number: number | null;
        home_team_id: number | null;
        away_team_id: number | null;
      }) => {
        existingByExtId[m.external_id] = m;
      },
    );

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

      const resolvedHomeId = teamCodeToId[homeTla] ?? null;
      const resolvedAwayId = teamCodeToId[awayTla] ?? null;

      const row = {
        tournament_id: tour.id,
        external_id: extId,
        stage: isGroup ? 'group' : 'ko',
        round_name: roundLabel,
        group_letter: fm.group ? fm.group.replace('GROUP_', '') : null,
        // Guard: never overwrite an existing team ID with null (API can be inconsistent)
        home_team_id: resolvedHomeId ?? existing_?.home_team_id ?? null,
        away_team_id: resolvedAwayId ?? existing_?.away_team_id ?? null,
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
        insertSyncLog(db, {
          status: 'error',
          duration_ms: Date.now() - startTime,
          fd_status: fdHttpStatus,
          match_count: matchCount,
          upserted: null,
          error: error.message,
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    insertSyncLog(db, {
      status: 'ok',
      duration_ms: Date.now() - startTime,
      fd_status: fdHttpStatus,
      match_count: matchCount,
      upserted,
      error: null,
    });

    return NextResponse.json({ upserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    insertSyncLog(db, {
      status: 'error',
      duration_ms: Date.now() - startTime,
      fd_status: fdHttpStatus,
      match_count: matchCount,
      upserted: null,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Vercel Cron uses GET; manual testing can use POST
export const GET = handler;
export const POST = handler;

// Some TLA differences between football-data.org and FIFA/our DB codes
const TLA_FIXES: Record<string, string> = {
  BIH: 'BIH',
  KSA: 'KSA',
  KOR: 'KOR',
  CIV: 'CIV',
  USA: 'USA',
  GER: 'GER',
  FRA: 'FRA',
  ARG: 'ARG',
  URY: 'URU', // football-data.org uses URY inconsistently; our DB stores URU
};
function normalizeTla(tla: string): string {
  return TLA_FIXES[tla] ?? tla;
}
