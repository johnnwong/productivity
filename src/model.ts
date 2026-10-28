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
export const fieldSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9-]{1,60}$/),
    label: z.string().trim().min(1).max(60),
    type: z.enum(["number", "text", "url", "choice"]),
    unit: z.string().max(20).default(""),
    required: z.boolean().default(false),
    active: z.boolean().default(true),
    whole: z.boolean().default(false),
    options: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  })
  .superRefine((field, ctx) => {
    if (
      [
        "__proto__",
        "constructor",
        "prototype",
        "progress",
        "lift-weight",
        "lift-volume",
        "lift-sets",
        "lift-reps",
      ].includes(field.id) ||
      (field.type === "choice" &&
        (!field.options.length ||
          new Set(field.options).size !== field.options.length))
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Choice fields need unique options and field identifiers must be safe.",
      });
    }
  });
export type TrackingField = z.infer<typeof fieldSchema>;
export const setSchema = z.object({
  weight: numberSchema,
  reps: numberSchema.int().positive(),
});
export const habitSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(60),
    kind: z.enum(["check", "count", "leetcode", "custom", "lift"]),
    unit: z.string().trim().max(20),
    whole: z.boolean(),
    color: z.enum(["sage", "blue", "peach", "lilac"]),
    archived: z.boolean(),
    createdOn: dateSchema,
    fields: z.array(fieldSchema).max(30).optional(),
    weightUnit: z.enum(["kg", "lb"]).default("lb"),
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
      habit.fields &&
      new Set(habit.fields.map((f) => f.id)).size !== habit.fields.length
    ) {
      ctx.addIssue({ code: "custom", message: "Duplicate tracking fields" });
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
  metrics: z
    .record(z.string(), z.union([z.string().max(5000), numberSchema]))
    .default({}),
  exercise: z.string().trim().max(120).optional(),
  sets: z.array(setSchema).max(100).optional(),
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
        ["leetcode", "custom", "lift"].includes(habit.kind) &&
        entry.value !== 1
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Activity entries count once per log",
        });
      }
      if (habit.kind === "lift" && (!entry.exercise || !entry.sets?.length)) {
        ctx.addIssue({
          code: "custom",
          message: "Lifting entries need an exercise and at least one set",
        });
      }
      for (const field of trackingFields(habit)) {
        const value = fieldValue(entry, field.id);
        if (value !== undefined && value !== "") {
          const error = validateField(field, value);
          if (error) ctx.addIssue({ code: "custom", message: error });
        }
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
    weightUnit: "lb",
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
  for (const field of trackingFields(habit).filter((f) => f.active)) {
    const value = fieldValue(entry, field.id);
    if (field.required && (value === undefined || value === ""))
      throw new Error(`${field.label} is required.`);
    if (value !== undefined && value !== "") {
      const error = validateField(field, value);
      if (error) throw new Error(error);
    }
  }
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
export function trackingFields(
  habit: Pick<Habit, "kind" | "fields">,
): TrackingField[] {
  if (habit.fields) return habit.fields;
  if (habit.kind === "leetcode")
    return [
      { id: "title", label: "Problem title", type: "text", required: false },
      { id: "url", label: "Problem link", type: "url", required: true },
      {
        id: "difficulty",
        label: "Difficulty",
        type: "choice",
        required: true,
        options: ["easy", "medium", "hard"],
      },
      {
        id: "duration",
        label: "Minutes",
        type: "number",
        required: false,
        unit: "min",
      },
      {
        id: "note",
        label: "What did you learn?",
        type: "text",
        required: false,
      },
    ].map((field) => fieldSchema.parse(field));
  return [];
}
export function fieldValue(
  entry: Entry,
  id: string,
): string | number | undefined {
  if (Object.hasOwn(entry.metrics, id)) return entry.metrics[id];
  if (
    id === "title" ||
    id === "url" ||
    id === "difficulty" ||
    id === "duration" ||
    id === "note"
  )
    return entry[id];
}
function validateField(
  field: TrackingField,
  value: string | number,
): string | null {
  if (field.type === "number") {
    if (
      typeof value !== "number" ||
      !numberSchema.safeParse(value).success ||
      (field.whole && !Number.isInteger(value))
    )
      return `${field.label} needs a nonnegative ${field.whole ? "whole " : ""}number.`;
  } else {
    if (typeof value !== "string") return `${field.label} needs text.`;
    if (field.type === "url" && !safeUrl.safeParse(value).success)
      return `${field.label} needs a valid http or https link.`;
    if (field.type === "choice" && !field.options.includes(value))
      return `${field.label} needs one of its configured choices.`;
  }
  return null;
}
export function chartMetrics(habit: Habit) {
  return [
    {
      id: "progress",
      label: habit.kind === "count" ? habit.unit : "Entries",
      unit: habit.unit || "check-ins",
      aggregate: "sum" as const,
    },
    ...trackingFields(habit)
      .filter((f) => f.type === "number")
      .map((f) => ({
        id: f.id,
        label: `${f.label}${f.active ? "" : " (hidden)"}`,
        unit: f.unit,
        aggregate: "sum" as const,
      })),
    ...(habit.kind === "lift"
      ? [
          {
            id: "lift-weight",
            label: "Heaviest weight",
            unit: habit.weightUnit,
            aggregate: "max" as const,
          },
          {
            id: "lift-volume",
            label: "Volume (weight × reps)",
            unit: `${habit.weightUnit} × reps`,
            aggregate: "sum" as const,
          },
          {
            id: "lift-sets",
            label: "Sets",
            unit: "sets",
            aggregate: "sum" as const,
          },
          {
            id: "lift-reps",
            label: "Reps",
            unit: "reps",
            aggregate: "sum" as const,
          },
        ]
      : []),
  ];
}
export function metricOn(
  state: AppState,
  habit: Habit,
  day: string,
  metric: string,
  exercise = "",
) {
  const entries = state.entries.filter(
    (e) =>
      e.habitId === habit.id &&
      e.date === day &&
      (!exercise || e.exercise === exercise),
  );
  if (metric === "progress")
    return {
      value: entries.reduce((sum, e) => sum + e.value, 0),
      recorded: entries.length > 0,
    };
  const values = entries.flatMap((e) => {
    if (metric.startsWith("lift-"))
      return (
        e.sets?.map((s) =>
          metric === "lift-weight"
            ? s.weight
            : metric === "lift-volume"
              ? s.weight * s.reps
              : metric === "lift-reps"
                ? s.reps
                : 1,
        ) ?? []
      );
    const value = fieldValue(e, metric);
    return typeof value === "number" ? [value] : [];
  });
  return {
    value:
      metric === "lift-weight"
        ? Math.max(0, ...values)
        : values.reduce((a, b) => a + b, 0),
    recorded: values.length > 0,
  };
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
