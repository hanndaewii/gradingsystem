# Faculty Grading Portal

A front-end-only faculty grading portal for two roles (professor, department-head admin) across two semesters and four grading periods per section. Vite 6 + React 18 + TypeScript (strict). All persistence goes through one async `api` layer (`src/api/`) backed by **localStorage**, shaped so every method can later be swapped for a supabase-js call with zero UI changes â€” see `supabase/schema.sql` for the corresponding SQL schema, RLS policies and submitted-period trigger.

## Run it (Windows / PowerShell)

```powershell
npm install
npm run dev        # â†’ http://localhost:5173
npm run build      # type-checks (tsc --noEmit) then bundles with vite
npm run preview    # serves the production build (clean URLs, deep links work)
```

## Demo accounts

Passwords are identical (`demo1234`). The login page has quick-fill chips for all three.

| Label | Email | Password | Role |
|---|---|---|---|
| Dr. Marisol Reyes Â· Admin | `admin@northstate.edu` | `demo1234` | admin (department head) |
| Prof. Antonio Cruz | `acruz@northstate.edu` | `demo1234` | professor |
| Prof. Liza Bautista | `lbautista@northstate.edu` | `demo1234` | professor |

## Dev-only preview pages

Two extra HTML entries exist for development verification (they are **kept** in the repo â€” orchestrator decision; they are not part of `vite build`, which only reads `index.html`, and `tsc` type-checks their modules like every other source file):

- `http://localhost:5173/kit-preview.html` â€” UI kit gallery (design-system primitives in every state, light/dim toggle)
- `http://localhost:5173/seedcheck.html` â€” seed + pure-logic assertion page (seed counts, grading math, CSV parsing, lock rules, api scoping)

`vite build` output contains only the app entry (`dist/index.html` + hashed assets). `npm run preview` serves it with SPA fallback, and routing is a `BrowserRouter` (clean URLs) — on Cloudflare the SPA fallback comes from `not_found_handling = "single-page-application"` in `wrangler.toml`, so deep links such as `/sections/sec-cs101-a` reload correctly.

## Data & storage

| Key | Contents |
|---|---|
| `faculty-portal.db:v3` | the whole demo database (one JSON document) |
| `faculty-portal.session:v1` | signed-in profile id |
| `faculty-portal.theme:v1` | light/dim preference |
| `faculty-portal.term:v1` | selected term preference |

**Reset demo data:** profile modal â†’ "Reset demo data" (asks for confirmation, reseeds, keeps you signed in), or DevTools â†’ Application â†’ Local Storage â†’ delete `faculty-portal.db:v3` and reload (a corrupt or missing doc is reseeded automatically).

## Architecture

```
src/
  main.tsx            entry â€” imports ./styles/index.css FIRST, then App
  App.tsx             provider nesting (Toast â†’ Auth â†’ Term â†’ BrowserRouter) + routes/guards
  types.ts            Â§3.1 domain types + the `Api` interface (Â§3.2) â€” the contract
  api/
    index.ts          the ONLY module pages import: exports the `api` singleton,
                      the Supabase swap recipe, and the dev `window.__dbg` hook
    local.ts          the localStorage implementation (role scoping, ApiError codes,
                      write-through persistence, demo reseed)
  lib/
    grades.ts         ALL grading math (pure): periodGrade, semesterGrade,
                      countCompleteness/buildPeriodProgress, isPeriodEditable,
                      scaleLookup, classAveragePct â€” components never re-derive
                      weighted/period/semester results inline
    format.ts         pure display helpers + DEFAULT_SCALE_TABLE (Â§3.5)
    csv.ts            parseCsv / parseRoster (never throw)
    useAsync.ts       fetch hook with stale/cancellation guards (StrictMode-safe)
    useTheme.ts       light/dim preference (owns faculty-portal.theme:v1)
  data/seed.ts        deterministic demo seed (mulberry32), TERMS, DEMO_ACCOUNTS
  context/            AuthContext, TermContext (term persistence)
  components/ui/      WO-1 primitives (.ui-* classes in styles/components.css)
  components/â€¦        domain components per area (courses / section / admin / layout)
  pages/              LoginPage, ProfessorHome, CoursePage, SectionPage, AdminHome, NotFound
  styles/             tokens â†’ base â†’ components (index.css import order = load order);
                      domain stylesheets use only tokens + their .prof-/.sec-/.adm-/.sh- prefixes
supabase/schema.sql   runnable-later DDL twin: tables, cascade FKs, indexes,
                      RLS policies, submitted-period trigger
```

