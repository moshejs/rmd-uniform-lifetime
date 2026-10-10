import { describe, expect, it } from "vitest";
import {
  SINGLE_LIFE_TABLE,
  UNIFORM_LIFETIME_TABLE,
  firstRmdYear,
  isRmdRequired,
  jointLastSurvivorDivisor,
  ownerDivisor,
  requiredBeginningAge,
  requiredBeginningDate,
  rmd,
  rmdDeadline,
  rmdOwner,
  rmdSingleLife,
  rmdUniformLifetime,
  singleLifeDivisor,
  uniformLifetimeDivisor,
} from "../src/index.js";
import pub from "./fixtures/pub590b-2025.json";

// Cells where IRS Publication 590-B (2025) Table II prints a different value
// from the regulation, 26 CFR 1.401(a)(9)-9(d). The regulation is internally
// consistent (both mirror-image cells agree) and is what this package uses.
const PUB_VS_CFR: Record<string, { pub: number; cfr: number }> = {
  "90,76": { pub: 14.8, cfr: 14.7 },
  "112,102": { pub: 3.2, cfr: 3.3 },
  "112,103": { pub: 3.1, cfr: 3.2 },
  "112,107": { pub: 2.9, cfr: 3.0 },
};

describe("value-by-value against IRS Publication 590-B (2025), Appendix B", () => {
  it("Table I (Single Life): all 121 ages", () => {
    const t = pub.tableI as Record<string, number>;
    expect(Object.keys(t)).toHaveLength(121);
    for (const [age, v] of Object.entries(t)) expect(singleLifeDivisor(Number(age)), `age ${age}`).toBe(v);
    expect(Object.keys(SINGLE_LIFE_TABLE)).toHaveLength(121);
  });

  it("Table III (Uniform Lifetime): all 49 ages", () => {
    const t = pub.tableIII as Record<string, number>;
    expect(Object.keys(t)).toHaveLength(49);
    for (const [age, v] of Object.entries(t)) expect(uniformLifetimeDivisor(Number(age)), `age ${age}`).toBe(v);
    expect(Object.keys(UNIFORM_LIFETIME_TABLE)).toHaveLength(49);
  });

  it("Table II (Joint and Last Survivor): every printed cell, bar four Pub misprints", () => {
    const t = pub.tableII as Record<string, number>;
    expect(Object.keys(t).length).toBeGreaterThan(5600);
    for (const [key, v] of Object.entries(t)) {
      const [a, b] = key.split(",").map(Number) as [number, number];
      const want = PUB_VS_CFR[key] ? PUB_VS_CFR[key]!.cfr : v;
      if (PUB_VS_CFR[key]) expect(v).toBe(PUB_VS_CFR[key]!.pub);
      expect(jointLastSurvivorDivisor(a, b), key).toBe(want);
    }
  });
});

describe("Joint and Last Survivor table (26 CFR 1.401(a)(9)-9(d))", () => {
  it("IRS Pub 590-B example: owner 75, sole-beneficiary spouse 64 → 25.3 → $3,953", () => {
    expect(jointLastSurvivorDivisor(75, 64)).toBe(25.3);
    expect(ownerDivisor(75, 64)).toBe(25.3);
    expect(Math.round(rmdOwner(100_000, 75, 64))).toBe(3953);
  });

  it("is symmetric and clamps ages past 120", () => {
    expect(jointLastSurvivorDivisor(64, 75)).toBe(25.3);
    expect(jointLastSurvivorDivisor(0, 0)).toBe(91.9);
    expect(jointLastSurvivorDivisor(120, 120)).toBe(1.0);
    expect(jointLastSurvivorDivisor(130, 0)).toBe(84.6);
    expect(jointLastSurvivorDivisor(19, 35)).toBe(jointLastSurvivorDivisor(35, 19));
  });

  it("the Uniform Lifetime Table is exactly the joint table at a 10-year gap", () => {
    // An independent consistency check: the two tables are stored separately.
    for (let age = 72; age <= 120; age++) {
      expect(jointLastSurvivorDivisor(age, age - 10), `age ${age}`).toBe(uniformLifetimeDivisor(age));
    }
  });

  it("ownerDivisor uses the joint table only for a spouse more than 10 years younger", () => {
    expect(ownerDivisor(75)).toBe(24.6);
    expect(ownerDivisor(75, 70)).toBe(24.6);
    expect(ownerDivisor(75, 65)).toBe(24.6); // 10-year gap: identical either way
    expect(ownerDivisor(80, 60)).toBe(jointLastSurvivorDivisor(80, 60));
    expect(() => ownerDivisor(71, 50)).toThrow(RangeError);
  });
});

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

