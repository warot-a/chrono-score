import { MatchDetailView } from '@/components/WorldCup/MatchDetailView';

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MatchDetailView matchId={id} />;
}
