import { describe, expect, it } from "vitest";
import {
  changeGoal,
  chartMetrics,
  dayInZone,
  fieldSchema,
  fieldValue,
  metricOn,
  parseBackup,
  progress,
  saveEntry,
  shiftDay,
  starterState,
  STORAGE_KEY,
  targetOn,
  trackingFields,
  writeState,
  type Entry,
} from "./model";

const state = () => starterState("America/New_York");
function entry(habitId: string, value: number, date = "2026-10-27"): Entry {
  return {
    id: crypto.randomUUID(),
    habitId,
    date,
    time: "23:55",
    value,
    title: "",
    note: "",
    metrics: {},
  };
}
describe("habit history", () => {
  it("sums water, updates edited entries, and distinguishes missing from recorded zero", () => {
    let s = state();
    const water = s.habits[1];
    const last = entry(water.id, 2);
    for (const e of [entry(water.id, 2), entry(water.id, 1), last])
      s = saveEntry(s, e);
    expect(progress(s, water, last.date).value).toBe(5);
    s = saveEntry(s, { ...last, value: 3 });
    expect(progress(s, water, last.date).value).toBe(6);
    expect(progress(s, water, "2026-10-26").recorded).toBe(false);
    s = saveEntry(s, entry(water.id, 0, "2026-10-26"));
    expect(progress(s, water, "2026-10-26")).toMatchObject({
      value: 0,
      recorded: true,
    });
  });
  describe("flexible tracking", () => {
    it("reads legacy backups without losing LeetCode details", () => {
      const s = state();
      const old = {
        ...s,
        habits: s.habits.map(({ fields, weightUnit, ...h }) => {
          void fields;
          void weightUnit;
          return h;
        }),
        entries: [
          {
            id: crypto.randomUUID(),
            habitId: s.habits[0].id,
            date: "2026-10-27",
            time: "15:00",
            value: 1,
            title: "Two Sum",
            note: "Keep it",
            difficulty: "easy",
            url: "https://leetcode.com/problems/two-sum/",
            duration: 12,
          },
        ],
      };
      const restored = parseBackup(JSON.stringify(old));
      expect(fieldValue(restored.entries[0], "duration")).toBe(12);
      expect(trackingFields(restored.habits[0])).toHaveLength(5);
      expect(restored.entries[0].note).toBe("Keep it");
    });
    it("hides fields without deleting their history and applies required fields only to new saves", () => {
      let s = state();
      const custom = {
        ...s.habits[0],
        kind: "custom" as const,
        fields: [
          fieldSchema.parse({
            id: "pages",
            label: "Pages",
            type: "number",
            required: true,
          }),
        ],
      };
      s.habits[0] = custom;
      expect(() => saveEntry(s, entry(custom.id, 1))).toThrow("required");
      s = saveEntry(s, { ...entry(custom.id, 1), metrics: { pages: 0 } });
      expect(metricOn(s, custom, "2026-10-27", "pages")).toMatchObject({
        recorded: true,
        value: 0,
      });
      s.habits[0].fields![0].active = false;
      s.habits[0].fields!.push(
        fieldSchema.parse({
          id: "mood",
          label: "Mood",
          type: "text",
          required: true,
        }),
      );
      const restored = parseBackup(JSON.stringify(s));
      expect(restored.entries[0].metrics.pages).toBe(0);
      expect(
        chartMetrics(restored.habits[0]).find((m) => m.id === "pages")?.label,
      ).toContain("hidden");
      expect(() => saveEntry(restored, entry(custom.id, 1))).toThrow(
        "Mood is required",
      );
    });
    it("validates custom values, whole numbers, choices and links", () => {
      const s = state();
      s.habits[1].fields = [
        fieldSchema.parse({
          id: "count",
          label: "Count",
          type: "number",
          whole: true,
        }),
        fieldSchema.parse({ id: "link", label: "Link", type: "url" }),
        fieldSchema.parse({
          id: "choice",
          label: "Choice",
          type: "choice",
          options: ["a", "b"],
        }),
      ];
      const invalid: Entry["metrics"][] = [
        { count: 0.5 },
        { link: "javascript:alert(1)" },
        { choice: "c" },
      ];
      for (const metrics of invalid)
        expect(() =>
          saveEntry(s, { ...entry(s.habits[1].id, 1), metrics }),
        ).toThrow();
    });
    it("charts individual sets, weight maxima, volume, and exercise filters", () => {
      let s = state();
      const lift = {
        ...s.habits[0],
        kind: "lift" as const,
        fields: [],
        weightUnit: "kg" as const,
      };
      s.habits[0] = lift;
      s = saveEntry(s, {
        ...entry(lift.id, 1),
        exercise: "Bench press",
        sets: [
          { weight: 50, reps: 10 },
          { weight: 60, reps: 8 },
        ],
      });
      s = saveEntry(s, {
        ...entry(lift.id, 1),
        exercise: "Squat",
        sets: [{ weight: 100, reps: 5 }],
      });
      expect(
        metricOn(s, lift, "2026-10-27", "lift-volume", "Bench press").value,
      ).toBe(980);
      expect(metricOn(s, lift, "2026-10-27", "lift-weight").value).toBe(100);
      expect(metricOn(s, lift, "2026-10-27", "lift-sets").value).toBe(3);
      expect(metricOn(s, lift, "2026-10-27", "lift-reps").value).toBe(23);
      expect(metricOn(s, lift, "2026-10-26", "lift-weight").recorded).toBe(
        false,
      );
      expect(() =>
        saveEntry(s, {
          ...entry(lift.id, 1),
          exercise: "Bench",
          sets: [{ weight: -1, reps: 8 }],
        }),
      ).toThrow();
    });
  });
  it("rejects fractional and negative steps", () => {
    const s = state();
    for (const value of [-1, 0.5, Infinity])
      expect(() => saveEntry(s, entry(s.habits[2].id, value))).toThrow();
  });
  it("keeps check-off unique per date and preserves other dates", () => {
    let s = state();
    const habit = s.habits[3];
    s = saveEntry(s, entry(habit.id, 1));
    s = saveEntry(s, entry(habit.id, 1));
    s = saveEntry(s, entry(habit.id, 1, "2026-10-26"));
    expect(s.entries).toHaveLength(2);
  });
  it("retains two practice problems with details and rejects unsafe links", () => {
    let s = state();
    const habit = s.habits[0];
    const problem = {
      ...entry(habit.id, 1),
      difficulty: "medium" as const,
      url: "https://leetcode.com/problems/two-sum/",
      note: "Try a map",
      duration: 24,
    };
    s = saveEntry(s, problem);
    s = saveEntry(s, { ...problem, id: crypto.randomUUID() });
    expect(progress(s, habit, problem.date).value).toBe(2);
    expect(parseBackup(JSON.stringify(s)).entries[0].note).toBe("Try a map");
    expect(() =>
      saveEntry(s, { ...problem, url: "javascript:alert(1)" }),
    ).toThrow();
  });
  it("preserves previous goals and history when archiving", () => {
    const s = state();
    const habit = changeGoal(s.habits[1], "2026-10-28", 10);
    expect(targetOn(habit, "2026-10-27")).toBe(8);
    expect(targetOn(habit, "2026-10-28")).toBe(10);
    const saved = saveEntry(s, entry(habit.id, 4));
    saved.habits[1].archived = true;
    expect(progress(saved, saved.habits[1], "2026-10-27").value).toBe(4);
  });
  it("uses a stable reporting day across midnight and DST", () => {
    expect(
      dayInZone("America/New_York", new Date("2026-10-28T02:00:00Z")),
    ).toBe("2026-10-27");
    expect(shiftDay("2026-03-08", 1)).toBe("2026-03-09");
    expect(shiftDay("2026-11-01", -1)).toBe("2026-10-31");
  });
  it("rejects malformed or inconsistent backups", () => {
    const s = state();
    expect(() => parseBackup("{broken")).toThrow();
    expect(() => parseBackup(JSON.stringify({ ...s, version: 2 }))).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({ ...s, entries: [entry(crypto.randomUUID(), 1)] }),
      ),
    ).toThrow();
    expect(() =>
      saveEntry(s, entry(s.habits[1].id, 1, "2026-02-31")),
    ).toThrow();
  });
});
describe("durable writes", () => {
  it("does not overwrite stale data or turn failed writes into success", () => {
    let raw: string | null = null;
    const storage = {
      getItem: () => raw,
      setItem: (key: string, value: string) => {
        expect(key).toBe(STORAGE_KEY);
        raw = value;
      },
    };
    const next = writeState(storage, null, state());
    expect(parseBackup(next).revision).toBe(1);
    expect(() => writeState(storage, null, state())).toThrow("another window");
    expect(() =>
      writeState(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error("Quota exceeded");
          },
        },
        null,
        state(),
      ),
    ).toThrow("Quota exceeded");
  });
});
