'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { buildFromDB } from '@/lib/realData';
import { supabase, DBMatch } from '@/lib/supabase';
import { useTournamentStore } from '@/store/tournamentStore';
import type { MatchData } from '@/app/(worldcup)/layout';

/**
 * Single source of side effects for the tournament:
 *   1. Rehydrates the persisted clock position (store uses skipHydration).
 *   2. Applies server-fetched initialData synchronously before first paint
 *      (via useLayoutEffect) to avoid the fake-data flash.
 *   3. Subscribes to Supabase Realtime for live score updates.
 *   4. Drives the clock — snap-to-realtime while live, and the play animation.
 *
 * Mount this exactly once, in the route group shell.
 */
export function useTournamentSync(initialData?: MatchData | null): void {
  const rawRef = useRef<MatchData | null>(null);

  // ---- Rehydrate persisted clock, defaulting to "now" when none saved ----
  useEffect(() => {
    const hadSaved = !!localStorage.getItem('wc_now');
    useTournamentStore.persist.rehydrate();
    if (!hadSaved) {
      const { tour, setNowDay } = useTournamentStore.getState();
      setNowDay(Math.min(39, Math.max(0, (Date.now() - tour.DAY0) / tour.DAYMS)));
    }
  }, []);

  // ---- Apply server data before first paint (no fake-data flash) ----
  useLayoutEffect(() => {
    if (!initialData) return;
    const { teams, tournamentTeams, matches, venues } = initialData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tour = buildFromDB(teams as any, tournamentTeams as any, matches as any, venues as any);
    useTournamentStore.getState().setTour(tour, true);
    rawRef.current = initialData;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Realtime subscription for live score updates ----
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

    const rebuild = () => {
      if (!rawRef.current) return;
      const { teams, tournamentTeams, matches, venues } = rawRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tour = buildFromDB(teams as any, tournamentTeams as any, matches as any, venues as any);
      useTournamentStore.getState().setTour(tour, true);
    };

    const channel = supabase
      .channel('matches-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
        if (!rawRef.current || !payload.new || !('id' in payload.new)) return;
        const updated = payload.new as DBMatch;
        rawRef.current = {
          ...rawRef.current,
          matches: rawRef.current.matches.map((m) => (m.id === updated.id ? updated : m)),
        };
        rebuild();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ---- Clock: snap to real time on mount and advance every 30s while live ----
  const isLive = useTournamentStore((s) => s.isLive);
  useEffect(() => {
    if (!isLive) return;
    const { setNowDay } = useTournamentStore.getState();
    const tick = () => {
      const { tour } = useTournamentStore.getState();
      setNowDay(Math.min(39, (Date.now() - tour.DAY0) / tour.DAYMS));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [isLive]);

  // ---- Clock: play animation ----
  const playing = useTournamentStore((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    const { setNowDay, setPlaying } = useTournamentStore.getState();
    const id = setInterval(() => {
      setNowDay((d) => {
        const nd = d + 0.3;
        if (nd >= 39) {
          setPlaying(false);
          return 39;
        }
        return nd;
      });
    }, 80);
    return () => clearInterval(id);
  }, [playing]);
}
