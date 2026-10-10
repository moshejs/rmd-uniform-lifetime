/**
 * rmd-uniform-lifetime — IRS Required Minimum Distribution math.
 *
 * The Uniform Lifetime Table (Table III) and Single Life Table (Table I) from
 * IRS Publication 590-B (2022+), plus the SECURE 2.0 required-beginning-age
 * logic. An RMD is the prior-year-end account balance divided by the
 * applicable life-expectancy divisor.
 *
 * Divisors are the official 2022+ tables of 26 CFR 1.401(a)(9)-9 (effective
 * for distribution years beginning on/after 2022-01-01; not indexed, they do
 * not change annually). The Joint and Last Survivor Table (Table II) is in
 * ./joint-table.ts, generated mechanically from the eCFR.
 */

import { JOINT_TABLE_DATA } from "./joint-table.js";

/**
 * IRS Uniform Lifetime Table (Table III), 2022+. Age → distribution period.
 * Used by an IRA/plan owner whose spouse is NOT the sole beneficiary more than
 * 10 years younger. Ages below 72 are not in the published table.
 */
export const UNIFORM_LIFETIME_TABLE: Readonly<Record<number, number>> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2,
  104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4,
  112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3,
  120: 2.0,
};

/**
 * IRS Single Life Table (Table I), 2022+. Age → life expectancy. Used by
 * beneficiaries of inherited IRAs/plans.
 */
export const SINGLE_LIFE_TABLE: Readonly<Record<number, number>> = {
  0: 84.6, 1: 83.7, 2: 82.8, 3: 81.8, 4: 80.8, 5: 79.8, 6: 78.8, 7: 77.9, 8: 76.9,
  9: 75.9, 10: 74.9, 11: 73.9, 12: 72.9, 13: 71.9, 14: 70.9, 15: 69.9, 16: 69.0,
  17: 68.0, 18: 67.0, 19: 66.0, 20: 65.0, 21: 64.1, 22: 63.1, 23: 62.1, 24: 61.1,
  25: 60.2, 26: 59.2, 27: 58.2, 28: 57.3, 29: 56.3, 30: 55.3, 31: 54.4, 32: 53.4,
  33: 52.5, 34: 51.5, 35: 50.5, 36: 49.6, 37: 48.6, 38: 47.7, 39: 46.7, 40: 45.7,
  41: 44.8, 42: 43.8, 43: 42.9, 44: 41.9, 45: 41.0, 46: 40.0, 47: 39.0, 48: 38.1,
  49: 37.1, 50: 36.2, 51: 35.3, 52: 34.3, 53: 33.4, 54: 32.5, 55: 31.6, 56: 30.6,
  57: 29.8, 58: 28.9, 59: 28.0, 60: 27.1, 61: 26.2, 62: 25.4, 63: 24.5, 64: 23.7,
  65: 22.9, 66: 22.0, 67: 21.2, 68: 20.4, 69: 19.6, 70: 18.8, 71: 18.0, 72: 17.2,
  73: 16.4, 74: 15.6, 75: 14.8, 76: 14.1, 77: 13.3, 78: 12.6, 79: 11.9, 80: 11.2,
  81: 10.5, 82: 9.9, 83: 9.3, 84: 8.7, 85: 8.1, 86: 7.6, 87: 7.1, 88: 6.6, 89: 6.1,
  90: 5.7, 91: 5.3, 92: 4.9, 93: 4.6, 94: 4.3, 95: 4.0, 96: 3.7, 97: 3.4, 98: 3.2,
  99: 3.0, 100: 2.8, 101: 2.6, 102: 2.5, 103: 2.3, 104: 2.2, 105: 2.1, 106: 2.1,
  107: 2.1, 108: 2.0, 109: 2.0, 110: 2.0, 111: 2.0, 112: 2.0, 113: 1.9, 114: 1.9,
  115: 1.8, 116: 1.8, 117: 1.6, 118: 1.4, 119: 1.1, 120: 1.0,
};

