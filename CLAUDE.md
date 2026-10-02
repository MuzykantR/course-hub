# course-hub — Python HSE Hub

Closed course site: lessons, seminar tasks, student solutions, library reports. Students read and
propose content; the teacher manages everything and moderates proposals.
Full plan: `C:\Users\rodio\.claude\plans\hazy-orbiting-shannon.md`. UI copy is Russian.

## Commands

- `npm run dev` — dev server on :3000 (built-in browser: `preview_start` name `course-hub`)
- `npm run typecheck` · `npm run lint` · `npm test` (Vitest, `tests/unit/**/*.test.ts`, node env) · `npm run build`
- `npm run test:e2e` — Playwright against the dev server + hse-dev; creates/removes its own `e2e-group` data.
  Env is loaded in `tests/e2e/db.ts`, never in `playwright.config.ts` (it would mangle the bcrypt hash in the
  spawned dev server). Scope alert locators to `main` (Next's route announcer is also `role=alert`).
- `npx tsx scripts/init-settings.ts '<course pw>'` — creates the `settings` row on a fresh DB (prod never runs seed.sql).
- Single test: `npx vitest run tests/unit/cn.test.ts` (or `-t '<name>'`). Imports use the `@/` alias → repo root.
- Formatting: a PostToolUse hook (`.claude/hooks/format.mjs`) runs Prettier on every edited file — don't hand-format.
- `/verify` — project skill running the whole gate + browser smoke. Run before every commit.
- `npx tsx scripts/import-reports.ts <folder> --group <slug> [--dry-run]` — bulk-import Markdown reports
  (front matter, authors matched by name, sibling images uploaded). Always `--dry-run` first.
- `node scripts/hash-password.mjs '<pw>'` — bcrypt hash for env/settings (prints the `\$`-escaped
  `.env.local` line: Next.js expands `$` in .env files, an unescaped hash loads as empty)
- Supabase dev project `hse-dev`, ref `zysycnawewufesrarjgo` (eu-central-1). Apply migrations via MCP
  `apply_migration`, then rename the local file to the version from `list_migrations`.
  `supabase/seed.sql` is dev-only (course password `python-dev`).
- Supabase prod project `hse-prod`, ref `ikwbtmijumqxtiidhgtx` (eu-central-1): same migrations applied (its
  versions are apply timestamps, SQL identical), settings row created, **never run seed.sql there**.
  Local GitHub export goes to branch `dev-export-test` of `MuzykantR/python-hse-course`; prod (Vercel) uses `main`.

## Stack

Next.js 15 App Router · React 19 · TypeScript (strict) · Tailwind 3 · Supabase (Postgres + Storage) ·
zod · jose (JWT cookie sessions) · bcryptjs · unified (remark-gfm/math → rehype-katex) · Shiki ·
Pyodide in a Web Worker. Deployed on Vercel from GitHub (`main` → prod, PRs → previews).

## Architecture rules (non-negotiable)

- **DB access is server-only**: Server Components / Server Actions / route handlers via `lib/db/client.ts`
  (`import 'server-only'`, service-role key). Never create a browser Supabase client, never expose
  keys with `NEXT_PUBLIC_`. RLS is enabled on every table with no policies (deny-by-default).
- **Every mutation** = Server Action that (1) checks the session with a guard from `lib/auth/guards.ts`,
  (2) parses input with a zod schema from `lib/validation`, (3) applies rate limits from
  `lib/ratelimit.ts` for student actions, (4) writes `audit_log` via `lib/audit.ts`.
- **Auth layers**: `middleware.ts` only checks the JWT signature (edge, no DB). Student sessions are
  invalidated by `settings.pwd_version`, which only `lib/auth/guards.ts` checks — so **every page and
  action calls a guard itself** (`requireSession/Teacher/Student/IdentifiedStudent`); layouts don't
  re-run on client navigation. PIN attempts are counted atomically in SQL (`pin_attempt_begin`).
- **Markdown** from users is rendered without raw HTML — never add `rehype-raw` or `allowDangerousHtml`.
  Pipeline: `lib/markdown/pipeline.ts` (md → hast, heading ids + TOC, link/image URL policy;
  relative images resolve only under an `assetBase` like `/api/assets/reports/<id>`) →
  `components/markdown/Markdown.tsx` (hast → React). Code blocks: server-only Shiki in
  `components/code/CodeBlock.tsx`. Markdown images sit inside `<p>` — wrap them only in `<span>`.
- **Admin forms** (`app/admin/**`): server action `(prev: FormState, fd) => FormState` → `requireTeacher()`
  first (actions are callable by ID from any page, the middleware doesn't protect them) → `parseForm(schema, fd)`
  from `lib/forms.ts` → write → `audit()` → `redirect`/`revalidatePath`. Client forms use `useActionState`,
  `valueOf/valuesOf/checkedOf` for defaults and `<form key={formKey(state)}>` — React 19 resets forms after
  an action and `<select defaultValue>` would otherwise snap back. Teacher-only reads live in
  `lib/db/queries/admin.ts`. Content hashes (`lib/hash.ts`) back the unique constraints on solutions/reports.
- **Student submissions** (`app/(site)/submit/actions.ts`): `requireIdentifiedStudent()` → zod → honeypot
  (`website` field; fake success) → `submissionPrecheck` (submissions open, student not blocked, ≤ 3 pending)
  → `reserveSubmissionSlots` (60 s cooldown, 10/day per student, 20/day per IP; all-or-nothing) → insert as
  `pending` with a content hash → audit. Moderation (`app/admin/moderation`) updates only rows still `pending`.
  Report images of unpublished reports are visible to the teacher and the report's authors only, `no-store`.
- **Python runner** (`lib/python/*`, `components/code/PyRunner.tsx`): Pyodide (CDN, ESM) in a Web Worker,
  10 s budget → worker terminated and recreated. Next bundles workers as *classic* scripts, so the worker
  shadows `importScripts` and loads Pyodide via `import()`. Network APIs are locked while user code runs
  (published solutions execute in the viewer's browser). Task tests live in `tasks.tests` (`lib/python/protocol.ts`).
- **GitHub export** (`lib/github/*`): any change to published content calls `scheduleExport()` (runs via
  `after()`), which rebuilds the whole export repo from the DB as one commit (`layout.ts` is pure/tested).
  Needs `GITHUB_EXPORT_TOKEN` + `GITHUB_EXPORT_REPO` and the settings toggle; status shows on /admin/settings.
- **Read queries** (`lib/db/queries/`) return only published content: tasks with status ≠ draft,
  approved solutions/reports. Keep draft/pending visibility for admin queries.
- **Schema changes only via migration files** in `supabase/migrations/`; regenerate
  `lib/db/types.gen.ts` afterwards; run Supabase advisors.
- Secrets live in `.env.local` / Vercel env (never committed; Claude may read `.env.local` to debug config).
  `.env.example` lists every variable; its `DEV_COURSE_PASSWORD` (and `supabase/seed.sql`) are the only
  credentials to use in browser tests.

## Layout

Current state: scaffold only (`app/layout.tsx`, `app/page.tsx`, theme toggle, `lib/cn.ts`, `lib/theme.ts`,
empty `supabase/migrations/`). The paths below are the **target** layout from the plan — create them
there rather than inventing new locations.

- `app/(site)/…` student-facing pages · `app/admin/…` teacher area · `app/login` · `app/api/assets`
- `components/ui` neo-brutalist primitives · `components/markdown` · `components/code` · `components/kb` · `components/layout`
- `lib/auth` · `lib/db` · `lib/validation` · `lib/python` · `lib/github`
- `middleware.ts` — redirects unauthenticated requests to `/login`

## Design system (ported from `../web_course`)

Tokens in `app/globals.css` (`:root` / `.dark`), exposed as Tailwind `theme.*` colors
(`bg-theme-card`, `border-theme-border`, `text-theme-muted`, `bg-theme-accent` = HSE yellow `#FED554`).
Palette = HSE University brand book colors only (navy `#0F2D69` for borders/text/shadows, blue `#374B9B`); never
HSE logos or brand graphics. Status colors: `success|danger|warning|info-{50…950}` and `hse.*` in
`tailwind.config.mjs` — don't use raw Tailwind palettes (emerald, rose…). Text on white: ≥ 700 (warning ≥ 800).
Neo-brutalism: 2px `border-theme-border`, `shadow-neo-sm|neo|neo-lg`, `rounded-card|card-lg|pill`.
Dark mode = `.dark` class on `<html>` (set pre-hydration by `lib/theme.ts`). Check both themes
and mobile width for every UI change.

## Workflow

Branch `stage-N` → implement → `/verify` → `/code-review` → commit → PR → Vercel preview → user
checks → merge. `/security-review` before merging anything touching auth, submissions or uploads.
