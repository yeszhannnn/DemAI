import { describe, it, expect } from "vitest";
import { gdd, levelFromGdd, defaultSpecies, type SpeciesConfig } from "./pollen";

const birch = defaultSpecies().birch; // 90 / 170 / 300, from 03-01

describe("gdd", () => {
  it("sums max(0, mean - base) per day with base 5", () => {
    expect(gdd([], 5)).toBe(0);
    expect(gdd([5, 10, 0, 20], 5)).toBe(0 + 5 + 0 + 15);
  });
  it("treats any baseC, defaulting to 5", () => {
    expect(gdd([10, 0], 5)).toBe(5);
    expect(gdd([10, 0], 0)).toBe(10);
  });
});

describe("levelFromGdd — phase mapping", () => {
  it("is 0 below start", () => {
    expect(levelFromGdd(0, birch)).toBe(0);
    expect(levelFromGdd(89, birch)).toBe(0);
  });

  it("ramps 1 -> 4 across [start, peak*0.9)", () => {
    expect(levelFromGdd(90, birch)).toBe(1);
    // peak*0.9 = 153; just below it should be ~4
    expect(levelFromGdd(152, birch)).toBe(4);
  });

  it("is 5 in the +/-10% peak window", () => {
    expect(levelFromGdd(153, birch)).toBe(5); // peak*0.9
    expect(levelFromGdd(170, birch)).toBe(5); // peak
    expect(levelFromGdd(187, birch)).toBe(5); // peak*1.1
  });

  it("decays 4 -> 1 across (peak*1.1, end]", () => {
    expect(levelFromGdd(188, birch)).toBe(4);
    // end = 300 -> level 1
    expect(levelFromGdd(300, birch)).toBe(1);
  });

  it("is 0 past end", () => {
    expect(levelFromGdd(301, birch)).toBe(0);
    expect(levelFromGdd(10000, birch)).toBe(0);
  });

  it("stays in 0..5 for every threshold config", () => {
    const configs: Record<string, SpeciesConfig> = defaultSpecies();
    for (const name of Object.keys(configs)) {
      const cfg = configs[name as keyof typeof configs];
      for (let g = 0; g <= cfg.endGdd + 200; g += 17) {
        const lv = levelFromGdd(g, cfg);
        expect(lv).toBeGreaterThanOrEqual(0);
        expect(lv).toBeLessThanOrEqual(5);
      }
    }
  });
});
