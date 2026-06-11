# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start dev server (Next.js)
pnpm build      # Production build
pnpm lint       # ESLint
```

No test suite is set up yet.

## Coding Style

- 2-space indentation
- Single quotes
- Named exports (no default exports except Next.js pages/layouts)
- Curly braces even for single-line `if`/`else` bodies
- Import React hooks and types as named imports: `import { useState, useEffect } from 'react'` instead of `React.useState`

## Architecture

**chrono-score** is a single-page Next.js 16 app that simulates the FIFA World Cup 2026 tournament. The tournament engine runs deterministically client-side, but match data and real-time updates are backed by **Supabase** (Postgres + Realtime).

### Database

`supabase/migrations/001_schema.sql` — defines tables: `sports`, `tournaments`, `teams`, `venues`, `tournament_teams`, `matches`. All tables have RLS enabled with public read access. `matches` uses `REPLICA IDENTITY FULL` for Realtime UPDATE events.

`supabase/migrations/002_seed_wc2026.sql` — seeds World Cup 2026 data.

`src/lib/supabase.ts` — exports `supabase` (anon client, browser/RSC) and `supabaseAdmin()` (service-role client, server-only for `/api/sync`). Also exports row types: `DBMatch`, `DBTeam`, `DBVenue`, `DBTournamentTeam`.

### Core data flow

`src/lib/engine.ts` — the entire tournament engine. Call `build(seed)` with an integer seed to deterministically simulate all 104 matches (group stage + knockout). Returns a `Tournament` object containing teams, groups, match results, standings, knockout bracket, and utility functions (`ts`, `dstr`, `tstr`). The engine uses a seeded PRNG + Poisson goal model.

`src/lib/util.tsx` — pure helpers that derive _time-relative_ views from a `Tournament`. Key exports:

- `matchView(tour, match, nowTs)` — returns live/played/upcoming state and resolved team codes for a match, given the current simulated timestamp
- `liveStandings(tour, g, now)` — standings for group `g` considering only matches played so far
- `phaseForDay(nowDay)` — returns `[shortLabel, longLabel]` for the current tournament phase

`src/hooks/useTournament.ts` — fetches match data from `/api/matches?slug=worldcup-2026`, then subscribes to Supabase Realtime for live score updates. Falls back to `build(FALLBACK_SEED)` (seed `3`) when `NEXT_PUBLIC_SUPABASE_URL` is not set. Returns `{ tour, isLive, loading }`.

`src/app/page.tsx` — entry point, mounts `<WorldCupApp />` (no props). To change the fallback seed, edit `FALLBACK_SEED` in `useTournament.ts`.

### Component tree

Components live in `src/components/WorldCup/`.

```
WorldCupApp          — clock bar, tab nav, "now" slider state
  ├── ScheduleView   — match list grouped by date/round
  ├── StandingsView  — 12 group cards + best-thirds table
  └── BracketView    — knockout bracket visualisation
```

`WorldCupApp` holds the two key pieces of state: `tab` (active view) and `nowDay` (a float 0–39 representing days elapsed since Jun 11, 2026). Both are persisted to `localStorage`. A "play" button animates `nowDay` forward. When `isLive` is true, the clock auto-syncs to real time every 30 s. `nowTs` (a UTC millisecond timestamp) is derived from `nowDay` and passed down to all views.

### Styling

All styles live in `src/app/globals.css` (Tailwind v4 + custom CSS variables). Fonts are Anton (display/headings) and Archivo (body), loaded via `next/font/google`.
