import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetGroup, listKnownGroups, rememberGroup } from "../groups";

const KEY = "rozliczenia:known-groups";

// jsdom is not configured for this suite, so stand in a minimal store.
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

beforeEach(() => store.clear());

describe("known groups registry", () => {
  it("remembers a group and reads it back", () => {
    rememberGroup("aaa", "Wyjazd");
    expect(listKnownGroups().map((g) => g.slug)).toEqual(["aaa"]);
    expect(listKnownGroups()[0].name).toBe("Wyjazd");
  });

  it("puts the most recently opened group first", async () => {
    rememberGroup("aaa", "Pierwsza");
    await new Promise((r) => setTimeout(r, 5));
    rememberGroup("bbb", "Druga");
    expect(listKnownGroups().map((g) => g.slug)).toEqual(["bbb", "aaa"]);
  });

  it("updates the name instead of duplicating the slug", () => {
    rememberGroup("aaa", "Stara nazwa");
    rememberGroup("aaa", "Nowa nazwa");
    const all = listKnownGroups();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Nowa nazwa");
  });

  it("forgets a group without touching the others", () => {
    rememberGroup("aaa", "A");
    rememberGroup("bbb", "B");
    forgetGroup("aaa");
    expect(listKnownGroups().map((g) => g.slug)).toEqual(["bbb"]);
  });

  it("ignores an empty slug", () => {
    rememberGroup("", "Nic");
    expect(listKnownGroups()).toHaveLength(0);
  });

  // A half-written or hand-edited value must not take the app down on boot.
  it("survives malformed storage", () => {
    store.set(KEY, "{not json");
    expect(listKnownGroups()).toEqual([]);

    store.set(KEY, JSON.stringify([{ slug: "ok", name: "Dobra" }, { junk: true }, null]));
    expect(listKnownGroups().map((g) => g.slug)).toEqual(["ok"]);
  });
});