const UNIFORM_MIN_AGE = 72;
const TABLE_MAX_AGE = 120; // "120 and older" uses the age-120 divisor

function checkAge(age: number, label: string): void {
  if (!Number.isInteger(age) || age < 0) {
    throw new RangeError(`${label} must be a non-negative integer, got ${age}`);
  }
}

function checkBalance(balance: number): void {
  if (!Number.isFinite(balance) || balance < 0) {
    throw new RangeError(`balance must be a non-negative number, got ${balance}`);
  }
}

/**
 * Uniform Lifetime distribution period for an owner's age. Ages ≥ 120 use the
 * age-120 divisor (2.0). Throws below age 72 (not in the table).
 *
 * ```ts
 * uniformLifetimeDivisor(75); // 24.6
 * ```
 */
export function uniformLifetimeDivisor(age: number): number {
  checkAge(age, "age");
  if (age < UNIFORM_MIN_AGE) {
    throw new RangeError(`Uniform Lifetime Table starts at age ${UNIFORM_MIN_AGE}, got ${age}`);
  }
  return UNIFORM_LIFETIME_TABLE[Math.min(age, TABLE_MAX_AGE)]!;
}

/**
 * Single Life expectancy for a beneficiary's age. Ages ≥ 120 use the age-120
 * value (1.0).
 */
export function singleLifeDivisor(age: number): number {
  checkAge(age, "age");
  return SINGLE_LIFE_TABLE[Math.min(age, TABLE_MAX_AGE)]!;
}

/**
 * Required minimum distribution from a balance and a divisor:
 * `priorYearEndBalance / divisor`. The general primitive — use it directly
 * with a Joint & Last Survivor divisor from IRS Table II when applicable.
 */
export function rmd(priorYearEndBalance: number, divisor: number): number {
  checkBalance(priorYearEndBalance);
  if (!Number.isFinite(divisor) || divisor <= 0) {
    throw new RangeError(`divisor must be a positive number, got ${divisor}`);
  }
  return priorYearEndBalance / divisor;
}

/**
 * RMD for an owner using the Uniform Lifetime Table.
 *
 * ```ts
 * // IRS Pub 590-B example: $100,000 at age 75 → $4,065
 * rmdUniformLifetime(100_000, 75); // 4065.0406...
 * ```
 */
export function rmdUniformLifetime(priorYearEndBalance: number, age: number): number {
  return rmd(priorYearEndBalance, uniformLifetimeDivisor(age));
}

/**
 * RMD for a beneficiary using the Single Life Table. For the "stretch"
 * subtraction method (fixed divisor reduced by 1 each subsequent year), pass
 * `subtractYears` — the number of years since the first RMD year.
 */
export function rmdSingleLife(
  priorYearEndBalance: number,
  age: number,
  subtractYears = 0,
): number {
  if (!Number.isInteger(subtractYears) || subtractYears < 0) {
    throw new RangeError(`subtractYears must be a non-negative integer, got ${subtractYears}`);
  }
  const divisor = singleLifeDivisor(age) - subtractYears;
  if (divisor <= 0) {
    throw new RangeError(
      `Single Life divisor is exhausted (${singleLifeDivisor(age)} − ${subtractYears} ≤ 0)`,
    );
  }
  return rmd(priorYearEndBalance, divisor);
}

/**
 * Joint and Last Survivor life expectancy (Table II, 26 CFR 1.401(a)(9)-9(d))
 * for two ages as of their birthdays in the distribution year. Symmetric in
 * its arguments; ages ≥ 120 use the "120 and older" column.
 *
 * ```ts
 * jointLastSurvivorDivisor(75, 64); // 25.3 (IRS Pub 590-B example)
 * ```
 */
export function jointLastSurvivorDivisor(age1: number, age2: number): number {
  checkAge(age1, "age1");
  checkAge(age2, "age2");
  const a = Math.min(Math.max(age1, age2), TABLE_MAX_AGE);
  const b = Math.min(Math.min(age1, age2), TABLE_MAX_AGE);
  const k = 2 * ((a * (a + 1)) / 2 + b);
  return parseInt(JOINT_TABLE_DATA.slice(k, k + 2), 36) / 10;
}

