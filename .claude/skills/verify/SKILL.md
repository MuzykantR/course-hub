---
name: verify
description: Full verification gate for course-hub — typecheck, lint, unit tests, production build, then a smoke pass in the built-in browser. Run before every commit/PR and at the end of each stage.
---

# /verify

Run the gate in order and stop at the first failure; fix it, then restart from that step.

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`
5. Smoke in the built-in browser (`preview_start` name `course-hub`, port 3000):
   - `/login` renders; wrong password shows an error; unauthenticated `/`, `/kb`, `/admin` redirect to `/login`.
   - After student login: `/`, `/kb`, one lesson, one task, one report render without console errors (`read_console_messages` onlyErrors).
   - Student session cannot open `/admin`.
   - Toggle theme: light and dark both readable.
   - `resize_window` preset `mobile`: no horizontal scroll on `/` and `/kb`; reset to `desktop` afterwards.
     Skip sub-checks for pages that don't exist yet in the current stage, and say which were skipped.
6. If migrations changed: run Supabase advisors (security + performance) via the Supabase MCP and report findings.

Report a short table: step → pass/fail/skipped, plus any console errors found.
Never enter real passwords in the browser — use the test values from `.env.example` / `supabase/seed.sql`.
