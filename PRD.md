# Productivity: Product Requirements Document

Last updated: 2026-10-27

Status: initial product definition; not an implementation inventory.

## 1. Vision

Build an all-in-one personal productivity application that helps its user
record meaningful activity, maintain habits, and understand progress over time.

Begin with habit tracking that goes beyond reminders and checkboxes. A user
should be able to check off a simple routine, record cups of water or steps,
and maintain a detailed LeetCode practice log in the same application.

## 2. Current capabilities

No application capabilities have been verified as implemented. At document
creation, the GitHub repository was empty.

All capabilities below are requirements or proposals. A roadmap phase does not
mean a feature has shipped or has an agreed delivery date.

## 3. User needs

| Need | Expected outcome |
|---|---|
| See today's habits together | Know what remains and record progress quickly. |
| Track LeetCode practice | Retain problem difficulty, link, time, and notes. |
| Track quantities | Record water and steps without forcing them into checkboxes. |
| Understand improvement | See historical graphs, totals, and goal attainment. |
| Build a lasting productivity system | Expand without losing or fragmenting habit history. |

The initial audience is an individual tracking their own routines. Team
workspaces and social competition are outside the initial scope.

## 4. Scope and requirement labels

**Confirmed** means explicitly requested by the owner.
**Proposed** means a recommended implementation detail or future capability,
not yet approved by the owner.

### First release

| ID | Capability | Basis |
|---|---|---|
| H-01 | A dedicated habit screen with check-off interactions. | Confirmed |
| H-02 | Historical habit records. | Confirmed |
| H-03 | Detailed daily LeetCode logging. | Confirmed |
| H-04 | Numerical habits, including water and steps. | Confirmed |
| H-05 | Progress graphs in addition to calendar-style history. | Confirmed |
| H-06 | Create, edit, and archive habits with configurable daily targets. | Proposed |
| H-07 | Add, edit, and delete entries, including past-date entries. | Proposed |
| H-08 | Persistent storage across reloads and restarts. | Proposed supporting requirement |

### Later candidates

Flexible schedules, reminders, streaks, data export/import, automatic step
imports, cloud sync, and additional productivity modules are proposals.
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

| Field | Requirement |
|---|---|
| Practice date and time | Required; default to now and allow correction. |
| Difficulty | Required: easy, medium, or hard. |
| Problem URL | Required; accept valid HTTP(S) links and open them safely. |
| Note | Optional free text for approach, mistakes, or lessons. |
| Duration | Proposed optional elapsed time in minutes; nonnegative when supplied. |
| Problem title or number | Proposed optional field to make history easier to scan. |

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

| Entity | Core information |
|---|---|
| Habit | Identifier, name, type, unit where applicable, creation date, archive state. |
| Habit goal | Habit, target, effective date; daily schedule initially. |
| Completion record | Habit, local date, completed state; unique for that habit/date. |
| Count entry | Identifier, habit, timestamp, local date, numerical amount. |
| Activity entry | Identifier, habit, timestamp, local date, structured activity fields. |
| Preferences | Reporting time zone and, if introduced, other user settings. |

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

| Phase | Intended outcome | Scope |
|---|---|---|
| Foundation | A usable, persistent personal habit tracker. | Habit screen, three habit types, LeetCode details, water, manual steps, editing, daily targets. |
| Insights | Understand progress over time. | Historical graphs, date filters, difficulty breakdown, accurate goal history. Required before calling the first release complete. |
| Habit improvements | More flexible routines and portability. | Candidate flexible schedules, reminders, streaks, export/import, backup options. |
| Integrations | Reduce manual recording where useful. | Candidate device-health step imports, LeetCode integration if feasible, account sync. |
| Broader productivity | Expand beyond habits based on user priorities. | Candidate tasks, projects, notes, and daily/weekly planning. No committed scope yet. |

No dates, external integrations, or later modules are promised by this roadmap.

## 13. Out of scope for the first release

- Automatic LeetCode scraping, judging solutions, or submitting code.
- Automatic pedometer data collection or health-platform integration.
- Social feeds, leaderboards, shared habits, or team collaboration.
- AI coaching or recommendations.
- Full task/project management, calendars, or note-taking workspaces.
- Billing, subscriptions, and enterprise administration.

## 14. Decisions still needed

These do not change the confirmed vision. Resolve each before implementing the
affected area.

- Platform and stack: web, mobile, desktop, or a staged approach.
- Storage and deployment: local-first, hosted, or synced; backup expectations.
- Whether LeetCode "time" requires timestamp, duration, a live timer, or a mix.
- Whether LeetCode completion means attempted, solved, or another criterion.
- Whether any habits need weekly or custom schedules at launch.
- Preferred water units and whether users can change units.
- Time-zone changes, backdated corrections, and future-date entry policy.
- Which productivity area, if any, should follow habit tracking.

## 15. Keeping this specification accurate

Update this document when requirements or behavior change. Track delivery
status with evidence rather than treating this document as proof of
implementation. Keep durable AI-facing decisions and development commands in
`AGENTS.md`; keep product scope and acceptance criteria here.
