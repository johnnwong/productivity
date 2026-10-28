# Productivity: Product Requirements Document

Last updated: 2026-10-28

Status: first local implementation available; roadmap proposals remain separate.

## 1. Vision

Build an all-in-one personal productivity application that helps its user
record meaningful activity, maintain habits, and understand progress over time.

Begin with habit tracking that goes beyond reminders and checkboxes. A user
should be able to check off a simple routine, record cups of water or steps,
and maintain a detailed LeetCode practice log in the same application.

## 2. Current capabilities

The initial app, provisionally named **Little by Little**, implements:

- Responsive daily habit dashboard with completion, numerical, and LeetCode
  practice tracking.
- LeetCode date/time, difficulty, link, optional title, notes, and duration.
- Manual water and step entries, including zero and fractional cups.
- Entry editing/deletion, past dates, configurable daily targets with goal
  history, habit creation, and archive/restore.
- Per-habit 7-day, 30-day, and custom-range graphs with accessible data tables,
  difficulty totals, and recorded duration summaries.
- Local browser persistence, validated JSON backup/restore, and recovery
  without silently replacing corrupted data.
- Standalone install metadata, a production offline shell, and app update
  prompts.
- Garden-inspired soft colors, original animated illustration, responsive
  navigation, subtle progress motion, and reduced-motion support.

Update: the large decorative hero and motivational panels have been removed.
The dashboard now defaults to a compact searchable list with a remembered
card-view option. Journal entries and charts live on their own screens.
Custom tracking fields support numbers, text, links, and choices. LeetCode
fields can be enabled/hidden or extended. Lifting entries include an exercise
and individual weight/reps sets, with weight, sets, reps, and volume charts and
an exercise filter.

The owner approved an installable, single-user app and subsequently requested
cross-device persistence. Optional Supabase email sign-in and synchronization
are implemented, but are not yet connected to a live project.
The implementation uses React,
TypeScript, and Vite, rather than a server framework.

This is not a native desktop installer. Browser installation produces a
separate app window. Actual installation menus depend on the browser and OS.
No public website or hosted deployment has been configured.

The core behavior and offline reopening are exercised in Chromium desktop and
mobile-emulation tests. Two-context cloud flows are tested with a simulated
Supabase API; the real SQL policies and live cross-device behavior have not
been verified. Real Safari/iOS installation has not been verified.
Later roadmap phases are not implemented or promised by this inventory.

## 3. User needs

| Need                                | Expected outcome                                             |
| ----------------------------------- | ------------------------------------------------------------ |
| See today's habits together         | Know what remains and record progress quickly.               |
| Track LeetCode practice             | Retain problem difficulty, link, time, and notes.            |
| Track quantities                    | Record water and steps without forcing them into checkboxes. |
| Understand improvement              | See historical graphs, totals, and goal attainment.          |
| Build a lasting productivity system | Expand without losing or fragmenting habit history.          |

The initial audience is an individual tracking their own routines. Team
workspaces and social competition are outside the initial scope.

## 4. Scope and requirement labels

**Confirmed** means explicitly requested by the owner.
**Proposed** means a recommended implementation detail or future capability,
not yet approved by the owner.

### First release

| ID   | Capability                                                        | Basis                           |
| ---- | ----------------------------------------------------------------- | ------------------------------- |
| H-01 | A dedicated habit screen with check-off interactions.             | Confirmed                       |
| H-02 | Historical habit records.                                         | Confirmed                       |
| H-03 | Detailed daily LeetCode logging.                                  | Confirmed                       |
| H-04 | Numerical habits, including water and steps.                      | Confirmed                       |
| H-05 | Progress graphs in addition to calendar-style history.            | Confirmed                       |
| H-06 | Create, edit, and archive habits with configurable daily targets. | Proposed                        |
| H-07 | Add, edit, and delete entries, including past-date entries.       | Proposed                        |
| H-08 | Persistent storage across reloads and restarts.                   | Proposed supporting requirement |

### Later candidates

Flexible schedules, reminders, streaks, automatic step imports, and additional
productivity modules remain proposals. Export/import is implemented.
Cross-device cloud sync is now requested; external setup remains pending.
They must not delay the core habit-tracking release by default.

## 5. Primary experience

### Today / habits

- Show active habits for the selected local date, defaulting to today.
- Show each habit's name, type, recorded progress, target if applicable, and
  completion status.
- Allow direct check-off for completion habits.
- Provide quick numerical entry for count habits.
- Open a richer entry form for activity-log habits.
- Allow navigation to previous dates and access to habit history.
- Keep incomplete, completed, and unrecorded states understandable.

### Habit detail

