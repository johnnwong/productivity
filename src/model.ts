import { z } from "zod";

export const STORAGE_KEY = "little-by-little.v1";
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");
const numberSchema = z.number().finite().min(0).max(1_000_000_000);
export const habitSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(60),
    kind: z.enum(["check", "count", "leetcode"]),
    unit: z.string().trim().max(20),
    whole: z.boolean(),
    color: z.enum(["sage", "blue", "peach", "lilac"]),
    archived: z.boolean(),
    createdOn: dateSchema,
    goals: z
      .array(z.object({ from: dateSchema, target: numberSchema.positive() }))
      .min(1),
  })
  .superRefine((habit, ctx) => {
    if (
      new Set(habit.goals.map((goal) => goal.from)).size !== habit.goals.length
    ) {
      ctx.addIssue({ code: "custom", message: "Duplicate goal dates" });
    }
    if (
      habit.goals.some(
        (goal) =>
          (habit.kind === "check" && goal.target !== 1) ||
          ((habit.whole || habit.kind === "leetcode") &&
            !Number.isInteger(goal.target)),
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid target for this habit type",
      });
    }
    if (
      habit.kind === "count" &&
      (!habit.unit || (habit.unit.toLowerCase() === "steps" && !habit.whole))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Counts need a unit; steps require whole numbers",
      });
    }
  });
const safeUrl = z
  .string()
  .url()
  .max(2000)
  .refine((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  }, "Use an http or https link without credentials");
export const entrySchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  date: dateSchema,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  value: numberSchema,
  title: z.string().max(120),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  url: safeUrl.optional(),
  note: z.string().max(5000),
  duration: numberSchema.optional(),
});
export const stateSchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().nonnegative(),
    timeZone: z.string().refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Invalid time zone"),
    habits: z.array(habitSchema).max(200),
    entries: z.array(entrySchema).max(100_000),
  })
  .superRefine((state, ctx) => {
    const ids = [
      ...state.habits.map((h) => h.id),
      ...state.entries.map((e) => e.id),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Duplicate identifiers" });
    const checks = new Set<string>();
    for (const entry of state.entries) {
      const habit = state.habits.find((h) => h.id === entry.habitId);
      if (!habit) {
        ctx.addIssue({
          code: "custom",
          message: "Entry has no matching habit",
        });
        continue;
      }
      if (
        habit.kind === "leetcode" &&
        (!entry.url || !entry.difficulty || entry.value !== 1)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Practice entries need a link, difficulty, and value of one",
        });
      }
      if (
        (habit.whole || habit.kind === "check") &&
        !Number.isInteger(entry.value)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "This habit requires whole numbers",
        });
      }
      if (habit.kind === "check") {
        const key = `${habit.id}/${entry.date}`;
        if (checks.has(key) || entry.value !== 1)
          ctx.addIssue({
            code: "custom",
            message: "Duplicate or invalid completion",
          });
        checks.add(key);
      }
    }
  });
export type Habit = z.infer<typeof habitSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type AppState = z.infer<typeof stateSchema>;

export function dayInZone(timeZone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function timeInZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}
export function shiftDay(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function dateLabel(
  day: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}
export function targetOn(habit: Habit, day: string): number {
  return (
    [...habit.goals]
      .sort((a, b) => b.from.localeCompare(a.from))
      .find((g) => g.from <= day)?.target ?? habit.goals[0].target
  );
}
export function progress(state: AppState, habit: Habit, day: string) {
  const entries = state.entries.filter(
    (e) => e.habitId === habit.id && e.date === day,
  );
  const value = entries.reduce((sum, e) => sum + e.value, 0);
  return {
    entries,
    value,
    recorded: entries.length > 0,
    target: targetOn(habit, day),
    done: value >= targetOn(habit, day),
  };
}
export function starterState(
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): AppState {
  const today = dayInZone(timeZone);
  const seed = (
    name: string,
    kind: Habit["kind"],
    unit: string,
    target: number,
    color: Habit["color"],
    whole = false,
  ): Habit => ({
    id: crypto.randomUUID(),
    name,
    kind,
    unit,
    whole,
    color,
    archived: false,
    createdOn: today,
    goals: [{ from: "0001-01-01", target }],
  });
  return {
    version: 1,
    revision: 0,
    timeZone,
    entries: [],
    habits: [
      seed(
        "A little problem-solving",
        "leetcode",
        "problems",
        1,
        "peach",
        true,
      ),
      seed("Stay hydrated", "count", "cups", 8, "blue"),
      seed("Find your stride", "count", "steps", 6000, "sage", true),
      seed("A moment for yourself", "check", "", 1, "lilac", true),
    ],
  };
}
export function saveEntry(state: AppState, entry: Entry): AppState {
  const habit = state.habits.find((h) => h.id === entry.habitId);
  if (!habit) throw new Error("This habit no longer exists.");
  const entries = state.entries.filter(
    (e) =>
      e.id !== entry.id &&
      !(
        habit.kind === "check" &&
        e.habitId === habit.id &&
        e.date === entry.date
      ),
  );
  return stateSchema.parse({ ...state, entries: [...entries, entry] });
}
export function changeGoal(habit: Habit, from: string, target: number): Habit {
  return habitSchema.parse({
    ...habit,
    goals: [...habit.goals.filter((g) => g.from !== from), { from, target }],
  });
}
export function parseBackup(raw: string): AppState {
  if (raw.length > 20_000_000)
    throw new Error("This backup is too large (maximum 20 MB).");
  return stateSchema.parse(JSON.parse(raw));
}
export function writeState(
  storage: Pick<Storage, "getItem" | "setItem">,
  previousRaw: string | null,
  state: AppState,
): string {
  if (storage.getItem(STORAGE_KEY) !== previousRaw)
    throw new Error(
      "Your data changed in another window. Reload before saving; your input is still here.",
    );
  const next = JSON.stringify(
    stateSchema.parse({ ...state, revision: state.revision + 1 }),
  );
  storage.setItem(STORAGE_KEY, next);
  return next;
}
