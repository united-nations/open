# OPPFB data vs. `un-secretariat-expenses.csv`

Comparison of the two UN Secretariat expense sources currently in `data/`:

- **`data/un-secretariat-expenses.csv`** — the established extract behind the current
  [open.un.org Secretariat expenses view](https://open.un.org/un-secretariat-financials/expenses?tab=second).
  1,738 rows, 2019–2023.
- **`data/oppfb/`** — three workbooks from OPPFB (Office of Programme Planning, Finance and Budget),
  covering a similar Secretariat scope but built from the budget/ERP side.

**Headline: the two agree exactly where they overlap.** OPPFB is not a competing measurement of the
same thing — it is the *Regular Budget pillar only*, reproduced from source at much finer grain and
extended forward in time. It reconciles to the cent against the CSV, but it cannot replace it,
because it does not contain peacekeeping or voluntary money at all.

---

## 1. The three OPPFB workbooks

| File | Sheet | Shape | Period | What it is |
|---|---|---|---|---|
| `Appropriation and Expenditure.xlsx` | `1. Data Model` | 54,066 × 11 | 2021–2025 | Monthly RB appropriation **and** expenditure, by section × entity × object of expenditure |
| `BIP RB - Monthly Expenditures up to 2026-02-05.xlsx` | `Sheet1` | 595,784 × 13 | 2025 only | Same, plus **functional area** (392) and **funds center** (1,132); latest vintage |
| `Approved budget 2026 1 (1).xlsx` | `Data` + 4 summaries | 14,701 × 17 | 2026 | Forward-looking **approved budget**, with subprogramme and commitment item |

All three are **Regular Budget only** (`FUND = 10UNA`). None contains peacekeeping assessments or
voluntary contributions.

## 2. The reconciliation

The CSV's `SOURCE_TYPE = "Regular assessed"` and OPPFB's `AMOUNT_TYPE = "Expenditure"` are the
**same measure**:

| Year | CSV `Regular assessed` | OPPFB expenditure | Diff |
|---|---|---|---|
| 2019 | 3,057,141,820 | — | not covered |
| 2020 | 3,017,395,482 | — | not covered |
| 2021 | 3,017,846,005 | 3,017,480,020 | **−365,985** (−0.012%) |
| 2022 | 3,236,269,601 | 3,236,269,596 | **−4.73** (rounding) |
| 2023 | 3,370,212,262 | 3,370,212,261 | **−0.77** (rounding) |
| 2024 | — | 3,361,198,000 | CSV stops at 2023 |
| 2025 | — | 2,467,199,000 | partial year (Jan–Sep) |

This holds **section by section**, not just in aggregate: for 2023 all 42 budget sections match to
sub-dollar rounding. The agreement is structural, not coincidental.

The 2021 gap of −366k is spread thinly across ~15 sections (largest: section 3 −184k, section 29B
−64k), always with OPPFB *slightly lower*. This is consistent with OPPFB being a **later restatement**
of 2021 than the CSV snapshot — worth a note, not a blocker.

## 3. What each source uniquely has

### Only in the CSV

- **The other two thirds of the money.** OPPFB covers just the Regular Budget. The CSV also carries:

  | Pillar | 2019 | 2020 | 2021 | 2022 | 2023 |
  |---|---|---|---|---|---|
  | Regular assessed *(= OPPFB)* | 3.06 | 3.02 | 3.02 | 3.24 | 3.37 |
  | **Other Assessed** (peacekeeping) | 7.21 | 6.80 | 6.70 | 6.48 | 6.46 |
  | **Voluntary** | 4.03 | 4.06 | 4.04 | 5.06 | 4.96 |

  *USD billions.* The Regular Budget is only **~22%** of the CSV's total. Peacekeeping is the single
  largest pillar and is entirely absent from OPPFB.
- **2019 and 2020**, which OPPFB does not reach back to.
- **`PRIORITY_AREA`** (9 values, e.g. "Maintenance of international peace and security") — the
  policy-facing dimension the current site groups by. OPPFB has no equivalent.
- **Peacekeeping fiscal years** (`FINANCIAL_YEAR` = `2018/19`, `2019/20`, `2022/23`) alongside
  calendar years — OPPFB is calendar-only.
- **`REFERENCE`** provenance per row (`A/79/6`, `Financial Statement`, …), which is what makes the
  CSV auditable.

### Only in OPPFB

- **Monthly granularity.** The CSV is annual; OPPFB is 12 months per year (incremental, not
  cumulative). This is a genuinely new axis — burn-rate/seasonality is currently unshowable.
- **Object of expenditure** (17 values: Posts, Consultants, Travel, Contractual services, Grants…).
  The CSV has no "what was the money spent *on*" dimension at all. Posts alone are ~$1.55bn of the
  2026 budget.
- **Appropriation vs. expenditure** side by side → **budget implementation / utilisation rate**,
  e.g. 2021: 3.22bn appropriated vs 3.02bn spent (93.6%). The CSV has no budget baseline.
- **2024, 2025 and 2026** — three years beyond the CSV's 2023 cutoff, including a *forward-looking*
  approved budget.
- **SPM cluster typing** (`Non-SPM`, `SPM-Cluster I–IV`, `SPM-RSCE Support`) — Special Political
  Mission grouping the CSV lacks.
- **Deep operational detail** in the BIP file: functional area, funds center, commitment item,
  subprogramme (231 in 2026).

## 4. Entity dimension: same size, different codebook

Both sources carry exactly **153 entities** — but the code schemes differ and must be mapped.

- OPPFB prefixes the section number: `1-DESA`, `10-OD_UNOV`. Strip the prefix and **82** codes match
  the CSV directly.
- Much of the residual is **naming variants**, not real gaps: `DEV-ACCT`↔`DA`, `ICSC`↔`JFA_ICSC`,
  `JIU`↔`JFA_JIU`, `OMBUD`↔`OMBUDSM`, `CMP-CYPRUS`↔`CMPCYPRU`, `IM-MYANMAR`↔`IM_MMR`,
  `CONS`↔`CONSTRUCTION`, `IIIM`↔`IIIM Syria`, `PESG-WSAHARA`↔`PESG Western Sahara`. A mapping table
  in `python/utils.py` (alongside `ENTITY_MAPPING`) would close most of these.
- The **genuinely** CSV-only entities are the ones OPPFB structurally cannot have:
  - *peacekeeping missions* — MONUSCO, UNIFIL, MINURSO, MINUSCA, UNDOF, UNISFA, UNMIK, UNSOS, UNLB,
    AMISOM, UNAMID, MINUJUSTH, MICT, UNAKRT
  - *voluntary-funded bodies* — UN-HABITAT, UNDRR, UNRISD, UNIDIR, UNAOC, UNGCO, UNMAS, `MPTF-*`, JPO

  These hold **$20.1bn of "Other Assessed"** and **$3.1bn of "Voluntary"** across 2019–2023.
- 79.7% of the CSV's *Regular assessed* money already sits on entities OPPFB also carries; the
  remainder is mostly the naming variants above.

## 5. The two 2025 files disagree — and BIP is right

`Appropriation and Expenditure.xlsx` is a **stale extract**: its 2025 data stops at **September**
(2.47bn). The BIP file runs through **December** and was posted up to 2026-02-05 (3.50bn).

Even for the months they share (Jan–Sep), BIP is **$60.0m higher (+2.4%)** — retroactive postings
booked after the earlier extract was cut, plus BIP carrying `Others`/`SPM` rows the other file types
differently. **Prefer BIP for 2025.** Note BIP flattens SPMs into a single `SPM` type, losing the
cluster breakdown, so the two are complementary rather than one strictly dominating.

## 6. Subprogramme: absent from both expenditure datasets, but recoverable for 2025

Neither actuals dataset carries a subprogramme column. The CSV's finest grain is
section × entity × priority area; `Appropriation and Expenditure.xlsx` stops at
section × entity × object of expenditure. For **2019–2024 there is no subprogramme breakdown at
all**.

Two OPPFB files change this for 2025–2026:

- **`Approved budget 2026`** has `SUBPROGRAMME` explicitly — 231 of them, with a dedicated
  `Summary by subprogramme` sheet. Budget only, 2026 only, no actuals.
- **BIP** has no subprogramme column, but it does have **`Functional area`** (393 values) — and the
  2026 file carries *both* `FUNCTIONAL_AREA` and `SUBPROGRAMME`, so it **is a crosswalk**.

The crosswalk is clean: of 325 functional areas in the 2026 file, **zero map to more than one
subprogramme**. Applying it to the 2025 BIP actuals:

| Entity type | Mapped to a subprogramme | Unmapped |
|---|---|---|
| Non-SPM | **$2,788.5m (100.0%)** | $0.9m |
| SPM | — | $706.4m |

The unmapped remainder is *entirely* Special Political Missions, and that is by design rather than a
gap: the 2026 file assigns every SPM a single placeholder subprogramme (`SPM`), because SPMs are not
structured into subprogrammes.

**So subprogramme-level actuals are obtainable for 2025 Regular Budget (non-SPM)** by joining BIP's
functional area to the 2026 crosswalk — a dimension the CSV cannot produce for any year. Caveat: this
applies a 2026 structure to 2025 actuals. That essentially every non-SPM functional area matched
suggests the structure was stable across the two years, but it is an assumption, and it does **not**
extend back to 2019–2024.

## 7. What this means for the portal

1. **OPPFB is safe to trust.** The exact section-level tie-out to the known-reliable CSV is strong
   validation of both.
2. **It is not a replacement.** Swapping the CSV for OPPFB would silently drop **77.2%** (2023) of
   Secretariat expenditure — all peacekeeping and voluntary money — and lose `PRIORITY_AREA`.
3. **Use it to extend, not substitute:**
   - **forward in time** — Regular Budget actuals for 2024/2025 and approved budget for 2026, where
     the CSV has nothing;
   - **inward in detail** — object of expenditure, monthly burn rate, appropriation-vs-actual
     utilisation, all new dimensions for the Regular Budget slice;
   - the CSV remains the only source for peacekeeping, voluntary, 2019–2020, and priority areas.
4. **Watch the double-counting caveat.** `data/INFO` already flags that Secretariat expenses include
   double counting and do not tie to the CEB `UN` entry. That caveat carries over to OPPFB unchanged.