describe("applicable age (26 CFR 1.401(a)(9)-2(b)(2))", () => {
  it("maps date of birth to 70½ / 72 / 73 / 75", () => {
    expect(requiredBeginningAge(1940)).toBe(70.5);
    expect(requiredBeginningAge(1948)).toBe(70.5);
    expect(requiredBeginningAge(1949, 6)).toBe(70.5); // born before July 1, 1949
    expect(requiredBeginningAge(1949, 7)).toBe(72);
    expect(requiredBeginningAge(1950)).toBe(72);
    expect(requiredBeginningAge(1951)).toBe(73);
    expect(requiredBeginningAge(1959)).toBe(73);
    expect(requiredBeginningAge(1960)).toBe(75);
    expect(requiredBeginningAge(1975)).toBe(75);
  });

  it("requires the birth month for 1949 and validates it", () => {
    expect(() => requiredBeginningAge(1949)).toThrow(/birthMonth/);
    expect(() => requiredBeginningAge(1955, 13)).toThrow(RangeError);
    expect(() => requiredBeginningAge(1955.5)).toThrow(RangeError);
  });

  it("first RMD year: the year the applicable age (or 70½) is reached", () => {
    expect(firstRmdYear(1948, 3)).toBe(2018); // 70½ in Sept 2018
    expect(firstRmdYear(1948, 9)).toBe(2019); // 70½ in March 2019
    expect(firstRmdYear(1949, 6)).toBe(2019); // 70½ in Dec 2019
    expect(firstRmdYear(1949, 7)).toBe(2021); // 72 in 2021
    expect(firstRmdYear(1950)).toBe(2022);
    expect(firstRmdYear(1955)).toBe(2028);
    expect(firstRmdYear(1960)).toBe(2035);
    expect(() => firstRmdYear(1948)).toThrow(/birthMonth/);
  });

  it("required beginning date is April 1 of the following year", () => {
    expect(requiredBeginningDate(1955)).toBe("2029-04-01");
    expect(requiredBeginningDate(1949, 2)).toBe("2020-04-01");
  });
});

describe("isRmdRequired and rmdDeadline", () => {
  it("compares the distribution year with the first RMD year", () => {
    // born 1952 → applicable age 73 → first RMD year is 2025 (turns 73)
    expect(isRmdRequired(1952, 2024)).toBe(false); // turns 72
    expect(isRmdRequired(1952, 2025)).toBe(true); // turns 73
    // born 1960 → 75 → 2035
    expect(isRmdRequired(1960, 2034)).toBe(false);
    expect(isRmdRequired(1960, 2035)).toBe(true);
  });

  it("pre-SECURE owners began at 70½ (previously misreported as 72)", () => {
    // born March 1947: 70½ in Sept 2017 → RMDs due for 2017 and 2018, not from 2019
    expect(isRmdRequired(1947, 2017, 3)).toBe(true);
    expect(isRmdRequired(1947, 2018)).toBe(true);
    expect(isRmdRequired(1947, 2016)).toBe(false);
    expect(() => isRmdRequired(1947, 2017)).toThrow(/birthMonth/);
  });

  it("no RMD was required for 2020 (CARES Act waiver)", () => {
    expect(isRmdRequired(1940, 2020)).toBe(false);
    expect(rmdDeadline(1940, 2020)).toBeNull();
    expect(isRmdRequired(1940, 2021)).toBe(true);
  });

  it("deadline: April 1 after the first year, December 31 afterwards", () => {
    expect(rmdDeadline(1955, 2027)).toBeNull();
    expect(rmdDeadline(1955, 2028)).toBe("2029-04-01");
    expect(rmdDeadline(1955, 2029)).toBe("2029-12-31");
    expect(rmdDeadline(1949, 2021, 8)).toBe("2022-04-01");
    expect(rmdDeadline(1949, 2021, 3)).toBe("2021-12-31");
    expect(() => rmdDeadline(1949, 2021)).toThrow(/birthMonth/);
    expect(rmdDeadline(1949, 2022)).toBe("2022-12-31");
  });
});
