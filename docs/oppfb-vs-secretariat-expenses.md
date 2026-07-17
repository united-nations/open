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

## 6. Subprogramme: absent from both datasets, recoverable for RB 2025 — and for voluntary via the PPB

Neither actuals dataset carries a subprogramme column. The CSV's finest grain is
section × entity × priority area; `Appropriation and Expenditure.xlsx` stops at
section × entity × object of expenditure. So for **2019–2024 neither dataset has a subprogramme
breakdown** — though the PPB documents do publish one, for both regular budget *and* extrabudgetary
resources; see the voluntary subsection below.

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
functional area to the 2026 crosswalk — a dimension the CSV does not carry for any year. Caveat: this
applies a 2026 structure to 2025 actuals. That essentially every non-SPM functional area matched
suggests the structure was stable across the two years, but it is an assumption, and it does **not**
extend back to 2019–2024 from the OPPFB data (for those years, the PPB documents are the route).

### How functional area maps to subprogramme

**It is a lookup, not a formula.** Treat the functional area as an *opaque key* and join through the
2026 table. The relation is **many-to-one** — 325 functional areas roll up onto 231 subprogramme
labels (mean 1.38 FAs per subprogramme, max 34). Functional area is the finer grain.

The code *does* have anatomy — `[section token][component letters][serial]` — and the component
letters mirror the canonical four-part structure of every UN budget section:

| Letters | Component |
|---|---|
| `AB` | Policymaking organs |
| `AA` | Executive direction and management |
| `AC` | **Programme of work** — the numbered subprogrammes (133 FAs, the substantive bulk) |
| `AD` | Programme support |

(plus `AT` staff assessment, `E*` Regular Programme of Technical Cooperation, `C*` construction /
major maintenance). So `S9AC0008` reads as "section 9, programme of work, item 8" →
*Subprogramme 8 Sustainable forest management*.

**Use that anatomy only as a sanity check — never parse it.** Two reasons:

- the serial does not reliably match the subprogramme number (`29ACI012` → *Subprogramme 4*, not 12);
- the leading section token equals the actual budget section only **51%** of the time. `18AF0001` is
  *Committee on Missing Persons in Cyprus*, which sits in section **24** (Human rights), not 18 —
  the prefixes carry legacy numbering from before sections were renumbered.

### ⚠️ `SUBPROGRAMME` is a label, not a unique key

Generic labels are reused right across the Secretariat:

| Label | Entities | Sections |
|---|---|---|
| Executive direction and management | **32** | 30 |
| Programme support | 25 | 25 |
| Policymaking organs | 13 | 13 |

13 of the 230 labels are reused across more than one entity, and they carry **24.7% of the 2026
budget**. Grouping by subprogramme name alone would silently fuse DESA's "Executive direction and
management" with DPO's and DGC's into one meaningless bucket spanning 30 sections.

**Rule: join on functional area, key aggregates on `(section, entity, subprogramme)`, and treat the
subprogramme name as a label scoped to its entity — never as a standalone dimension.**

### Voluntary money *is* broken down by subprogramme — but only in the PPB documents

**OPPFB itself contains no voluntary / extrabudgetary spending.** Every column of every sheet was
searched for voluntary/XB/trust-fund markers; the only hits are false positives ("Committee on
*Contributions*", the organ that sets assessment rates; and "145. Grants and *contributions*", an
object of expenditure — money paid *out*). `FUND` has exactly one value, `10UNA` (the Regular Budget
fund), and every funding code is an **Appropriation** (`APRO 1/2`) or a **Commitment Authority**
(`CA GA/SG …`) — both assessed instruments.

**But that is a limit of these extracts, not of the subprogramme concept.** The proposed programme
budget (PPB) documents *do* publish extrabudgetary resources by subprogramme. Every section document
carries a table `X.17`, *"Overall: evolution of financial resources by source of funding, component
and subprogramme"*, split into **(1) Regular budget** and **(2) Extrabudgetary** — both broken down by
the same components, and both including prior-year **actual expenditure**.

The components in that table are exactly the component letters decoded from the functional-area codes
above — the ERP coding scheme and the PPB table are the same architecture:

