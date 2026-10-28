# Application Memory and AI Working Instructions

## Read this first

Before planning, answering application-specific questions, or modifying this
repository:

1. Read this entire file.
2. Read `PRD.md` in the repository root.
3. Inspect the relevant implementation, tests, and any more specific directory
   instructions before making claims or changes.

These are standing instructions for AI tools that support `AGENTS.md`. Other
tools must be configured to load this file explicitly; this file alone cannot
guarantee that every AI system reads it.

## Project identity

- Repository: https://github.com/johnnwong/productivity
- Application name: Little by Little (initial design name); repository: Productivity.
- Vision: an all-in-one personal productivity application, starting with rich,
  flexible habit tracking and useful progress visualizations.
- Primary user: an individual tracking personal routines and improvement.
- Product specification: `PRD.md`.

## Confirmed product memory

The owner wants:

- A dedicated habit-tracking screen where habits can be checked off.
- Historical tracking, not merely daily reminders.
- Daily LeetCode tracking with time, difficulty (`easy`, `medium`, `hard`),
  a problem link, and a short note.
- Support for other habit types, including cups of water and steps.
- Graphs that show progress over time, not just a calendar.
- A foundation that can grow into a broader productivity application.

Do not reduce every habit to a boolean checkbox. A completion habit, a count
habit, and a detailed activity log have different data needs.

## Current implementation status

As of 2026-10-28, the first local-first application is implemented using React,
TypeScript, and Vite. It includes a daily dashboard, completion/count/LeetCode
habits, entry editing/deletion, effective-dated targets, archiving/restoration,
historical graphs, JSON backup/restore, and an installable offline app shell.
The updated UI defaults to a compact searchable list, with optional cards.
Habits can define custom numerical/text/link/choice fields; lifting logs record
individual sets and exercise-specific weight, reps, sets, and volume charts.
Existing local records and version-1 backups remain readable.

An optional Supabase email-sign-in/sync integration is implemented, but no real
Supabase project or public hosting has been configured. Live cross-device sync
is NOT enabled or verified. The sync client has been tested with a simulated
backend across two browser contexts. Automatic step tracking and LeetCode
account synchronization remain unimplemented.

### Architecture and commands

- `src/model.ts`: versioned Zod schemas, progress/date calculations, durable
  write validation, and backup validation.
- `src/useStore.ts`: localStorage persistence and recovery. Storage key:
  `little-by-little.v1`. Never replace unreadable data with empty defaults.
- `src/App.tsx`: dashboard, journal, insights, and native accessible dialogs.
- `src/HabitForms.tsx`: configurable field editor and generic entry forms,
  including the LeetCode template and per-set lifting editor.
- `src/sync.ts`, `src/useSync.ts`, `src/SyncPanel.tsx`: optional Supabase client,
  email login, local-first synchronization, and explicit conflict choices.
- `supabase/schema.sql`: owner-isolated table, row-level read policy, and
  authenticated atomic compare-and-swap write RPC.
- `src/style.css`: warm garden-inspired palette, responsive layout, restrained
  decorative animation, and `prefers-reduced-motion` support.
- `src/usePwa.ts`, `vite.config.ts`, `public/manifest.webmanifest`: offline
  caching, explicit update prompts, and standalone installation metadata.
- Install: `npm ci` (Node 22.12+ on the Node 22 line, or a supported newer LTS).
- Develop: `npm run dev`.
- Validate: `npm test`, `npm run lint`, `npm run format:check`,
  `npm run build`.
- Browser tests: `npx playwright install chromium`, then `npm run test:e2e`
  after building. Tests start and stop their own production server on port 4173.
  Stop any user preview on that port before testing and restore it afterwards.
- Mock cloud test: build with
  `VITE_SUPABASE_URL=https://test-project.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=test-public-key npm run build`,
  then `SYNC_TEST=1 npx playwright test tests/sync.spec.ts`.
  Restore the ordinary build with `npm run build` afterwards. Mock tests do not
  verify the SQL policies or a real hosted database.
- Local installable preview: `npm run build`, then
  `npm run preview -- --port 4173 --strictPort`.

Use the production preview at `http://127.0.0.1:4173` for installation/offline
testing. Development uses a different origin and does not register a service
worker. Keep a stable origin/port for real data; different origins have separate
storage. Production hosting must use HTTPS and serve the app at the domain root
(not an unconfigured GitHub Pages project subpath).

Without cloud configuration, local storage is not synced or guaranteed against
browser data clearing or quota limits. Records are not end-to-end encrypted.
Export backups regularly. Stale-window saves are
rejected rather than overwriting another window's changes; reload before
retrying. Ordinary localStorage writes are not a transactional multi-tab
database, so use one active editing window.

## Product decisions and assumptions

### Confirmed

- Habit tracking is the first concrete product area.
- LeetCode entries need richer information than completion alone.
- Water and steps require numerical tracking.
- Historical graphs are core functionality.
- The owner approved a single-user, local-first installable web app instead of
  accounts/cloud storage or native desktop packaging.
