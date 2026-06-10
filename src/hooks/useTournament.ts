"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Tournament } from "@/lib/engine";
import { build } from "@/lib/engine";
import { buildFromDB } from "@/lib/realData";
import { supabase, DBMatch } from "@/lib/supabase";

const SLUG = "worldcup-2026";
const FALLBACK_SEED = 3;

interface TournamentState {
  tour: Tournament;
  /** true = data is coming from Supabase; false = simulation fallback */
  isLive: boolean;
  loading: boolean;
}

/**
 * Fetches tournament data from /api/matches, then subscribes to Supabase
 * Realtime for live score updates.
 *
 * Falls back to the seeded simulation if the env vars aren't configured
 * (useful in local dev without a Supabase project).
 */
export function useTournament(): TournamentState {
  const [state, setState] = useState<TournamentState>(() => ({
    tour: build(FALLBACK_SEED),
    isLive: false,
    loading: true,
  }));

  // Store raw DB payloads so we can re-build Tournament on Realtime updates
  const rawRef = useRef<{
    teams: unknown[];
    tournamentTeams: unknown[];
    matches: DBMatch[];
    venues: unknown[];
  } | null>(null);

  const rebuildFromRaw = useCallback(() => {
    if (!rawRef.current) return;
    const { teams, tournamentTeams, matches, venues } = rawRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tour = buildFromDB(
      teams as any,
      tournamentTeams as any,
      matches as any,
      venues as any,
    );
    setState({ tour, isLive: true, loading: false });
  }, []);

  useEffect(() => {
    // Skip if Supabase isn't configured (local dev without .env.local)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/matches?slug=${SLUG}`);
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (cancelled) return;
        rawRef.current = data;
        rebuildFromRaw();
      } catch {
        // Supabase not set up yet — keep simulation
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    }

    load();

    // Subscribe to Realtime match updates
    const channel = supabase
      .channel("matches-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload) => {
          if (!rawRef.current) return;
          const updated = payload.new as DBMatch;
          rawRef.current = {
            ...rawRef.current,
            matches: rawRef.current.matches.map((m) =>
              m.id === updated.id ? updated : m,
            ),
          };
          rebuildFromRaw();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [rebuildFromRaw]);

  return state;
}
