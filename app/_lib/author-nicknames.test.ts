import { describe, it, expect } from "vitest";
import { buildNicknameMap } from "./author-nicknames";

describe("buildNicknameMap", () => {
  it("maps each userId to its nickname", () => {
    const map = buildNicknameMap([
      { userId: "usr_a", nickname: "alice" },
      { userId: "usr_b", nickname: "bob" },
    ]);

    expect(map.get("usr_a")).toBe("alice");
    expect(map.get("usr_b")).toBe("bob");
    expect(map.size).toBe(2);
  });

  it("collapses an unclaimed nickname to null", () => {
    const map = buildNicknameMap([{ userId: "usr_a", nickname: null }]);

    expect(map.get("usr_a")).toBeNull();
  });

  it("returns an empty map for no entries", () => {
    expect(buildNicknameMap([]).size).toBe(0);
  });

  it("reports a missing author as undefined, distinct from a null nickname", () => {
    // A caller that looks up an id it never passed in must not be handed a
    // nickname; `undefined` and `null` both render as no handle, but only
    // `null` means "this user exists and has not claimed one".
    const map = buildNicknameMap([{ userId: "usr_a", nickname: null }]);

    expect(map.has("usr_a")).toBe(true);
    expect(map.get("usr_missing")).toBeUndefined();
  });

  it("keeps the last entry when an id repeats", () => {
    // resolveAuthorNicknames dedupes before querying, so a repeat would mean
    // Firestore returned two snapshots for one ref — last write wins rather
    // than silently dropping to the earlier value.
    const map = buildNicknameMap([
      { userId: "usr_a", nickname: "old" },
      { userId: "usr_a", nickname: "new" },
    ]);

    expect(map.get("usr_a")).toBe("new");
    expect(map.size).toBe(1);
  });
});