| PPB table row | Functional-area letters |
|---|---|
| A. Policymaking organs | `AB` |
| B. Executive direction and management | `AA` |
| C. Programme of work (numbered subprogrammes) | `AC` |
| D. Programme support | `AD` |

#### ⚠️ The PPB's extrabudgetary figures do NOT reconcile with the CSV's voluntary figures

Worked example — UNEP / Section 14 (Environment), 2023, from **A/79/6 Sect. 14, Table 14.17**:

| Measure | PPB Table 14.17 | CSV | Match? |
|---|---|---|---|
| Regular budget expenditure | $20,859.7k | $20,859,739 (`REFERENCE = A/79/6`) | ✅ **exact** |
| Extrabudgetary / voluntary expenditure | $587,760.7k | $671,941,000 (`REFERENCE = Financial Statement`) | ❌ **$84m apart (14%)** |

This is a **provenance split**. The CSV sources its regular budget from the PPB (all 144 `A/79/6` rows
are `Regular assessed`) but its voluntary from the **financial statements** (812 of 815 `Voluntary`
rows). The PPB's "extrabudgetary" and the financial statements' "voluntary" are *different
measurement bases*, not the same quantity at different grains. That is why the subprogramme dimension
was lost on the voluntary side.

#### Why exactly do they differ? (documents consulted)

Sources: **A/79/6 (Sect. 14)** — Environment; **A/79/5/Add.7** — UNEP audited financial statements
2023; **A/79/7** — ACABQ first report.

**First, what the CSV's number actually is.** It reproduces to the dollar:

```
UNEP IPSAS total expenses (A/79/5/Add.7, Statement II)   696,642k
  less "Regular budget" segment (Note 4)                 −24,701k
  = 671,941k  ==  CSV Voluntary $671,941,000   ✅ exact
```

So the CSV's "Voluntary" for UNEP is definitionally **"total accrual expenses minus the UN
regular-budget segment"** — a residual, not a measured voluntary figure.

**Three structural reasons the two diverge**, in the documents' own words:

1. **Accounting basis.** A/79/5/Add.7, Note 5 ¶120: *"UNEP prepares its budget on a **modified cash
   basis**, while expenses are presented on **accrual basis** in the financial statements."* The PPB
   figure is budgetary expenditure out of Umoja; the FS figure is IPSAS expense. (Note the pure
   non-cash items are tiny — depreciation + amortisation together are just $337k, 0.05% of expenses —
   so this is about unliquidated obligations and recognition timing, not depreciation.)
2. **Entity scope — the big one.** UNEP's reporting entity (Note 1 ¶4) consolidates fund groups that
   section 14's programme budget does not govern: the **MEA convention secretariats** ($119.2m — BRS,
   CBD, CITES, CMS, Minamata, Ozone, regional seas…, each with its own COP-approved budget) and the
   **Multilateral Fund for the Montreal Protocol** ($114.2m, its own Executive Committee), plus an
   end-of-service benefits segment ($13.0m). UNEP's own IPSAS 24 reconciliation books an **entity
   difference of $580,452k**, defined (Note 5 ¶126) as *"cash flows of fund groups other than the
   organization… The financial statements include results for all fund groups."* Tellingly, UNEP's
   only budget-to-actual statement (Statement V) covers **just the Environment Fund + regular
   budget — $122.0m, about 17% of its $696.6m consolidated expenses.**
3. **Vintage.** A/79/6 (Sect. 14), footnote (a) to table 14.14, which by its wording carries to 14.17:
   *"the expenditure presented in this table and subsequent tables is **not final** and may be subject
   to adjustments that could result in minor differences between the information contained in the
   present report and the financial statements."* The PPB anticipates divergence — though it calls it
   "minor", and 14.3% is not minor.

#### ⚠️ But the gap does NOT close, and the PPB never defines its own scope

The tempting story — "the PPB simply excludes the MEAs and the Multilateral Fund" — **is wrong**.
Testing it:

```
CSV voluntary 671,941k − Conventions 119,195k − Multilateral Fund 114,168k = 438,578k
PPB extrabudgetary                                                         = 587,761k
→ the PPB figure is 149,183k HIGHER, not lower.
```

