import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  bankDepthWeeks,
  monthGrid,
  startOfWeek,
  viewRange,
  weekDays,
} from "@/lib/calendar/grid";

describe("calendar grid", () => {
  it("weeks start on Monday", () => {
    expect(startOfWeek("2026-09-03")).toBe("2026-08-31"); // Thursday → Monday
    expect(startOfWeek("2026-08-31")).toBe("2026-08-31");
    expect(startOfWeek("2026-09-06")).toBe("2026-08-31"); // Sunday belongs to the same week
    expect(weekDays("2026-09-03")).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
  });

  it("month grid covers the whole month in full weeks", () => {
    const grid = monthGrid("2026-09-15");
    expect(grid[0][0]).toBe("2026-08-31");
    expect(grid[grid.length - 1][6] >= "2026-09-30").toBe(true);
    expect(grid.every((r) => r.length === 7)).toBe(true);
    expect(grid.length).toBeGreaterThanOrEqual(4);
    expect(grid.length).toBeLessThanOrEqual(6);
  });

  it("date arithmetic crosses month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
    expect(addMonths("2026-12-05", 1)).toBe("2027-01-01");
  });

  it("view range matches the grid", () => {
    expect(viewRange("week", "2026-09-03")).toEqual({ from: "2026-08-31", to: "2026-09-06" });
    const m = viewRange("month", "2026-09-03");
    expect(m.from).toBe("2026-08-31");
    expect(m.to >= "2026-09-30").toBe(true);
  });

  it("bank depth is ready items over the recent weekly rate", () => {
    expect(bankDepthWeeks(6, 8)).toBe(3);
    expect(bankDepthWeeks(3, 0)).toBeNull();
  });
});