- Show the habit's configuration, entries, and historical progress.
- Support editing entries without leaving stale totals or charts.
- Provide date-range controls and a route to habit settings.
- Preserve archived habits and their history outside the active daily list.

### LeetCode log

- Provide a dedicated entry form or equivalent focused interaction.
- Show past problems with date/time, difficulty, link, and notes.
- Support more than one problem on the same day.

### Insights

- Show progress graphs for individual habits.
- Offer proposed 7-day, 30-day, and custom date ranges.
- Include numerical totals and goal attainment where relevant.
- A calendar or heatmap may supplement graphs, but cannot replace them.

## 6. Habit types and recording rules

### Completion habit

Examples: stretching, reading, or another yes/no routine.

- One completion state per habit per local date.
- Checking twice must not create duplicate completion credit.
- Unchecking reverses that date's completion without affecting other dates.

### Count habit

Examples: cups of water and steps.

- Store a unit and a positive daily target.
- Allow multiple nonnegative increments per day; daily progress is their sum.
- Support correcting or removing an entry.
- Treat a daily total at or above the target as completed.
- Permit progress above the target and display the actual value.
- Water may use fractional cups; step entries must be whole numbers.
- Manual steps must work without device permissions or external services.
- Until automatic imports exist, describe this as manual step tracking, not
  live pedometer functionality.

Example: a target of eight cups with entries of two, one, and two cups shows
five cups recorded and three remaining.

### Activity-log habit

Example: LeetCode practice.

- Store multiple structured activity entries per day.
- Use entry count toward the daily target by default.
- For LeetCode, propose a default target of one problem per day.
- Preserve the full entry details independently of the daily completion state.

## 7. LeetCode entry requirements

| Field                   | Requirement                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| Practice date and time  | Required; default to now and allow correction.                        |
| Difficulty              | Required: easy, medium, or hard.                                      |
| Problem URL             | Required; accept valid HTTP(S) links and open them safely.            |
| Note                    | Optional free text for approach, mistakes, or lessons.                |
| Duration                | Proposed optional elapsed time in minutes; nonnegative when supplied. |
| Problem title or number | Proposed optional field to make history easier to scan.               |

"Time of the LeetCode" is not yet fully specified. The proposed design records
when practice occurred and optionally how long it took. It does not imply a
live timer or automatic LeetCode synchronization.

Proposed initial rule: each saved problem entry counts once toward practice.
Solved-versus-attempted status, repeat attempts, and completion rules need an
explicit decision before adding those concepts.

## 8. History, goals, and visualizations

- Keep entry timestamps and assign them to explicit local calendar dates.
- Use one documented reporting time-zone policy throughout daily views and
  charts. Proposed default: a stored user reporting time zone.
- Do not silently move historical entries to different days when the device
  time zone changes.
- Preserve historical target values or effective-dated goal changes so changing
  a goal does not rewrite previous goal attainment.
- Recompute affected summaries after entry edits or deletions.
- Distinguish a missing record from an explicitly recorded zero. A missing
  count record is not proof that no activity occurred.
- Show a daily trend for numerical habits, with a target reference where useful.
- Show completion history for checkbox habits.
- For LeetCode, show problems per day and a difficulty breakdown. Duration
  summaries apply only to entries that include duration.
- Label units, dates, and aggregation clearly. Do not combine cups, steps, and
  problem counts into an unexplained productivity score.
- Provide readable numerical summaries alongside charts.

## 9. Conceptual data model

This is a behavior-oriented model, not a mandated database schema.

| Entity            | Core information                                                             |
| ----------------- | ---------------------------------------------------------------------------- |
| Habit             | Identifier, name, type, unit where applicable, creation date, archive state. |
| Habit goal        | Habit, target, effective date; daily schedule initially.                     |
| Completion record | Habit, local date, completed state; unique for that habit/date.              |
| Count entry       | Identifier, habit, timestamp, local date, numerical amount.                  |
| Activity entry    | Identifier, habit, timestamp, local date, structured activity fields.        |
| Preferences       | Reporting time zone and, if introduced, other user settings.                 |

Daily totals and goal attainment should be derived consistently from records.
If cached, they must remain consistent when source data changes.

## 10. Reliability, usability, and privacy

- Persist saved records across reloads and application restarts.
- Make the storage boundary clear: local-only storage is not cloud sync or a
  backup. Choose and document storage before implementation.
- Validate input and show actionable errors without discarding form contents.
- Prevent accidental double submission from duplicating entries.
- Confirm destructive deletion; archive habits by default to retain history.
- Support keyboard operation, labelled inputs, visible focus, and chart
  information that does not depend on color alone.
