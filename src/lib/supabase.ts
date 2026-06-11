import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser / RSC client (anon key, RLS applies)
export const supabase = createClient(url, anon);

// Server-only client (service role — bypasses RLS, for /api/sync)
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// ── Row types ────────────────────────────────────────────────────────────────

export interface DBMatch {
  id: number;
  tournament_id: number;
  external_id: string | null;
  stage: string;
  round_name: string;
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  venue_id: number | null;
  scheduled_at: string; // ISO string (UTC)
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_score_ht: number | null;
  away_score_ht: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  minute: number | null;
  decided: string;
  ko_number: number | null;
  home_slot: string | null;
  away_slot: string | null;
  metadata: Record<string, unknown>;
}

export interface DBTeam {
  id: number;
  code: string;
  name: string;
  flag: string;
  country_code: string;
  strength: number;
}

export interface DBVenue {
  id: number;
  name: string;
  city: string;
  country: string;
}

export interface DBTournamentTeam {
  id: number;
  tournament_id: number;
  team_id: number;
  group_letter: string | null;
  teams: DBTeam;
}
