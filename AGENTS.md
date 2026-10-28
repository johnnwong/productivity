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
- Working name: Productivity.
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

As of 2026-10-27, GitHub reported that the repository was empty. No application
code, framework, database, tests, deployment, or implemented features were
verified. These documents describe intent, not shipped functionality.

Replace this section with verified facts as implementation progresses. Include
the actual run, build, lint, and test commands once they exist.

## Product decisions and assumptions

### Confirmed

- Habit tracking is the first concrete product area.
- LeetCode entries need richer information than completion alone.
- Water and steps require numerical tracking.
- Historical graphs are core functionality.

### Proposed defaults, not owner-approved decisions

- Start with a single-user experience; authentication and cloud sync are not
  prerequisites unless the chosen deployment requires them.
- Support completion, count, and activity-log habits.
- Interpret LeetCode "time" as both when a session happened and an optional
  duration, pending clarification.
- Start with manual step entry; automatic device tracking is a later,
  separately scoped integration.
- Use daily targets for the first release. More flexible schedules can follow.
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

| Date | Decision or fact | Status |
|---|---|---|
| 2026-10-27 | Begin with rich habit tracking, LeetCode logs, water, steps, and graphs. | Owner vision |
| 2026-10-27 | No implementation was available in the empty GitHub repository. | Verified at document creation |
| 2026-10-27 | The release boundaries and detailed behavior in `PRD.md` are an initial proposal. | Pending owner review |
