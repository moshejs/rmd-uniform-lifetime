import { describe, expect, it } from "vitest";
import {
  SINGLE_LIFE_TABLE,
  UNIFORM_LIFETIME_TABLE,
  isRmdRequired,
  requiredBeginningAge,
  rmd,
  rmdSingleLife,
  rmdUniformLifetime,
  singleLifeDivisor,
  uniformLifetimeDivisor,
} from "../src/index.js";

describe("reproduces IRS Publication 590-B examples", () => {
  it("Uniform Lifetime: $100,000 at age 75 → $4,065", () => {
    // IRS Pub 590-B worked example (2025): balance 100,000, age 75, divisor 24.6
    expect(uniformLifetimeDivisor(75)).toBe(24.6);
    expect(rmdUniformLifetime(100_000, 75)).toBeCloseTo(4065.04, 2);
    expect(Math.round(rmdUniformLifetime(100_000, 75))).toBe(4065);
  });

  it("Uniform Lifetime table anchors (72, 73, 74) match the IRS figures", () => {
    expect(uniformLifetimeDivisor(72)).toBe(27.4);
    expect(uniformLifetimeDivisor(73)).toBe(26.5);
    expect(uniformLifetimeDivisor(74)).toBe(25.5);
  });

  it("Single Life anchor: age 57 → 29.8 (the IRS Pub 590-B example factor)", () => {
    expect(singleLifeDivisor(57)).toBe(29.8);
  });
});

describe("table integrity", () => {
  it("Uniform Lifetime covers 72–120 with no gaps and decreasing divisors", () => {
    for (let age = 72; age <= 120; age++) {
      expect(UNIFORM_LIFETIME_TABLE[age], `age ${age}`).toBeTypeOf("number");
      if (age > 72) {
        expect(UNIFORM_LIFETIME_TABLE[age]!).toBeLessThanOrEqual(UNIFORM_LIFETIME_TABLE[age - 1]!);
      }
    }
    expect(UNIFORM_LIFETIME_TABLE[120]).toBe(2.0);
  });

  it("Single Life covers 0–120 with no gaps and non-increasing divisors", () => {
    for (let age = 0; age <= 120; age++) {
      expect(SINGLE_LIFE_TABLE[age], `age ${age}`).toBeTypeOf("number");
      if (age > 0) {
        expect(SINGLE_LIFE_TABLE[age]!).toBeLessThanOrEqual(SINGLE_LIFE_TABLE[age - 1]!);
      }
    }
    expect(SINGLE_LIFE_TABLE[0]).toBe(84.6);
    expect(SINGLE_LIFE_TABLE[120]).toBe(1.0);
  });
});

describe("edge ages", () => {
  it("ages beyond 120 use the age-120 divisor", () => {
    expect(uniformLifetimeDivisor(130)).toBe(2.0);
    expect(singleLifeDivisor(130)).toBe(1.0);
  });

  it("Uniform Lifetime throws below age 72", () => {
    expect(() => uniformLifetimeDivisor(71)).toThrow(RangeError);
    expect(() => uniformLifetimeDivisor(70)).toThrow(/starts at age 72/);
  });
});

describe("rmd primitives", () => {
  it("rmd divides balance by divisor", () => {
    expect(rmd(500_000, 25)).toBe(20_000);
  });

  it("single-life stretch subtracts one per year", () => {
    // beneficiary age 55 → 31.6; three years later divisor is 31.6 − 3 = 28.6
    expect(rmdSingleLife(100_000, 55)).toBeCloseTo(100_000 / 31.6, 6);
    expect(rmdSingleLife(100_000, 55, 3)).toBeCloseTo(100_000 / 28.6, 6);
  });

  it("throws when the single-life divisor is exhausted", () => {
    expect(() => rmdSingleLife(100_000, 119, 5)).toThrow(RangeError);
  });

  it("rejects bad balances and divisors", () => {
    expect(() => rmd(-1, 25)).toThrow(RangeError);
    expect(() => rmd(1000, 0)).toThrow(RangeError);
    expect(() => uniformLifetimeDivisor(74.5)).toThrow(RangeError);
  });
});

describe("SECURE 2.0 required beginning age", () => {
  it("maps birth year to 72 / 73 / 75", () => {
    expect(requiredBeginningAge(1949)).toBe(72);
    expect(requiredBeginningAge(1950)).toBe(72);
    expect(requiredBeginningAge(1951)).toBe(73);
    expect(requiredBeginningAge(1959)).toBe(73);
    expect(requiredBeginningAge(1960)).toBe(75);
    expect(requiredBeginningAge(1975)).toBe(75);
  });

  it("isRmdRequired compares age reached in the distribution year", () => {
    // born 1952 → RBD age 73 → first RMD year is 2025 (turns 73)
    expect(isRmdRequired(1952, 2024)).toBe(false); // turns 72
    expect(isRmdRequired(1952, 2025)).toBe(true); // turns 73
    // born 1960 → RBD age 75 → 2035
    expect(isRmdRequired(1960, 2034)).toBe(false);
    expect(isRmdRequired(1960, 2035)).toBe(true);
  });
});
