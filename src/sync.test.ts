import { describe, expect, it } from "vitest";
import { fingerprint, syncAction } from "./sync";
import { starterState } from "./model";

describe("conflict-safe sync decisions", () => {
  const base = { revision: 3, fingerprint: "old" };
  it("requires explicit setup instead of automatically publishing local records", () => {
    expect(syncAction("local", null, null, 0)).toBe("setup");
    expect(syncAction("local", "remote", null, 3)).toBe("setup");
  });
  it("pushes only when the cloud revision is unchanged", () => {
    expect(syncAction("edited", "old", base, 3)).toBe("push");
    expect(syncAction("edited", "remote-edit", base, 4)).toBe("conflict");
  });
  it("pulls remote changes only when local data matches the acknowledged baseline", () => {
    expect(syncAction("old", "new", base, 4)).toBe("pull");
    expect(syncAction("old", null, base, 0)).toBe("conflict");
    expect(syncAction("same", "same", base, 4)).toBe("equal");
  });
  it("ignores local write revisions but detects entry deletion and habit edits", () => {
    const s = starterState("UTC");
    expect(fingerprint({ ...s, revision: 5 })).toBe(fingerprint(s));
    expect(fingerprint({ ...s, habits: [] })).not.toBe(fingerprint(s));
  });
});
