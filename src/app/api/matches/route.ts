/**
 * GET /api/matches?slug=worldcup-2026
 * Returns all data needed to build a Tournament object:
 * teams, tournament_teams (with group assignments), matches, venues.
 *
 * Used for initial client-side hydration; Supabase Realtime handles updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? 'worldcup-2026';

  const { data: tour, error: tErr } = await supabase.from('tournaments').select('id').eq('slug', slug).single();

  if (tErr || !tour) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  const [{ data: tournamentTeams }, { data: matches }, { data: venues }] = await Promise.all([
    supabase
      .from('tournament_teams')
      .select('id, tournament_id, team_id, group_letter, teams(*)')
      .eq('tournament_id', tour.id),
    supabase.from('matches').select('*').eq('tournament_id', tour.id).order('scheduled_at', { ascending: true }),
    supabase.from('venues').select('*'),
  ]);

  // Collect unique team ids from matches to fetch teams not in tournament_teams
  const teamIds = new Set<number>();
  (tournamentTeams ?? []).forEach((tt: { team_id: number }) => teamIds.add(tt.team_id));

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .in('id', [...teamIds]);

  return NextResponse.json({
    teams: teams ?? [],
    tournamentTeams: tournamentTeams ?? [],
    matches: matches ?? [],
    venues: venues ?? [],
  });
}