/**
 * The owner's applicable denominator for a lifetime RMD (26 CFR
 * 1.401(a)(9)-5(c)): the Joint and Last Survivor divisor if the owner's
 * spouse is the SOLE beneficiary for the whole year and more than 10 years
 * younger, otherwise the Uniform Lifetime divisor. Pass the spouse's age only
 * when the spouse is the sole beneficiary.
 *
 * (A spouse exactly 10 years younger by age-in-year gets the same number
 * either way — the Uniform table is the joint table at a 10-year gap.)
 *
 * ```ts
 * ownerDivisor(75);     // 24.6 (Uniform Lifetime)
 * ownerDivisor(75, 64); // 25.3 (spouse 11 years younger → Joint and Last Survivor)
 * ```
 */
export function ownerDivisor(ownerAge: number, soleBeneficiarySpouseAge?: number): number {
  const uniform = uniformLifetimeDivisor(ownerAge);
  if (soleBeneficiarySpouseAge === undefined) return uniform;
  checkAge(soleBeneficiarySpouseAge, "soleBeneficiarySpouseAge");
  return ownerAge - soleBeneficiarySpouseAge > 10
    ? jointLastSurvivorDivisor(ownerAge, soleBeneficiarySpouseAge)
    : uniform;
}

/**
 * An owner's RMD, choosing the table automatically (see {@link ownerDivisor}).
 *
 * ```ts
 * rmdOwner(100_000, 75, 64); // 3952.57 — IRS Pub 590-B: $3,953
 * ```
 */
export function rmdOwner(
  priorYearEndBalance: number,
  ownerAge: number,
  soleBeneficiarySpouseAge?: number,
): number {
  return rmd(priorYearEndBalance, ownerDivisor(ownerAge, soleBeneficiarySpouseAge));
}

/** The applicable age for RMDs: 70½ (pre-SECURE), 72 (SECURE), 73 or 75 (SECURE 2.0). */
export type ApplicableAge = 70.5 | 72 | 73 | 75;

function checkBirth(birthYear: number, birthMonth: number | undefined): void {
  if (!Number.isInteger(birthYear)) {
    throw new RangeError(`birthYear must be an integer, got ${birthYear}`);
  }
  if (birthMonth !== undefined && (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12)) {
    throw new RangeError(`birthMonth must be an integer 1–12, got ${birthMonth}`);
  }
}

/**
 * The applicable age at which RMDs must begin, from the owner's date of birth
 * (26 CFR 1.401(a)(9)-2(b)(2); IRC §401(a)(9)(C) as amended by SECURE and
 * SECURE 2.0):
 * - born before July 1, 1949 → 70½
 * - born July 1, 1949 – 1950 → 72
 * - born 1951–1959 → 73
 * - born 1960 or later → 75
 *
 * `birthMonth` (1–12) is required only for owners born in 1949. For 1959 the
 * final regulations reserve the rule; 73 follows the 2024 proposed
 * regulations (§1.401(a)(9)-2(b)(2)(v)).
 *
 * ```ts
 * requiredBeginningAge(1955); // 73
 * requiredBeginningAge(1949, 3); // 70.5
 * ```
 */
export function requiredBeginningAge(birthYear: number, birthMonth?: number): ApplicableAge {
  checkBirth(birthYear, birthMonth);
  if (birthYear < 1949) return 70.5;
  if (birthYear === 1949) {
    if (birthMonth === undefined) {
      throw new RangeError(
        "born in 1949: the applicable age is 70½ if born before July 1, otherwise 72 — pass birthMonth",
      );
    }
    return birthMonth <= 6 ? 70.5 : 72;
  }
  if (birthYear <= 1950) return 72;
  if (birthYear <= 1959) return 73;
  return 75;
}