- The owner wants a comforting, distinctive, playful UI with motion that does
  not overcomplicate the workflow. Reduced-motion preferences must be honored.
- The owner subsequently requested persistent cross-device data, less clutter,
  editable tracked fields, lifting logs/charts, and alternate display options.
  This supersedes the earlier local-only product scope.

### Initial implementation decisions

- Use React/Vite rather than a server framework because this app is entirely
  client-side and can be served as static files.
- Store explicit reporting dates and wall-clock times in the reporting time
  zone captured at first use. Dates do not move on device time-zone changes.
- LeetCode logs record timestamp fields and optional duration, with no live
  timer. Each logged problem counts as practice, not verified solved status.
- Initial targets: one problem, eight cups, 6,000 manually entered steps, and
  one self-care check-in. They are editable starter habits, not activity data.
- Initial habit targets apply to all dates; edits apply from the selected date
  until the next effective target. Units/types/precision remain fixed.
- Backdated entries are supported. New UI entries cannot be future-dated.
- No remote fonts or analytics. Optional cloud configuration contacts only the
  configured Supabase project for sign-in and synchronization.
- Compact list is the default; list/cards preference is device-local.
  The large hero, motivational panels, and inline journal preview were removed.
- Field IDs are stable. Hide fields instead of deleting historical values.
  Field type, unit, precision, and choice options stay fixed after creation.
  New requirements affect entry saves, not validation of past missing values.
- Lifting uses one exercise per entry and per-set nonnegative weight and
  positive whole-number reps. Weight units are fixed per habit. Volume means
  sum(weight * reps), not estimated one-rep max or bodyweight-adjusted volume.
- Supabase is the implementation default, not an owner-selected provider.
  Its project, email settings, public configuration, and HTTPS hosting still
  require setup; see `PRD.md` section 17.
- Sync requires explicit initial data selection, then attempts after local
  edits (debounced), focus/reconnection, and every 30 seconds. Offline local
  edits remain available. Concurrent edits pause for review, not blind merge.
- Automatic sync pauses while entry/habit/delete dialogs are open and resumes
  after closing them. Delayed downloads must recheck the signed-in account
  before replacing local records.
- A whole-document revision-checked RPC prevents stale overwrites. Conflict
  choices explicitly replace one side; pre-sync local recovery data is stored
  under `little-before-sync.<owner>`. Backup downloads remain available.
- Do not cache Supabase responses in the offline service worker. Never use a
  service-role/secret key in frontend code or tracked configuration.

### Proposed defaults, not owner-approved decisions

- Automatic device tracking is a later, separately scoped integration.
- More flexible schedules can follow the implemented daily targets.
- Treat tasks, projects, notes, and planning as possible expansion areas, not
  promised requirements.

Do not present these assumptions as facts supplied by the owner. See `PRD.md`
for behavior, scope, acceptance criteria, and unresolved decisions.

## Engineering guardrails

- Inspect existing code and reuse its patterns before introducing new ones.
- Do not choose or replace a technology stack without checking the repository
  and explaining material tradeoffs.
- Keep changes focused on the requested feature.
- Preserve historical entries when habits or goals change. Archiving must not
  erase history.
- Define date boundaries and time-zone behavior explicitly. Do not mix local
  calendar days with UTC days in progress calculations.
- Distinguish missing data from recorded zero and unmet goals.
- Validate numerical values and links; surface errors without losing input.
- Do not log personal notes or habit history unnecessarily.
- Never commit credentials or secrets.
- Test changed behavior, especially numerical aggregation, editing, date
  boundaries, and historical reporting.
- Never claim a feature is implemented or a check passed without evidence.

## Maintaining this memory

When a change affects product behavior, architecture, development commands,
or a lasting decision:

1. Update this file with concise, verified facts or decisions.
2. Update the matching requirement and delivery status in `PRD.md`.
3. Keep planned, implemented, and verified behavior clearly separate.
4. Record important unresolved questions rather than inventing answers.

Keep this file short and durable. It is application memory, not a transcript,
temporary task list, or replacement for implementation documentation.

## Decision log

| Date       | Decision or fact                                                                                        | Status                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 2026-10-27 | Begin with rich habit tracking, LeetCode logs, water, steps, and graphs.                                | Owner vision                                               |
| 2026-10-27 | No implementation was available in the empty GitHub repository.                                         | Verified at document creation                              |
| 2026-10-27 | The release boundaries and detailed behavior in `PRD.md` are an initial proposal.                       | Pending owner review                                       |
| 2026-10-28 | Single-user installable web app, local storage, and comforting animated UI.                             | Owner approved                                             |
| 2026-10-28 | React/Vite static app; local JSON persistence; manual step and practice logging; export/import backups. | Implemented                                                |
| 2026-10-28 | Less clutter, optional list/cards, configurable fields, lifting, and cross-device persistence.          | Owner requested                                            |
| 2026-10-28 | Optional Supabase sync; account-isolated CAS writes and explicit conflict resolution.                   | Client implemented; live setup blocked on external project |