- Proposed layout target: usable on both phone-sized and desktop screens.
- Treat personal routines and notes as private. Do not expose them in public
  logs or analytics.
- Authentication, authorization, and account-level data isolation are required
  if a multi-user hosted service is chosen; they are not presumed implemented.
- Select measurable performance targets once the platform and expected data
  volume are known.

## 11. Acceptance criteria for the first release

1. A user can create a completion habit, check it off for today, reload, and
   see the same saved state. Unchecking changes only the selected date.
2. A user can record a LeetCode problem with date/time, difficulty, link, and
   note, then reopen and edit it without losing the details.
3. Recording two LeetCode problems on one day retains two distinct entries
   and displays a daily count of two.
4. Water entries of two, one, and two cups produce a total of five cups.
   Editing the last entry to three updates the total and graph to six.
5. A user can record a whole-number step value manually. Negative steps and
   fractional steps are rejected with a clear message.
6. A user can view a habit's progress as a graph over a selected date range;
   calendar-only history does not satisfy this requirement.
7. An entry recorded near midnight appears on the same intended reporting date
   in the daily screen, history, and chart.
8. Updating a target does not retroactively alter previous dates' target values.
9. Archiving a habit removes it from the active daily list but retains its
   entries and historical views.
10. A failed save is clearly reported and preserves entered values for retry;
    a successful retry does not create duplicates.
11. A missing count record is distinguishable from a recorded zero.

## 12. Proposed roadmap

| Phase                | Intended outcome                               | Scope                                                                                                                             |
| -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Foundation           | A usable, persistent personal habit tracker.   | Habit screen, three habit types, LeetCode details, water, manual steps, editing, daily targets.                                   |
| Insights             | Understand progress over time.                 | Historical graphs, date filters, difficulty breakdown, accurate goal history. Required before calling the first release complete. |
| Habit improvements   | More flexible routines and portability.        | Candidate flexible schedules, reminders, streaks, export/import, backup options.                                                  |
| Integrations         | Reduce manual recording where useful.          | Candidate device-health step imports, LeetCode integration if feasible, account sync.                                             |
| Broader productivity | Expand beyond habits based on user priorities. | Candidate tasks, projects, notes, and daily/weekly planning. No committed scope yet.                                              |

No dates, external integrations, or later modules are promised by this roadmap.

## 13. Out of scope for the first release

- Automatic LeetCode scraping, judging solutions, or submitting code.
- Automatic pedometer data collection or health-platform integration.
- Social feeds, leaderboards, shared habits, or team collaboration.
- AI coaching or recommendations.
- Full task/project management, calendars, or note-taking workspaces.
- Billing, subscriptions, and enterprise administration.

## 14. Decisions and remaining questions

These do not change the confirmed vision. Resolve each before implementing the
affected area.

- Decided: installable responsive web app; React/TypeScript/Vite.
- Updated request: cross-device persistent data, with sign-in for private sync.
- Implemented: local storage and JSON backups; optional Supabase integration
  awaiting a real project, account, and hosted URL.
- Initial implementation: explicit practice date/time plus optional minutes,
  without a live timer. Confirm whether a timer is wanted later.
- Initial implementation: logged practice counts toward the daily target;
  solved status is not independently tracked or verified.
- Initial implementation: daily targets only; flexible schedules remain later.
- Initial implementation: cups for the water starter habit; custom units for
  new numerical habits. Units cannot change after habit creation.
- Initial implementation: stored reporting time zone, stable explicit dates,
  editable past entries, and no new future-dated entries through the UI.
- Still open: where to host the production app on HTTPS for everyday use.
- Still open: any future timer, automatic integrations, or schedule preferences.
- Which productivity area, if any, should follow habit tracking.

## 15. Keeping this specification accurate

Update this document when requirements or behavior change. Track delivery
status with evidence rather than treating this document as proof of
implementation. Keep durable AI-facing decisions and development commands in
`AGENTS.md`; keep product scope and acceptance criteria here.

## 16. Running and storage boundaries

Use Node 22.12+ on the Node 22 line, or a supported newer LTS. Run `npm ci`,
then `npm run dev` for development. For installation and offline use, run
`npm run build` and `npm run preview -- --port 4173 --strictPort`, then open
`http://127.0.0.1:4173`. See the in-app settings for installation instructions.

Keep the same URL for everyday use. `localhost`, `127.0.0.1`, development ports,
and future hosted domains all have separate storage. Move data between them
with export/import. Deploy the built `dist/` directory to an HTTPS static host
at the domain root; the current build does not target a project subdirectory.

The production shell can reopen and accept entries offline after its first
successful online load. Updates wait for explicit acceptance so open forms are
not automatically reloaded.