**Rules that keep the layers honest:** only `src/api/local.ts`, `src/lib/useTheme.ts` and `src/context/TermContext.tsx` touch localStorage (the latter two own UI-pref keys only); pages never import another page's folder (they navigate by URL string); `useToast()` outside the provider throws; every mutation reports through the toast system, and every destructive action runs through a `ConfirmDialog` with concrete counts.

**Backend swap recipe:** implement `Api` from `src/types.ts` 1:1 against supabase-js (schema + RLS in `supabase/schema.sql`), then change the single export line in `src/api/index.ts`. Zero UI changes â€” see "Swapping localStorage for Supabase" below.

## Verified behaviour

Results of the Â§5 acceptance audit (WO-7). "Fixed" marks a gap closed in the final pass.

| Area | Requirement | Result |
|---|---|---|
| Visual | light default + warm-charcoal dim, persisted (`faculty-portal.theme:v1`) | Pass |
| Visual | serif prose, mono numerals/IDs/statuses (`.num`, `.mono-label`) | Pass |
| Visual | hairlines everywhere, no box-shadow, no blue/indigo anywhere | Pass |
| Visual | gold only on ticks / submitted states / focus ring / celebration | Pass (fixed: own-comment highlight de-golded; trace flash chip retained â€” see Deviations) |
| Visual | reduced-motion: durations zeroed, tick draw + flash animation skipped | Pass |
| Hierarchy | AY â†’ Semester â†’ Course â†’ Section â†’ Students/grades; header switcher filters home/course/admin | Pass |
| Hierarchy | four periods everywhere; submit locks only that period | Pass |
| Roles | professor scoped to own courses/sections + own profile; admin read-only + comments | Pass (api-enforced, verified via runtime tests) |
| Roles | email/password login, inline error state, 3 demo quick-fill chips | Pass |
| Period flow | tabs per period; assessments name/max/weight; computed period grade | Pass |
| Period flow | semester grade from configurable weights (default 25Ã—4, Â±0.01 gate) | Pass (epsilon verified) |
| Period flow | percent+letter / 1.0â€“5.0 with editable conversion table + live preview | Pass |
| Period flow | in-order entry, manual unlock, Not started/Draft/Submitted | Pass |
| Pages | login; professor home (hero + submitted-this-week + course grid + empty state); admin home (5 stats + sections table + 3 filters); course page; section page (scroll-spy nav, tabs, roster, assessments, summary, history, discussion); profile modal | Pass |
| CRUD | course create (unique code per professor+semester, inline validation); section create with copy (assessments + roster, new ids, states reset); edit/delete with count-stating confirms | Pass |
| CRUD | assessments add/rename/reorder/remove + graded-removal confirm with live count | Pass |
| CRUD | roster one-at-a-time / paste / CSV with duplicate flagging; removal deletes grades | Pass |
| CRUD | submitted period locked until reopen (enforced in the api, not just the UI) | Pass |
| Interactions | autocommit clamped entry (blur/Enter, Escape reverts, invalid reverts + warn toast) | Pass |
| Interactions | live period + running semester grade (optimistic, no reload needed) | Pass |
| Interactions | checklist auto-check, per-assessment n-of-m counts, gold period tick | Pass (fixed: per-assessment counts added) |
| Interactions | scroll-spy side nav with anchor links | Pass |
| Interactions | CSV import: name-matched columns with remap, applied/skipped report | Pass |
| Interactions | submit gated at 100% + ConfirmDialog; reopen confirmed + recorded in history | Pass |
| Interactions | history tagged by period, clickable oldâ†’new trace with cell flash | Pass |
| Interactions | celebration chime (AudioContext born in the click handler) + longer Finals/semester variant | Pass |
| Interactions | period-tagged comments shared by professor and admin | Pass |
| Supabase readiness | single async api with the full Â§3.2 surface; schema.sql with cascades, indexes, RLS, submitted-trigger; localStorage stands in | Pass |
| Robustness | corrupted/missing/legacy `faculty-portal.db:v3` â†’ reseed (48/48 runtime checks) | Pass |
| Robustness | stale session id â†’ clean logout (verified) | Pass |
| Robustness | `npm run build` clean; `npm run preview` serves with SPA fallback; hash deep links reload | Pass |