Entity scope *over*-explains the gap. And UNSCEAR appears on **both** sides (PPB table 14.17 EDM line
$324.3k; FS Conventions segment $392k), so the PPB clearly does include convention-type money. No
combination of UNEP's seven reporting segments sums to $587,760.7k — intersegment eliminations
(−$86.0m) make gross-segment arithmetic unreliable in any case.

**Worse, the PPB never says what its extrabudgetary figure includes.** A/79/6 (Sect. 14) has *no*
fund-level resource table, no footnote and no annex defining scope. The strings "Environment Fund",
"Multilateral Fund", "trust fund" and "earmarked" appear **zero times** in any resource context —
and the same is true of A/74/6, A/76/6, A/77/6 and A/78/6 (Sect. 14). The closest thing to a scope
statement is ¶14.112: *"The extrabudgetary resources under the present section are subject to the
oversight of the United Nations Environment Assembly."* That is about oversight, not composition.
A/79/6 (Introduction) contains no definition of "extrabudgetary resources" either.

**Conclusion: the two figures are not reconcilable from published documents.** There is no published
bridge between the PPB's extrabudgetary expenditure and the financial statements, and UNEP's own
budget-to-actual reconciliation deliberately does not attempt one (it covers 17% of expenses).
Treating the PPB total as either "all UNEP voluntary" or as a defined subset would be an assumption,
not a citation.

#### 🐛 Side-effect: the CSV's UNEP total is $3.84m short

The mixed provenance has a concrete cost. The CSV *reports* the PPB's regular-budget figure
($20,859.7k) but *derives* voluntary by subtracting the **financial statements'** regular-budget
segment ($24,701k) — a different, larger number. It therefore subtracts more RB than it adds back:

```
CSV implied UNEP 2023 total   20,859.7k + 671,941k = 692,800.7k
FS actual UNEP 2023 total                            696,642.0k
shortfall                                              3,841.3k   ( = 24,701 − 20,859.7 exactly )
```

The same mixed-basis construction presumably applies to every entity whose RB comes from the PPB and
whose voluntary comes from a financial statement. **Worth checking across the dataset.**

#### 🐛 And "Voluntary" is a misnomer

Because the CSV's voluntary is *everything that is not the UN regular budget*, it sweeps in money that
is **assessed** — just not assessed by the UN General Assembly. In UNEP's 2023 statements the
Conventions segment includes **$60.6m of assessed contributions** and the Multilateral Fund
**$157.1m of assessed contributions** (COP- and Executive-Committee-assessed). These sit inside the
CSV's `Voluntary` bucket.

#### Implications

- A voluntary-by-subprogramme breakdown **is obtainable** — from the PPB section documents, a source
  the CSV already cites. It requires parsing table `X.17` from ~40 section PDFs per year.
- It **cannot simply be bolted onto the CSV's voluntary totals**: the bases differ by ~14% for UNEP
  and there is **no published bridge** between them. Either publish PPB extrabudgetary as its own,
  clearly-labelled series, or use the PPB subprogramme *shares* to apportion the CSV total — an
  approximation that must be labelled as one. Do **not** present PPB subprogramme parts as if they
  sum to the CSV's published voluntary whole; they do not.
- Until then, the voluntary pillar in the CSV ($22.15bn over 2019–2023; 84 entities / 32 sections /
  9 priority areas) has as its finest grain the **trust fund name in `NOTE`** (175 distinct: "MPTF -
  Peacebuilding Fund", "Trust Fund in Support of AMISOM", …), on 98% of rows / 74% of the money. Top
  voluntary entities: OCHA ($10.1bn), UNEP ($2.9bn), UNODC ($1.8bn), OHCHR ($1.1bn).

| | Regular Budget | Voluntary |
|---|---|---|
| Source in hand | OPPFB + CSV | CSV only |
| Fine grain in hand | subprogramme (2025–26), object of expenditure, monthly | trust fund (`NOTE`, 2019–23) |
| Subprogramme obtainable? | ✅ yes, already | ⚠️ yes, but only via PPB table `X.17` — and on a different basis |

⚠️ **Consequence for the portal:** with the data currently in hand, any subprogramme view is a
*Regular-Budget-only* view covering ~22% of Secretariat spending and must be labelled as such. A
"subprogramme breakdown" that silently omits OCHA's $10bn of voluntary spending would badly mislead.

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
