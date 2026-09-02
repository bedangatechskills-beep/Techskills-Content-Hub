import { describe, expect, it } from "vitest";
import { diffStats, wordDiff } from "@/lib/script/diff";

describe("wordDiff", () => {
  it("returns a single equal op for identical text", () => {
    expect(wordDiff("a b c", "a b c")).toEqual([{ type: "equal", text: "a b c" }]);
  });
  it("marks inserted and deleted words", () => {
    const ops = wordDiff("Book a call today", "Book a free consultation today");
    expect(ops.some((o) => o.type === "insert" && o.text.includes("free"))).toBe(true);
    expect(ops.some((o) => o.type === "delete" && o.text.includes("call"))).toBe(true);
    expect(diffStats(ops)).toEqual({ inserted: 2, deleted: 1 });
  });
  it("preserves line breaks in equal runs", () => {
    const ops = wordDiff("line one\nline two", "line one\nline two");
    expect(ops[0].text).toContain("\n");
  });
  it("handles empty sides", () => {
    expect(wordDiff("", "new text")).toEqual([{ type: "insert", text: "new text" }]);
    expect(wordDiff("old", "")).toEqual([{ type: "delete", text: "old" }]);
  });
});
