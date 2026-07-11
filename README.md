# rmd-uniform-lifetime

IRS **Required Minimum Distribution** (RMD) math — the **Uniform Lifetime Table** and **Single Life Table** from [Publication 590-B](https://www.irs.gov/publications/p590b) (2022+), plus the **SECURE 2.0** required-beginning-age logic. Zero dependencies.

```
npm install rmd-uniform-lifetime
```

## Why

Everyone with a traditional IRA or 401(k) eventually has to take RMDs, and the math is exact: prior-year-end balance ÷ an age-based divisor from an official IRS table. The tables were revised for 2022 and SECURE 2.0 moved the starting age from 72 to 73 (and to 75 in 2033) — a combination that trips up older code. npm had no package with the current tables. This one has them, verified against the IRS's own worked example.

```ts
import { rmdUniformLifetime, requiredBeginningAge } from "rmd-uniform-lifetime";

// IRS Pub 590-B example: $100,000 at age 75 → $4,065
rmdUniformLifetime(100_000, 75);   // 4065.04

requiredBeginningAge(1955);        // 73  (SECURE 2.0)
requiredBeginningAge(1965);        // 75
```

## API

- **`rmdUniformLifetime(priorYearEndBalance, age)`** — an owner's RMD (Table III).
- **`rmdSingleLife(priorYearEndBalance, age, subtractYears?)`** — a beneficiary's RMD (Table I); pass `subtractYears` for the fixed-divisor "stretch" reduction.
- **`rmd(balance, divisor)`** — the primitive; use it with a Joint & Last Survivor divisor (Table II) when the sole beneficiary is a spouse more than 10 years younger.
- **`uniformLifetimeDivisor(age)`** / **`singleLifeDivisor(age)`** — raw table lookups (ages past 120 use the age-120 value).
- **`requiredBeginningAge(birthYear)`** → `72 | 73 | 75` per SECURE 2.0.
- **`isRmdRequired(birthYear, distributionYear)`** — whether an RMD is due that year.
- **`UNIFORM_LIFETIME_TABLE`** / **`SINGLE_LIFE_TABLE`** — the exported tables.

## Scope

Ships the **Uniform Lifetime Table** (owners) and **Single Life Table** (beneficiaries) in full. The **Joint & Last Survivor Table** (Table II) is a large two-dimensional grid indexed by both spouses' ages; rather than risk a transcription error, look up that divisor from IRS Table II and pass it to `rmd(balance, divisor)`. The RMD itself may be deferred to April 1 of the year after the required beginning age, with two distributions then due — the package computes the amount; the April-1 timing is the account holder's to apply. Not tax advice.

## Related

By the same author, a US finance toolkit: [`tips-index-ratio`](https://github.com/moshejs/tips-index-ratio) · [`treasury-fiscaldata`](https://github.com/moshejs/treasury-fiscaldata) · [`tbill`](https://github.com/moshejs/tbill) · [`instrument-identifiers`](https://github.com/moshejs/instrument-identifiers) · [`32nds`](https://github.com/moshejs/32nds).

## Author

Built by **[Moshe Malka](https://moshemalka.com)** — engineering leader in New York City. Studio work at [Quentin.Code](https://www.quentin.software/).

MIT © Moshe Malka
