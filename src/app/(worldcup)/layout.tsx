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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const { data: tour } = await supabase.from('tournaments').select('id').eq('slug', SLUG).single();
  if (!tour) return null;

  const [{ data: tournamentTeams }, { data: matches }, { data: venues }] = await Promise.all([
    supabase
      .from('tournament_teams')
      .select('id, tournament_id, team_id, group_letter, teams(*)')
      .eq('tournament_id', tour.id),
    supabase.from('matches').select('*').eq('tournament_id', tour.id).order('scheduled_at', { ascending: true }),
    supabase.from('venues').select('*'),
  ]);

  const teamIds = new Set<number>();
  (tournamentTeams ?? []).forEach((tt: { team_id: number }) => teamIds.add(tt.team_id));
  const { data: teams } =
    teamIds.size > 0
      ? await supabase
          .from('teams')
          .select('*')
          .in('id', [...teamIds])
      : { data: [] };

  return {
    teams: (teams ?? []) as DBTeam[],
    tournamentTeams: (tournamentTeams ?? []).filter(
      (tt: { teams: unknown }) => tt.teams != null,
    ) as unknown as DBTournamentTeam[],
    matches: (matches ?? []) as DBMatch[],
    venues: (venues ?? []) as DBVenue[],
  };
}

export default async function WorldCupLayout({ children }: { children: React.ReactNode }) {
  const initialData = await fetchMatchData();
  return <WorldCupShell initialData={initialData}>{children}</WorldCupShell>;
}
