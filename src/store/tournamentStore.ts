import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Tournament, build } from '@/lib/engine';

const FALLBACK_SEED = 3;

interface TournamentStore {
  tour: Tournament;
  /** true = data is coming from Supabase; false = simulation fallback */
  isLive: boolean;
  loading: boolean;
  nowDay: number;
  playing: boolean;

  setTour: (tour: Tournament, isLive: boolean) => void;
  setLoading: (loading: boolean) => void;
  setNowDay: (day: number | ((prev: number) => number)) => void;
  setPlaying: (p: boolean | ((prev: boolean) => boolean)) => void;
}

export const useTournamentStore = create<TournamentStore>()(
  persist(
    (set) => ({
      tour: build(FALLBACK_SEED),
      isLive: false,
      loading: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      nowDay: 0,
      playing: false,

      setTour: (tour, isLive) => set({ tour, isLive, loading: false }),
      setLoading: (loading) => set({ loading }),
      setNowDay: (day) => set((s) => ({ nowDay: typeof day === 'function' ? day(s.nowDay) : day })),
      setPlaying: (p) => set((s) => ({ playing: typeof p === 'function' ? p(s.playing) : p })),
    }),
    {
      name: 'wc_now',
      storage: createJSONStorage(() => localStorage),
      // Only persist the clock position; tour/isLive/loading are runtime-derived.
      partialize: (s) => ({ nowDay: s.nowDay }),
      // Avoid SSR/hydration mismatch — rehydrate manually after mount (see useTournamentSync).
      skipHydration: true,
    },
  ),
);

/** Derive the UTC millisecond timestamp for the current clock position. */
export function selectNowTs(s: TournamentStore): number {
  return s.tour.DAY0 + s.nowDay * s.tour.DAYMS;
}
