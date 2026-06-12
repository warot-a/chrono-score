'use client';

import { useEffect, useRef } from 'react';
import { buildFromDB } from '@/lib/realData';
import { supabase, DBMatch } from '@/lib/supabase';
import { useTournamentStore } from '@/store/tournamentStore';

const SLUG = 'worldcup-2026';

/**
 * Single source of side effects for the tournament:
 *   1. Rehydrates the persisted clock position (store uses skipHydration).
 *   2. Fetches match data from /api/matches and subscribes to Supabase Realtime.
 *   3. Drives the clock — snap-to-realtime while live, and the play animation.
 *
 * Mount this exactly once, in the route group shell.
 */
export function useTournamentSync(): void {
  const rawRef = useRef<{
    teams: unknown[];
    tournamentTeams: unknown[];
    matches: DBMatch[];
    venues: unknown[];
  } | null>(null);

  // ---- Rehydrate persisted clock, defaulting to "now" when none saved ----
  useEffect(() => {
    const hadSaved = !!localStorage.getItem('wc_now');
    useTournamentStore.persist.rehydrate();
    if (!hadSaved) {
      const { tour, setNowDay } = useTournamentStore.getState();
      setNowDay(Math.min(39, Math.max(0, (Date.now() - tour.DAY0) / tour.DAYMS)));
    }
  }, []);

  // ---- Data: initial fetch + Realtime subscription ----
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return;
    }
    let cancelled = false;

    const rebuild = () => {
      if (!rawRef.current) {
        return;
      }
      const { teams, tournamentTeams, matches, venues } = rawRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tour = buildFromDB(teams as any, tournamentTeams as any, matches as any, venues as any);
      useTournamentStore.getState().setTour(tour, true);
    };

    async function load() {
      try {
        const res = await fetch(`/api/matches?slug=${SLUG}`);
        if (!res.ok) {
          throw new Error('API error');
        }
        const data = await res.json();
        if (cancelled) {
          return;
        }
        rawRef.current = data;
        rebuild();
      } catch {
        if (!cancelled) {
          useTournamentStore.getState().setLoading(false);
        }
      }
    }

    load();

    const channel = supabase
      .channel('matches-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
        if (!rawRef.current || !payload.new || !('id' in payload.new)) {
          return;
        }
        const updated = payload.new as DBMatch;
        rawRef.current = {
          ...rawRef.current,
          matches: rawRef.current.matches.map((m) => (m.id === updated.id ? updated : m)),
        };
        rebuild();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // ---- Clock: snap to real time on mount and advance every 30s while live ----
  const isLive = useTournamentStore((s) => s.isLive);
  useEffect(() => {
    if (!isLive) {
      return;
    }
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
    if (!playing) {
      return;
    }
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