### Known deviations (deliberate)

- **No per-cell "Score saved" toast.** Autocommit grade entry is confirmed by the optimistic cell update and the live footers instead â€” a submitted column would otherwise stack one toast per cell. The invalid-input warn toast, the save-failure toast and all other mutation toasts remain.
- **History rows carry no actor names.** The pinned `Api` surface has no profile-name lookup (adding one purely for display would extend the Â§3.2 contract), so rows show the kindÂ·period tag; history tracing and oldâ†’new transitions are unaffected.
- **The history-trace flash + "85 â†’ 92" chip use the gold wash.** The locked palette reserves gold for ticks/submitted; the trace chip is the one accepted extension (a momentary "scored change" marker, not chrome).
- **`kit-preview.html` / `seedcheck.html` ship in the repo** (orchestrator decision) â€” dev-only, excluded from the build.

## Feature map

- **Roles** â€” professors see and edit only their own courses/sections; the admin reads everything (both semesters) and may only write comments and their own profile.
- **Hierarchy** â€” Academic Year â†’ Semester â†’ Course â†’ Section â†’ Students/grades. The header switcher filters every view; AY 2026-2027 is intentionally empty so the "add your first course" empty state is reachable.
- **Periods** â€” Prelim / Midterm / Semi-finals / Finals per section, each with its own assessments, roster, status (Not started / Draft / Submitted) and submit/reopen flow. Submitting locks only that period (server-enforced in the api layer, not just the UI).
- **Grading math** â€” a period grade is weighted when any assessment has a weight > 0, otherwise an equal-weight average; missing scores count as 0 (provisional). The semester grade = Î£(period weight Ã— period grade) / Î£(period weights over periods that have assessments). Weights must total 100 (Â± 0.01).
- **Scales** â€” per-section display as percent+letter or Philippine 1.0â€“5.0, with an editable conversion table (default in `src/lib/format.ts` â†’ `DEFAULT_SCALE_TABLE`).
- **In-order entry** â€” by default each period unlocks when the previous one is submitted; `enforceOrder` can be turned off per section, and individual periods can be manually unlocked.
- **CSV** â€” roster paste/import and per-period grade import (see formats below).
- **History & discussion** â€” every grade change, submit, reopen and CSV import is recorded; a per-section comment thread is shared between professor and admin (the admin's main write path).

### CSV formats

Roster paste (tab or comma, either column order, one student per line). The Student ID is optional â€” students added without one get an auto-generated `AUTO-####` number, and the roster table hides the ID column when nobody has a real one:

```
Anna Cruz	2023-10457
2024-00123,Jose Santos
Maria Reyes
```

Grade import (first column = Student ID or name, remaining columns matched to the period's assessments by name):

```csv
Student ID,Quiz 1,Problem Set
2023-10457,18,42
2024-00123,15,38
```

The import preview lets you remap or ignore columns; unmatched rows are skipped and reported (`applied` / `skipped`).

## Swapping localStorage for Supabase

1. `npm i @supabase/supabase-js`
2. Run `supabase/schema.sql` in your project (tables, indexes, RLS policies, submitted-period trigger).
3. Create `src/api/supabase.ts` implementing the `Api` interface from `src/types.ts` 1:1 â€” one method per table call, throwing `ApiError` with the same codes (`PERIOD_SUBMITTED`, `DUPLICATE_CODE`, `WEIGHTS_NOT_100`, `INCOMPLETE`, `NOT_FOUND`, `BAD_CREDENTIALS`, `FORBIDDEN`).
4. Change the single export line in `src/api/index.ts` from `createLocalApi()` to your new factory. No UI code changes.

Nothing outside `src/api/` imports the localStorage backend, and no page touches localStorage directly.

## Caveats (demo-only, deliberate)

- **Passwords are stored in plaintext** inside `localStorage` (`faculty-portal.db:v3`). This is acceptable only because the app is a front-end demo with pinned demo accounts; the Supabase schema deliberately has no password column (Supabase Auth owns credentials).
- **RLS is documented, not enforced, client-side.** The policies in `supabase/schema.sql` describe the intended server-side enforcement. In the localStorage demo, role scoping is enforced only inside `src/api/local.ts` â€” there is no real security boundary.
- All data lives in one browser profile's localStorage; there is no cross-device or multi-tab sync guarantee beyond the browser's own `storage` event behaviour (not relied upon).

## Launching on Cloudflare Pages

The portal deploys as a static site on Cloudflare (a Workers project with static assets, `name = "gradingsystem"`) with clean URLs (`BrowserRouter`; the `not_found_handling = "single-page-application"` SPA fallback serves deep links like `/sections/<id>`).

**Project settings (Dashboard → Workers & Pages → Create → Pages → Connect to Git):**

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

**Environment variables (Settings → Environment variables, set for Production *and* Preview):**

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | your project URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | the publishable anon key |

> **Warning:** `SUPABASE_SECRET_KEY` and `DATABASE_URL` must NEVER be set as Pages build variables. Anything prefixed `VITE_` is baked into the public bundle and readable by every visitor — those two credentials are server-side only and belong exclusively in your local `.env` for `scripts/*`.

**One Dashboard step still required in Supabase:** Project Settings → API → Exposed schemas → add `faculty` (our tables live in a dedicated `faculty` Postgres schema; without this the REST endpoints return 404).

**Local setup against your Supabase project** (run from the repo root, with `VITE_SUPABASE_URL` / anon key / secret in `.env`):

```powershell
node --env-file=.env scripts/apply-schema.mjs     # create tables, RLS, trigger
node --env-file=.env scripts/seed-supabase.mjs    # seed demo courses/sections
```

**Commands:**

```powershell
npm run dev       # dev server (localStorage demo when the VITE_ vars are absent)
npm run build     # type-checks (tsc --noEmit) then bundles to dist/
npm run preview   # serves the production build locally
```

The `gradingsystem` project is a Cloudflare **Workers** project with static assets, published with `npm run deploy` (see `scripts/deploy.mjs` → `wrangler deploy`). `wrangler.toml` points it at the build output (`[assets] directory = "./dist"`) and enables the SPA fallback (`not_found_handling = "single-page-application"`) so clean deep links work. Set Cloudflare's **Deploy command** to `npm run deploy`, and delete any custom `CLOUDFLARE_API_TOKEN` from the project's environment variables: it overrides the build environment's own scoped credential and is what caused *"Authentication error [code: 10000]"*. `public/_headers` ships the security headers (CSP, frame-ancestors, nosniff, etc.).

Live: **https://gradingsystem.hanndaaewii.workers.dev**

### Faculty registration (emailed code)

The login screen has a **Register** tab. The professor enters their name, department and email; the app calls
`supabase.auth.signInWithOtp({ email, shouldCreateUser: true })`, Supabase emails a 6-digit code, and the app
exchanges it with `verifyOtp({ type: "email" })`. On success a `faculty.profiles` row is created for that user
(role `professor`) — the RLS policy `profiles_insert_own` only lets a user create their *own* profile row, and
the department head can rename or re-role anyone from the Supabase dashboard afterwards.

> **Custom SMTP is required for real faculty addresses.** Supabase's built-in mailer only delivers to project
> team members and is heavily rate-limited. Configure your own provider (Resend, Mailgun, Brevo, SendGrid…) in
> **Supabase → Authentication → Emails → SMTP**, or codes to non-team addresses will never arrive.
>
> Without a backend the demo build accepts the code `123456` and says so on the form.