Records are local JSON in localStorage. Browser quota may be reached well
before the import validator's maximum of 20 MB, 200 habits, or 100,000 entries.
A failed write shows an error and does not update the displayed saved state.
Unreadable data is retained for download/recovery. Backups replace data only
after validation and explicit confirmation; they do not merge.

Local browser storage is not encrypted or backed up automatically. Optional
sync does not replace independent backups. Use one
active editing window. A stale snapshot is rejected on save, but localStorage
does not provide full multi-window transactions.

## 17. Cross-device sync setup and current limitation

**Live sync is not enabled.** No Supabase project, credentials, or public app
hosting were supplied. The following is the one-time setup needed to connect
the implemented integration:

1. Create a Supabase project under your own account. Review the provider's
   current pricing, retention, availability, and backup policies.
2. Run `supabase/schema.sql` in that project's SQL editor. It creates a private
   `habit_spaces` table, an owner-only read policy, and a revision-checked
   `save_habit_space` RPC. Anonymous users cannot access it, authenticated
   clients cannot directly write the table, and the RPC checks the expected
   account against `auth.uid()`.
3. In Supabase Authentication, create/invite your own email user and enable
   email sign-in. The app does not create new users through its sign-in form.
   Keep public signups disabled if only you should use the project. Configure
   an email delivery provider if required for reliable production delivery.
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`. Only use a public/publishable key (or a
   legacy anon key), NEVER a service-role/admin secret. Frontend variables are
   visible in the built app. Security depends on authentication and SQL
   policies, not on hiding this public key.
5. Deploy `dist/` after `npm ci && npm run build` to a static HTTPS host at
   the domain root. Set these same build-time variables on that host.
   A hosting provider/account has not been selected or provisioned.
6. Configure Supabase's Site URL and allowed redirect URLs for your exact
   production origin. Add `http://127.0.0.1:4173` if using the local preview.
   Email links must be opened on the device/browser being signed in.
7. Export existing local data before connecting. In Settings & sync, sign in,
   select Sync now, and explicitly publish the device copy or use an existing
   cloud copy. Use the same email/project on every device. On a new device,
   choose the cloud copy instead of publishing empty starter habits.
8. Before relying on it, verify on two real devices: publish, pull, edit,
   reopen, disconnect/reconnect, and deliberately make concurrent edits.
   Verify in Supabase that unauthenticated access fails and one user cannot
   read/write another user's row. These real-provider checks remain pending.

After initial connection, synchronization is attempted after local edits, on
focus/reconnection, and every 30 seconds while open. Automatic sync pauses while
entry, habit, or deletion dialogs are open and resumes after closing them.
Delayed downloads recheck the account before replacing device records.
A whole-document baseline
and server revision determine whether to push, pull, or pause. Simultaneous
changes do not silently overwrite: Settings asks which copy to keep. This is
explicit replacement, not field-level merge. The rejected side should be
exported before resolution; a local pre-sync recovery snapshot is also saved.
Signing out leaves local habit data on the device. Use a private browser/profile.

Cloud records are subject to Supabase's protections; this is not end-to-end
encryption. No service credentials are committed. Habit data is not stored in
GitHub, and offline caches contain app assets only, not cloud API responses.

## 18. Configurable fields and lifting acceptance criteria

- Users can create simple counters without added fields, or richer custom,
  LeetCode, and lifting logs. Date/time remain system fields.
- Fields have stable IDs, labels, types, units, required flags, and visibility.
  Hiding a field does not delete old values or its numerical chart metric.
- Renaming a label keeps its history. Type, precision, unit, and choice
  options cannot be changed in place after creation; create a replacement
  field to avoid reinterpreting historical values.
- A newly required field does not invalidate saved history. Saving or editing
  an entry requires its current visible required fields.
- Numerical fields can be charted as daily sums with their own units. Missing
  values remain distinct from recorded zero.
- A lifting log records one exercise and one or more sets. Each set has
  nonnegative weight and positive whole-number reps. Weight units are pounds
  or kilograms, fixed per habit. Users can add/remove sets and edit entries.
- Lifting charts support daily heaviest weight, total sets, reps, and volume
  (sum of weight times reps), with an exercise filter. Weight maxima are not
  summed across days. Bodyweight is not inferred from a zero-weight set.
- The compact list is the default, with an optional card view remembered on
  the device and a name search. Charts and entries do not grow the daily page
  vertically. Soft colors and subtle feedback remain; repeated decoration is
  removed.
- Existing version-1 local data and backup files retain entries and goals.
  The schema extension uses defaults rather than destructive reset.
