# rmd-uniform-lifetime

IRS **Required Minimum Distribution** (RMD) math — the **Uniform Lifetime**, **Single Life** and **Joint and Last Survivor** tables of [26 CFR 1.401(a)(9)-9](https://www.ecfr.gov/current/title-26/section-1.401(a)(9)-9) (Publication 590-B Tables III, I and II; 2022+), plus required-beginning-date logic across the 70½ / SECURE / **SECURE 2.0** eras. Zero dependencies.

```
npm install rmd-uniform-lifetime
```

## Why

Everyone with a traditional IRA or 401(k) eventually has to take RMDs, and the math is exact: prior-year-end balance ÷ an age-based divisor from an official IRS table. The tables were revised for 2022, and the starting age has moved from 70½ to 72 (SECURE, 2020), 73 and, for those born in 1960 or later, 75 (SECURE 2.0) — a combination that trips up older code. This package has the current tables, every value checked against both the regulation and Publication 590-B.

```ts
import { rmdUniformLifetime, rmdOwner, requiredBeginningAge, rmdDeadline } from "rmd-uniform-lifetime";

// IRS Pub 590-B examples (2026 RMD on a $100,000 balance at the end of 2025)
rmdUniformLifetime(100_000, 75); // 4065.04 — Table III, divisor 24.6
rmdOwner(100_000, 75, 64);       // 3952.57 — sole-beneficiary spouse 11 years younger: Table II, 25.3

requiredBeginningAge(1955);      // 73  (SECURE 2.0)
requiredBeginningAge(1965);      // 75
requiredBeginningAge(1949, 3);   // 70.5 (born before July 1, 1949)
rmdDeadline(1955, 2028);         // "2029-04-01" — first year may wait until the required beginning date
rmdDeadline(1955, 2029);         // "2029-12-31"
```

## API

Ages are the ages reached on the birthday in the distribution year.

**Amounts and divisors**

- **`rmdUniformLifetime(priorYearEndBalance, age)`** — an owner's RMD (Table III).
- **`rmdOwner(priorYearEndBalance, ownerAge, soleBeneficiarySpouseAge?)`** / **`ownerDivisor(ownerAge, soleBeneficiarySpouseAge?)`** — picks Table II when the spouse is the sole beneficiary and more than 10 years younger, Table III otherwise (26 CFR 1.401(a)(9)-5(c)). Pass the spouse's age only if the spouse is the sole beneficiary for the whole year.
- **`rmdSingleLife(priorYearEndBalance, age, subtractYears?)`** — a beneficiary's RMD (Table I); pass `subtractYears` for the fixed-divisor reduction by one each later year.
- **`rmd(balance, divisor)`** — the primitive.
- **`uniformLifetimeDivisor(age)`** / **`singleLifeDivisor(age)`** / **`jointLastSurvivorDivisor(age1, age2)`** — raw table lookups (ages past 120 use the "120 and older" value; the Uniform table starts at 72).
- **`UNIFORM_LIFETIME_TABLE`** / **`SINGLE_LIFE_TABLE`** — the exported tables.

**Timing** (owners; `birthMonth` 1–12 is needed only where the rule depends on it — owners born in 1949, and the 70½ year of owners born earlier — and is otherwise optional)

- **`requiredBeginningAge(birthYear, birthMonth?)`** → `70.5 | 72 | 73 | 75` per 26 CFR 1.401(a)(9)-2(b)(2): born before July 1, 1949 → 70½; July 1949–1950 → 72; 1951–1959 → 73; 1960+ → 75.
- **`firstRmdYear(birthYear, birthMonth?)`** — the first distribution calendar year (the year the applicable age, or 70½, is reached).
- **`requiredBeginningDate(birthYear, birthMonth?)`** — April 1 of the following year, `"YYYY-MM-DD"`.
- **`isRmdRequired(birthYear, distributionYear, birthMonth?)`** — whether an RMD is due for that year; `false` for 2020 (CARES Act waiver).
- **`rmdDeadline(birthYear, distributionYear, birthMonth?)`** — `"YYYY-04-01"` of the next year for the first distribution year (two RMDs then fall due that year), `"YYYY-12-31"` otherwise, `null` if none is due.

Invalid inputs throw `RangeError`, including a missing `birthMonth` when the answer depends on it.

## Correctness

- **The regulation**: all three tables were extracted mechanically from the eCFR XML of 26 CFR 1.401(a)(9)-9 ([`test/generate-tables.py`](test/generate-tables.py)); the Single Life and Uniform Lifetime tables match the package's constants value for value (170 values), and the Joint and Last Survivor table is generated from it.
- **Publication 590-B (2025)**: the tests compare every value of Tables I (121), III (49) and II (5,611 printed cells) against [`test/fixtures/pub590b-2025.json`](test/fixtures/pub590b-2025.json), extracted from the IRS PDF. All agree except four Table II cells where the publication differs from the regulation — (90, 76), (112, 102), (112, 103), (112, 107) — this package follows the regulation, whose mirror-image cells agree with it.
- **Internal consistency**: the Uniform Lifetime Table equals the joint table at a 10-year age gap at every age, 72–120.
- **IRS worked examples**: $100,000 at 75 → $4,065 (Table III) and owner 75 / spouse 64 → $3,953 (Table II).

## Scope

Not modelled: the employer-plan exception that delays the required beginning date until retirement for non-5% owners; inherited-account rules beyond the Single Life divisor (the 10-year rule, eligible designated beneficiaries, the 2022 life-expectancy reset of 1.401(a)(9)-9(f)(2)); RMDs for years before 2022, which used the older tables. The 2019 first-year RMD of owners who reached 70½ in 2019, due April 1, 2020, was also waived by the CARES Act if not taken in 2019. For owners born in 1959 the final regulations reserve the rule; 73 follows the 2024 proposed regulations. The regulation prints the (2, 5) and (5, 2) joint-table cells as 88.5 and 88.6; the lookup is symmetric and returns 88.6. Not tax advice.

## Related

By the same author, a US finance toolkit: [`tips-index-ratio`](https://github.com/moshejs/tips-index-ratio) · [`treasury-fiscaldata`](https://github.com/moshejs/treasury-fiscaldata) · [`tbill`](https://github.com/moshejs/tbill) · [`instrument-identifiers`](https://github.com/moshejs/instrument-identifiers) · [`32nds`](https://github.com/moshejs/32nds).

## Author

Built by **[Moshe Malka](https://moshemalka.com)** — engineering leader in New York City. Studio work at [Quentin.Code](https://www.quentin.software/).

MIT © Moshe Malka
