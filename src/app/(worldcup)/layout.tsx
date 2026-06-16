import { supabase, DBMatch, DBTeam, DBVenue, DBTournamentTeam } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
import { WorldCupShell } from '@/components/WorldCup/WorldCupShell';

export interface MatchData {
  teams: DBTeam[];
  tournamentTeams: DBTournamentTeam[];
  matches: DBMatch[];
  venues: DBVenue[];
}

const SLUG = 'worldcup-2026';

async function fetchMatchData(): Promise<MatchData | null> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

    const { data: tour, error: tourError } = await supabase.from('tournaments').select('id').eq('slug', SLUG).single();
    if (tourError || !tour) return null;

    const [
      { data: tournamentTeams, error: teamsError },
      { data: matches, error: matchesError },
      { data: venues, error: venuesError },
    ] = await Promise.all([
      supabase
        .from('tournament_teams')
        .select('id, tournament_id, team_id, group_letter, teams(*)')
        .eq('tournament_id', tour.id),
      supabase.from('matches').select('*').eq('tournament_id', tour.id).order('scheduled_at', { ascending: true }),
      supabase.from('venues').select('*'),
    ]);

    if (teamsError || matchesError || venuesError) return null;

    const validTournamentTeams = (tournamentTeams ?? []).filter(
      (tt: { teams: unknown }) => tt.teams != null,
    ) as unknown as DBTournamentTeam[];

    return {
      teams: validTournamentTeams.map((tt) => tt.teams),
      tournamentTeams: validTournamentTeams,
      matches: (matches ?? []) as DBMatch[],
      venues: (venues ?? []) as DBVenue[],
    };
  } catch (error) {
    console.error('Error fetching match data:', error);
    return null;
  }
}

export default async function WorldCupLayout({ children }: { children: React.ReactNode }) {
  const initialData = await fetchMatchData();
  return <WorldCupShell initialData={initialData}>{children}</WorldCupShell>;
}