/** Possible first-RMD years [earliest, latest] when the birth month is unknown. */
function firstYearRange(birthYear: number, birthMonth: number | undefined): [number, number] {
  checkBirth(birthYear, birthMonth);
  if (birthYear < 1949 || (birthYear === 1949 && (birthMonth ?? 1) <= 6)) {
    // 70½ is reached in the birth year + 70 if born January–June, else + 71.
    if (birthMonth !== undefined) {
      const y = birthYear + (birthMonth <= 6 ? 70 : 71);
      return [y, y];
    }
    // 1949 with unknown month: 70½ in 2019 (Jan–Jun) or age 72 in 2021 (Jul–Dec).
    return birthYear === 1949 ? [2019, 2021] : [birthYear + 70, birthYear + 71];
  }
  const y = birthYear + requiredBeginningAge(birthYear, birthMonth);
  return [y, y];
}

/**
 * The owner's first distribution calendar year — the year the applicable age
 * is reached. Its RMD may be delayed to the required beginning date (April 1
 * of the next year). `birthMonth` is required for owners born before July 1949
 * (the year 70½ was reached depends on it).
 *
 * ```ts
 * firstRmdYear(1955); // 2028
 * ```
 */
export function firstRmdYear(birthYear: number, birthMonth?: number): number {
  const [lo, hi] = firstYearRange(birthYear, birthMonth);
  if (lo !== hi) {
    throw new RangeError(`the first RMD year for an owner born in ${birthYear} depends on birthMonth`);
  }
  return lo;
}

/**
 * The required beginning date (ISO "YYYY-MM-DD"): April 1 of the year after
 * the first distribution calendar year. (Employer plans may delay this to
 * April 1 after retirement for non-5% owners — not modelled.)
 *
 * ```ts
 * requiredBeginningDate(1955); // "2029-04-01"
 * ```
 */
export function requiredBeginningDate(birthYear: number, birthMonth?: number): string {
  return `${firstRmdYear(birthYear, birthMonth) + 1}-04-01`;
}

/**
 * True if the owner must take an RMD for a given distribution year: the year
 * is the first distribution calendar year or later — except 2020, for which
 * the CARES Act (§2203) waived RMDs. `birthMonth` is needed only when the
 * answer depends on it (owners born before July 1949, in their 70½ year).
 *
 * ```ts
 * isRmdRequired(1952, 2025); // true — turns 73
 * ```
 */
export function isRmdRequired(birthYear: number, distributionYear: number, birthMonth?: number): boolean {
  if (!Number.isInteger(distributionYear)) {
    throw new RangeError(`distributionYear must be an integer, got ${distributionYear}`);
  }
  const [lo, hi] = firstYearRange(birthYear, birthMonth);
  if (distributionYear === 2020) return false; // CARES Act waiver
  if (distributionYear >= hi) return true;
  if (distributionYear < lo) return false;
  throw new RangeError(
    `whether an RMD is due in ${distributionYear} for an owner born in ${birthYear} depends on birthMonth`,
  );
}

/**
 * The deadline (ISO "YYYY-MM-DD") for the RMD of a distribution year, or
 * `null` if none is required: April 1 of the next year for the first
 * distribution calendar year (two RMDs then fall due in that next year),
 * December 31 of the year otherwise.
 *
 * ```ts
 * rmdDeadline(1955, 2028); // "2029-04-01"
 * rmdDeadline(1955, 2029); // "2029-12-31"
 * ```
 */
export function rmdDeadline(birthYear: number, distributionYear: number, birthMonth?: number): string | null {
  if (!isRmdRequired(birthYear, distributionYear, birthMonth)) return null;
  const [lo, hi] = firstYearRange(birthYear, birthMonth);
  if (distributionYear > hi) return `${distributionYear}-12-31`;
  if (lo !== hi) {
    throw new RangeError(`the RMD deadline for an owner born in ${birthYear} depends on birthMonth`);
  }
  return `${distributionYear + 1}-04-01`;
}
