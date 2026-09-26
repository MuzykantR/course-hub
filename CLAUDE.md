# course-hub — Python HSE Hub

Closed course site: lessons, seminar tasks, student solutions, library reports. Students read and
propose content; the teacher manages everything and moderates proposals.
Full plan: `C:\Users\rodio\.claude\plans\hazy-orbiting-shannon.md`. UI copy is Russian.

## Commands

- `npm run dev` — dev server on :3000 (built-in browser: `preview_start` name `course-hub`)
- `npm run typecheck` · `npm run lint` · `npm test` (Vitest, `tests/unit`) · `npm run build`
- `/verify` — project skill running the whole gate + browser smoke. Run before every commit.
- `node scripts/hash-password.mjs '<pw>'` — bcrypt hash for env/settings

## Stack

Next.js 15 App Router · React 19 · TypeScript (strict) · Tailwind 3 · Supabase (Postgres + Storage) ·
zod · jose (JWT cookie sessions) · bcryptjs · react-markdown + remark-gfm/math + rehype-katex · Shiki ·
Pyodide in a Web Worker. Deployed on Vercel from GitHub (`main` → prod, PRs → previews).

## Architecture rules (non-negotiable)

- **DB access is server-only**: Server Components / Server Actions / route handlers via `lib/db/client.ts`
  (`import 'server-only'`, service-role key). Never create a browser Supabase client, never expose
  keys with `NEXT_PUBLIC_`. RLS is enabled on every table with no policies (deny-by-default).
- **Every mutation** = Server Action that (1) checks the session with a guard from `lib/auth/guards.ts`,
  (2) parses input with a zod schema from `lib/validation`, (3) applies rate limits from
  `lib/ratelimit.ts` for student actions, (4) writes `audit_log` via `lib/audit.ts`.
- **Markdown** from users is rendered without raw HTML — never add `rehype-raw`.
- **Schema changes only via migration files** in `supabase/migrations/`; regenerate
  `lib/db/types.gen.ts` afterwards; run Supabase advisors.
- Secrets live in `.env.local` / Vercel env; Claude does not read `.env*` files (denied in settings).

## Layout

- `app/(site)/…` student-facing pages · `app/admin/…` teacher area · `app/login` · `app/api/assets`
- `components/ui` neo-brutalist primitives · `components/markdown` · `components/code` · `components/kb` · `components/layout`
- `lib/auth` · `lib/db` · `lib/validation` · `lib/python` · `lib/github`
- `middleware.ts` — redirects unauthenticated requests to `/login`

## Design system (ported from `../web_course`)

Tokens in `app/globals.css` (`:root` / `.dark`), exposed as Tailwind `theme.*` colors
(`bg-theme-card`, `border-theme-border`, `text-theme-muted`, `bg-theme-accent` = lime `#B9FF66`).
Neo-brutalism: 2px `border-theme-border`, `shadow-neo-sm|neo|neo-lg`, `rounded-card|card-lg|pill`.
Dark mode = `.dark` class on `<html>` (set pre-hydration by `lib/theme.ts`). Check both themes
and mobile width for every UI change.

## Workflow

Branch `stage-N` → implement → `/verify` → `/code-review` → commit → PR → Vercel preview → user
checks → merge. `/security-review` before merging anything touching auth, submissions or uploads.
