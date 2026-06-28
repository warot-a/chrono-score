# Repository Guidelines

## Project Structure & Module Organization

`chrono-score` is a Next.js 16 app for the World Cup 2026 simulator. App routes live in `src/app/`, including API routes under `src/app/api/` and World Cup pages under `src/app/(worldcup)/`. Shared logic lives in `src/lib/`: `engine.ts` contains the deterministic tournament engine, `util.tsx` contains derived match and standings helpers, and `supabase.ts` contains database clients and row types. UI components are grouped in `src/components/WorldCup/`, client state lives in `src/store/`, and hooks live in `src/hooks/`. Global styles are in `src/app/globals.css`; static assets are in `public/`. Supabase schema and seed data are in `supabase/migrations/`. Bruno API collections are in `bruno/`.

## Build, Test, and Development Commands

Use pnpm for all package scripts.

- `pnpm dev` starts the local Next.js development server.
- `pnpm build` creates a production build and validates route compilation.
- `pnpm start` runs the built app.
- `pnpm lint` runs ESLint.
- `pnpm lint:fix` applies ESLint autofixes.
- `pnpm format` formats the repository with Prettier.

## Coding Style & Naming Conventions

Use TypeScript, React 19, and App Router conventions. Follow 2-space indentation, single quotes, and curly braces for all `if`/`else` bodies. Prefer named exports; use default exports only where Next.js requires them for pages and layouts. Import React hooks and types directly, for example `import { useMemo } from 'react'`. Keep components in PascalCase, hooks prefixed with `use`, and utility functions in camelCase. Place World Cup-specific components under `src/components/WorldCup/`.

## Testing Guidelines

No automated test suite is configured yet. Before opening a PR, run `pnpm lint` and `pnpm build`. For engine or standings changes, manually verify schedule, standings, and bracket views in `pnpm dev`. If tests are added later, colocate focused unit tests near the code they cover and name them after the behavior under test, for example `engine.group-standings.test.ts`.

## Commit & Pull Request Guidelines

Git history uses mostly Conventional Commits, such as `feat: display live matches`, `fix(sync): guard team ID overwrites`, and `refactor: update upcoming match display`. Keep messages imperative and scoped when helpful. Pull requests should include a short summary, testing performed, linked issues when applicable, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Keep service-role Supabase access server-only through `supabaseAdmin()`. Do not commit secrets or local environment files. Public Supabase values must use `NEXT_PUBLIC_` only when they are safe for browser exposure.
