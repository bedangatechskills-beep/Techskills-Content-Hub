import { describe, expect, it } from "vitest";
import { formatDuration, statusStyle, STATUS_STYLES, timeAgo } from "@/lib/workflow/statuses";

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(4 * 3600 + 26 * 60)).toBe("4 hrs 26 mins");
  });
  it("formats days and hours", () => {
    expect(formatDuration(2 * 86400 + 4 * 3600)).toBe("2 days 4 hrs");
  });
  it("formats minutes only and seconds only", () => {
    expect(formatDuration(5 * 60)).toBe("5 mins");
    expect(formatDuration(38)).toBe("38 secs");
  });
  it("handles null", () => {
    expect(formatDuration(null)).toBe("—");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  it("reports minutes", () => {
    expect(timeAgo("2026-09-02T09:26:00Z", now)).toBe("34 min ago");
  });
  it("reports hours and days", () => {
    expect(timeAgo("2026-09-02T07:00:00Z", now)).toBe("3 hrs ago");
    expect(timeAgo("2026-08-30T10:00:00Z", now)).toBe("3 days ago");
  });
});

describe("statusStyle", () => {
  it("falls back to grey for unknown keys", () => {
    expect(statusStyle("nope")).toBe(STATUS_STYLES.grey);
    expect(statusStyle(null)).toBe(STATUS_STYLES.grey);
  });
  it("maps every documented colour", () => {
    for (const k of [
      "grey",
      "blue",
      "lavender",
      "cyan",
      "brand_blue",
      "amber",
      "orange",
      "indigo",
      "purple",
      "green",
      "teal",
      "dark_green",
      "slate",
    ]) {
      expect(statusStyle(k).pill.length).toBeGreaterThan(0);
    }
  });
});
