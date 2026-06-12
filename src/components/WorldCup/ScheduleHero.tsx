'use client';

import { phaseForDay, matchView } from '@/lib/util';
import { useTournamentStore, selectNowTs } from '@/store/tournamentStore';
import { HeroSection } from './HeroSection';

export function ScheduleHero() {
  const tour = useTournamentStore((s) => s.tour);
  const nowDay = useTournamentStore((s) => s.nowDay);
  const nowTs = useTournamentStore(selectNowTs);

  const phase = phaseForDay(nowDay);
  const playedCount = tour.matches.filter((m) => matchView(tour, m, nowTs).played).length;

  return <HeroSection tour={tour} nowTs={nowTs} phase={phase} playedCount={playedCount} />;
}
