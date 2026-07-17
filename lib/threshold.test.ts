import { describe, it, expect } from "vitest";
import { computePersonalPm25 } from "./threshold";

describe("computePersonalPm25 — self-learning loop", () => {
  it("1. returns null when there is not enough data", () => {
    // Too few total rows.
    expect(
      computePersonalPm25([
        { feeling: 3, pm25: 40 },
        { feeling: 3, pm25: 40 },
        { feeling: 3, pm25: 40 },
        { feeling: 1, pm25: 10 },
      ]),
    ).toBe(null);

    // 7 total rows but only 2 «Плохо» — below the 3-bad minimum.
    expect(
      computePersonalPm25([
        { feeling: 3, pm25: 40 },
        { feeling: 3, pm25: 40 },
        { feeling: 1, pm25: 10 },
        { feeling: 1, pm25: 12 },
        { feeling: 2, pm25: 20 },
        { feeling: 1, pm25: 9 },
        { feeling: 2, pm25: 18 },
      ]),
    ).toBe(null);

    // Empty input.
    expect(computePersonalPm25([])).toBe(null);
  });

  it("2. clean median — 3 bad rows out of 7, median is the middle pm25", () => {
    const rows = [
      { feeling: 1, pm25: 10 },
      { feeling: 2, pm25: 18 },
      { feeling: 1, pm25: 12 },
      { feeling: 3, pm25: 30 }, // bad
      { feeling: 2, pm25: 22 },
      { feeling: 3, pm25: 35 }, // bad (middle of 3)
      { feeling: 3, pm25: 40 }, // bad
    ];
    // bad pm25 sorted = [30, 35, 40] → median = 35 → within [20, 80] → 35.
    expect(computePersonalPm25(rows)).toBe(35);
  });

  it("3. clamps the median to [20, 80]", () => {
    // Median below 20 → clamped up to 20.
    const lowRows = [
      { feeling: 1, pm25: 5 },
      { feeling: 1, pm25: 6 },
      { feeling: 1, pm25: 7 },
      { feeling: 2, pm25: 8 },
      { feeling: 3, pm25: 8 }, // bad
      { feeling: 3, pm25: 10 }, // bad (middle)
      { feeling: 3, pm25: 12 }, // bad
    ];
    // bad pm25 sorted = [8, 10, 12] → median = 10 → clamp to 20.
    expect(computePersonalPm25(lowRows)).toBe(20);

    // Median above 80 → clamped down to 80.
    const highRows = [
      { feeling: 1, pm25: 5 },
      { feeling: 1, pm25: 6 },
      { feeling: 1, pm25: 7 },
      { feeling: 2, pm25: 8 },
      { feeling: 3, pm25: 90 }, // bad
      { feeling: 3, pm25: 120 }, // bad (middle)
      { feeling: 3, pm25: 150 }, // bad
    ];
    // bad pm25 sorted = [90, 120, 150] → median = 120 → clamp to 80.
    expect(computePersonalPm25(highRows)).toBe(80);
  });

  it("averages the two middle values for an even number of bad rows", () => {
    // 8 total rows, 4 bad → median = avg(30, 40) = 35.
    const rows = [
      { feeling: 1, pm25: 10 },
      { feeling: 1, pm25: 12 },
      { feeling: 2, pm25: 18 },
      { feeling: 2, pm25: 20 },
      { feeling: 3, pm25: 30 }, // bad
      { feeling: 3, pm25: 35 }, // bad (lower-middle)
      { feeling: 3, pm25: 45 }, // bad (upper-middle)
      { feeling: 3, pm25: 50 }, // bad
    ];
    // bad pm25 sorted = [30, 35, 45, 50] → median = (35 + 45) / 2 = 40.
    expect(computePersonalPm25(rows)).toBe(40);
  });
});
