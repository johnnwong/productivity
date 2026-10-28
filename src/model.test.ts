import { describe, expect, it } from "vitest";
import {
  changeGoal,
  dayInZone,
  parseBackup,
  progress,
  saveEntry,
  shiftDay,
  starterState,
  STORAGE_KEY,
  targetOn,
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
