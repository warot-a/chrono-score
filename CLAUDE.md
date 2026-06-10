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

## Architecture

**chrono-score** is a single-page Next.js 16 app that simulates the FIFA World Cup 2026 tournament. There are no backend routes or database — everything is computed deterministically client-side.

### Core data flow

`src/lib/engine.ts` — the entire tournament engine. Call `build(seed)` with an integer seed to deterministically simulate all 104 matches (group stage + knockout). Returns a `Tournament` object containing teams, groups, match results, standings, knockout bracket, and utility functions (`ts`, `dstr`, `tstr`). The engine uses a seeded PRNG + Poisson goal model.

`src/lib/util.tsx` — pure helpers that derive *time-relative* views from a `Tournament`. Key exports:
- `matchView(tour, match, nowTs)` — returns live/played/upcoming state and resolved team codes for a match, given the current simulated timestamp
- `liveStandings(tour, g, now)` — standings for group `g` considering only matches played so far
- `phaseForDay(nowDay)` — returns `[shortLabel, longLabel]` for the current tournament phase

`src/app/page.tsx` — mounts `<WorldCupApp seed={3} />`. Change the seed here to get a different tournament outcome.

### Component tree

```
WorldCupApp          — clock bar, tab nav, "now" slider state
  ├── ScheduleView   — match list grouped by date/round
  ├── StandingsView  — 12 group cards + best-thirds table
  └── BracketView    — knockout bracket visualisation
```

`WorldCupApp` holds the two key pieces of state: `tab` (active view) and `nowDay` (a float 0–39 representing days elapsed since Jun 11, 2026). Both are persisted to `localStorage`. A "play" button animates `nowDay` forward, simulating the tournament unfolding in real time. `nowTs` (a UTC millisecond timestamp) is derived from `nowDay` and passed down to all views.

### Styling

All styles live in `src/app/globals.css` (Tailwind v4 + custom CSS variables). Fonts are Anton (display/headings) and Archivo (body), loaded via `next/font/google`.
