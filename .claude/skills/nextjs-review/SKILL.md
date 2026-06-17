---
name: nextjs-review
description: Spawns a subagent to do a focused code review of Next.js files or the current diff, covering performance, security, code quality, and Next.js patterns. Reports findings grouped by severity (critical / warning / suggestion) with file:line references — does not auto-fix. Use when the user says "review", "code review", "check my Next.js", or asks for feedback on Next.js code.
---

# Next.js Code Review

## Quick start

Review current branch changes:

```
/nextjs-review
```

Target specific files or directory:

```
/nextjs-review src/components/WorldCup/
```

## Project context (chrono-score)

Key architecture to be aware of when reviewing:

- **Engine**: `src/lib/engine.ts` — deterministic PRNG simulation, no side effects
- **Data flow**: `useTournament.ts` → Supabase Realtime → component tree
- **Component tree**: `WorldCupApp` → `ScheduleView` / `StandingsView` / `BracketView`
- **Styling**: Tailwind v4 + custom CSS variables in `globals.css` — do NOT replace inline styles with Tailwind classes
- **Fonts**: Anton (headings) + Archivo (body) via `next/font/google`

## What gets checked

| Area                 | Key checks                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Performance**      | `next/image` usage, unnecessary `use client`, missing `Suspense`, unoptimised data fetching, bundle imports            |
| **Security**         | Exposed env vars in client components, missing auth guards on API routes, unvalidated input, `dangerouslySetInnerHTML` |
| **Code quality**     | Hook rules, TypeScript strictness, component size, naming consistency, dead code                                       |
| **Next.js patterns** | App Router conventions, Server vs Client Component split, `fetch` caching, metadata API                                |

## Workflow

1. Determine scope — diff, specific paths, or `src/`
2. Spawn subagent with review prompt below
3. Present findings grouped by severity

## Subagent prompt

```
You are a Next.js code reviewer for the chrono-score project (FIFA World Cup 2026 simulator).

Architecture context:
- Next.js 16, App Router, Tailwind v4
- Engine in src/lib/engine.ts runs deterministically client-side
- Supabase Realtime for live score updates
- Components in src/components/WorldCup/
- Styling: inline styles are intentional — do NOT flag them as issues

Review the following for:
- Performance: image optimisation, bundle size, SSR/CSR split, caching
- Security: auth, API routes, env vars, input validation
- Code quality: component structure, hooks, TypeScript, naming
- Next.js patterns: App Router, Server Components, data fetching, metadata

SCOPE: {{files or diff}}

Output — group under three severity headers:

### Critical
Bugs, security holes, or major perf regressions.
- [file:line] **Issue** — explanation + recommended fix

### Warning
Best practice violations or maintainability concerns.
- [file:line] **Issue** — explanation + recommendation

### Suggestion
Minor improvements or optional optimisations.
- [file:line] **Issue** — explanation

End with: X critical, Y warnings, Z suggestions.
Do NOT apply any fixes.
```

## Scope resolution

- No args → `git diff main...HEAD`
- Path arg → all `.ts`/`.tsx` under that path
- Empty diff → fall back to `git diff HEAD~1`
