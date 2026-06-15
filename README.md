# chrono-score

![GitHub release](https://img.shields.io/github/v/release/warot-a/chrono-score)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-green?logo=supabase)

A single-page Next.js app that simulates the FIFA World Cup 2026 tournament. The tournament engine runs deterministically from a seed value using a seeded PRNG + Poisson goal model, with real-time data sync backed by Supabase.

## Features

- Simulates all 104 matches (group stage + knockout bracket)
- Time-travel slider: scrub through the tournament day by day
- Live standings that update as matches are "played"
- Schedule, Standings, and Bracket views
- State (current tab + day) persisted to `localStorage`

## Getting Started

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Without Supabase env vars configured, the app falls back to a seeded simulation (seed `3`). To change the fallback seed, edit `FALLBACK_SEED` in `src/hooks/useTournament.ts`.

## Commands

```bash
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm lint     # ESLint
```

## Architecture

### Core modules

- **`src/lib/engine.ts`** — tournament engine. `build(seed)` returns a fully-simulated `Tournament` with all matches, standings, and knockout results.
- **`src/lib/util.tsx`** — time-relative helpers: `matchView`, `liveStandings`, `phaseForDay`.
- **`src/hooks/useTournament.ts`** — fetches data from `/api/matches`, subscribes to Supabase Realtime for live score updates, and falls back to `build(FALLBACK_SEED)` if Supabase isn't configured.
- **`src/app/page.tsx`** — entry point, mounts `<WorldCupApp />`.

### Component tree

```
WorldCupApp          — clock bar, tab nav, delegates clock state to useClockState
  ├── ScheduleView   — match list grouped by date/round
  ├── StandingsView  — 12 group cards + best-thirds table
  └── BracketView    — knockout bracket visualisation
```

### Styling

Tailwind v4 + custom CSS variables in `src/app/globals.css`. Fonts: Anton (headings) and Archivo (body) via `next/font/google`.

## Tech Stack

- [Next.js 16](https://nextjs.org)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) (Postgres + Realtime)
- TypeScript
