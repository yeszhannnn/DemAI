import { describe, it, expect } from "vitest";
import {
  computeRisk,
  verdict,
  fPm,
  fPollen,
  fWx,
  multiplier,
  type Profile,
  type Inputs,
} from "./risk";

const baseWeather = { windMs: 3, humidity: 50, precipMm: 0, tempC: 20 };
const noPollen = { wormwood: 0, ragweed: 0, birch: 0 };

function sumPct(r: { breakdown: { pct: number }[] }): number {
  return r.breakdown.reduce((s, b) => s + b.pct, 0);
}

describe("fPm breakpoint table", () => {
  it("is linear within bands and saturates above 150", () => {
    expect(fPm(0)).toBe(0);
    expect(fPm(12)).toBeCloseTo(0.15, 10);
    expect(fPm(35)).toBeCloseTo(0.45, 10);
    expect(fPm(55)).toBeCloseTo(0.7, 10);
    expect(fPm(150)).toBeCloseTo(0.95, 10);
    expect(fPm(200)).toBe(1);
    // midpoint of the 12–35 band
    expect(fPm(23.5)).toBeCloseTo(0.3, 10);
  });

  it("shifts the 0.45 midpoint to personalPm25", () => {
    // personalPm25 = 20 → x = 30 - (20 - 35) = 45 → band 35–55, t=0.5 → 0.575
    expect(fPm(30, 20)).toBeCloseTo(0.575, 10);
    // personalPm25 = 50 → x = 30 - (50 - 35) = 15 → band 12–35, t=3/23 → 0.18913
    expect(fPm(30, 50)).toBeCloseTo(0.15 + (3 / 23) * 0.3, 10);
  });
});

describe("fPollen / fWx / multiplier", () => {
  const profile: Profile = {
    who: "self",
    diagnosis: "pollinosis",
    triggers: ["wormwood", "birch"],
    district: "Бостандық",
    sensitive: false,
  };
  const inputs: Inputs = {
    pm25: 0,
    pollen: { wormwood: 5, ragweed: 2, birch: 3 },
    weather: baseWeather,
  };
  it("takes the max level among selected pollen triggers / 5", () => {
    expect(fPollen(profile, inputs)).toBe(1);
  });
  it("returns 0 when no pollen triggers are selected", () => {
    const p: Profile = { ...profile, triggers: ["pm25"] };
    expect(fPollen(p, inputs)).toBe(0);
  });
  it("aggregates weather aggravators and clamps", () => {
    expect(fWx({ windMs: 1, humidity: 80, precipMm: 0, tempC: 5 })).toBeCloseTo(
      0.8,
      10,
    );
    expect(fWx({ windMs: 1, humidity: 80, precipMm: 3, tempC: 5 })).toBeCloseTo(
      0.4,
      10,
    );
    expect(fWx({ windMs: 5, humidity: 30, precipMm: 5, tempC: 5 })).toBe(0);
  });
  it("applies the sensitivity multiplier per diagnosis", () => {
    const base: Profile = {
      who: "self",
      triggers: [],
      district: "x",
      diagnosis: "pollinosis",
      sensitive: false,
    };
    expect(multiplier({ ...base, diagnosis: "asthma", sensitive: false })).toBe(
      1.15,
    );
    expect(multiplier({ ...base, diagnosis: "both", sensitive: false })).toBe(
      1.25,
    );
    expect(multiplier({ ...base, diagnosis: "unknown", sensitive: false })).toBe(
      1.2,
    );
    expect(
      multiplier({ ...base, diagnosis: "pollinosis", sensitive: true }),
    ).toBe(1.2);
    expect(
      multiplier({ ...base, diagnosis: "pollinosis", sensitive: false }),
    ).toBe(1.0);
  });
});

describe("computeRisk — TVEP integration", () => {
  it("1. clean day → low risk (1–3), thumbs-up chip", () => {
    const profile: Profile = {
      who: "self",
      diagnosis: "pollinosis",
      triggers: ["wormwood"],
      district: "Бостандық",
      sensitive: false,
    };
    const inputs: Inputs = {
      pm25: 5,
      pollen: noPollen,
      weather: baseWeather,
    };
    const r = computeRisk(profile, inputs);
    expect(r.risk).toBe(1);
    expect(r.risk).toBeGreaterThanOrEqual(1);
    expect(r.risk).toBeLessThanOrEqual(3);
    const v = verdict(r.risk);
    expect(v.chipToken).toBe("risk-low");
    expect(v.icon).toBe("thumbs-up");
    expect(sumPct(r)).toBeCloseTo(100, 6);
  });

  it("2. smog + calm → high risk (7–8), alert-triangle", () => {
    const profile: Profile = {
      who: "self",
      diagnosis: "asthma",
      triggers: ["pm25"],
      district: "Бостандық",
      sensitive: false,
    };
    const inputs: Inputs = {
      pm25: 60,
      pollen: noPollen,
      weather: { windMs: 1, humidity: 80, precipMm: 0, tempC: 5 },
    };
    const r = computeRisk(profile, inputs);
    expect(r.risk).toBe(8);
    const v = verdict(r.risk);
    expect(v.chipToken).toBe("risk-high");
    expect(v.icon).toBe("alert-triangle");
    expect(sumPct(r)).toBeCloseTo(100, 6);
  });

  it("3. peak wormwood for a pollinosis profile → pollen is the top contributor", () => {
    const profile: Profile = {
      who: "self",
      diagnosis: "pollinosis",
      triggers: ["wormwood", "birch"],
      district: "Бостандық",
      sensitive: false,
    };
    const inputs: Inputs = {
      pm25: 40,
      pollen: { wormwood: 5, ragweed: 0, birch: 0 },
      weather: { windMs: 1, humidity: 80, precipMm: 0, tempC: 25 },
    };
    const r = computeRisk(profile, inputs);
    expect(r.risk).toBe(7);
    const pollen = r.breakdown.find((b) => b.key === "pollen")!;
    const pm = r.breakdown.find((b) => b.key === "pm")!;
    const wx = r.breakdown.find((b) => b.key === "wx")!;
    expect(pollen.pct).toBeGreaterThan(pm.pct);
    expect(pollen.pct).toBeGreaterThan(wx.pct);
    expect(sumPct(r)).toBeCloseTo(100, 6);
  });

  it("4. rain washout lowers the risk vs the same dry day", () => {
    const profile: Profile = {
      who: "self",
      diagnosis: "pollinosis",
      triggers: ["wormwood", "birch"],
      district: "Бостандық",
      sensitive: false,
    };
    const dry: Inputs = {
      pm25: 30,
      pollen: { wormwood: 5, ragweed: 0, birch: 0 },
      weather: { windMs: 1, humidity: 80, precipMm: 0, tempC: 25 },
    };
    const rainy: Inputs = {
      pm25: 30,
      pollen: { wormwood: 5, ragweed: 0, birch: 0 },
      weather: { windMs: 1, humidity: 80, precipMm: 3, tempC: 25 },
    };
    const rDry = computeRisk(profile, dry);
    const rRainy = computeRisk(profile, rainy);
    expect(rDry.risk).toBe(7);
    expect(rRainy.risk).toBe(6);
    expect(rRainy.risk).toBeLessThan(rDry.risk);
    expect(sumPct(rDry)).toBeCloseTo(100, 6);
    expect(sumPct(rRainy)).toBeCloseTo(100, 6);
  });

  it("5. no pollen triggers → pollen weight (0.35) is redistributed to PM", () => {
    const noPollenProfile: Profile = {
      who: "self",
      diagnosis: "pollinosis",
      triggers: ["pm25", "smoke"],
      district: "Бостандық",
      sensitive: false,
    };
    const pollenProfile: Profile = {
      ...noPollenProfile,
      triggers: ["wormwood"],
    };
    const inputs: Inputs = {
      pm25: 60,
      pollen: noPollen,
      weather: { windMs: 1, humidity: 80, precipMm: 0, tempC: 5 },
    };
    const rNo = computeRisk(noPollenProfile, inputs);
    const rYes = computeRisk(pollenProfile, inputs);
    // Redistribution raises the score: 7 (wPm=0.85) vs 5 (wPm=0.5).
    expect(rNo.risk).toBe(7);
    expect(rYes.risk).toBe(5);
    expect(rNo.risk).toBeGreaterThan(rYes.risk);
    // Pollen contributes nothing and reports 0%.
    expect(rNo.breakdown.find((b) => b.key === "pollen")!.pct).toBe(0);
    expect(sumPct(rNo)).toBeCloseTo(100, 6);
    expect(sumPct(rYes)).toBeCloseTo(100, 6);
  });

  it("6. personalPm25 shifts the result for the same ambient PM2.5", () => {
    const base: Profile = {
      who: "self",
      diagnosis: "asthma",
      triggers: ["pm25"],
      district: "Бостандық",
      sensitive: false,
    };
    const inputs: Inputs = {
      pm25: 30,
      pollen: noPollen,
      weather: baseWeather,
    };
    const rDefault = computeRisk({ ...base }, inputs);
    const rSensitive = computeRisk({ ...base, personalPm25: 20 }, inputs);
    // Default → 4; a lower personal threshold (20 < 35) → 6.
    expect(rDefault.risk).toBe(4);
    expect(rSensitive.risk).toBe(6);
    expect(rSensitive.risk).toBeGreaterThan(rDefault.risk);
    expect(sumPct(rDefault)).toBeCloseTo(100, 6);
    expect(sumPct(rSensitive)).toBeCloseTo(100, 6);
  });
});

describe("verdict bands", () => {
  it("maps every risk level to its chip token and icon", () => {
    expect(verdict(1).chipToken).toBe("risk-low");
    expect(verdict(3).icon).toBe("thumbs-up");
    expect(verdict(4).chipToken).toBe("risk-mid");
    expect(verdict(6).icon).toBe("minus-circle");
    expect(verdict(7).chipToken).toBe("risk-high");
    expect(verdict(8).icon).toBe("alert-triangle");
    expect(verdict(9).chipToken).toBe("risk-severe");
    expect(verdict(10).icon).toBe("alert-triangle");
  });

  it("always carries RU and KK strings", () => {
    for (let r = 1; r <= 10; r++) {
      const v = verdict(r);
      expect(v.textRu.length).toBeGreaterThan(0);
      expect(v.textKk.length).toBeGreaterThan(0);
      expect(v.chipRu.length).toBeGreaterThan(0);
      expect(v.chipKk.length).toBeGreaterThan(0);
    }
  });
});
