# CEB Revenue Data Fusion

This document describes how UN CEB revenue data from multiple source files is fused into a unified contributor breakdown.

## Source Files

| File | Coverage | Description |
|------|----------|-------------|
| `revenue.csv` | 2011-2024 | Total revenue by entity × year × financing instrument |
| `revenue_government_donors.csv` | 2013-2024 | Government donor breakdown with specific country names |
| `revenue_non_gov_donors.csv` | 2009-2024 | Non-government donor breakdown (partial coverage) |
| `revenue_contrib_type.csv` | 2021-2024 | Revenue by contributor type (Government, EU, Foundations, etc.) |

## Fusion Methodology

### Tier 1: Basic Fusion (2013-2020)

For each entity and year:

1. **Government donors**: Specific country names from `revenue_government_donors.csv`
2. **Non-government donors**: Specific donors from `revenue_non_gov_donors.csv` with category when available
3. **Unattributed per financing instrument**: `Entity/instrument control - Government - NonGov` within each of the four financing instruments. Unknown donor identity is independent of financing class.

### Tier 2: Full Category Breakdown (2021-2024)

For years where `contrib_type.csv` exists, the "Other" is broken down by contributor type:

1. **Government donors**: Specific country names (same as Tier 1)
2. **Non-government donors**: Specific donors grouped by C-code category
3. **"Other {Category}"**: For each category and financing instrument, calculated as `Category Total - Specific Donors in Category`
4. **Unattributed control residual**: signed difference to the authoritative entity/instrument control, including entities with no contributor detail.

| Code | Category | Description |
|------|----------|-------------|
| C01 | Government | Government contributions |
| C02 | NGOs | Non-governmental organizations |
| C04A | Multilateral - IFIs | International Financial Institutions |
| C04B | Multilateral - Global Funds | GEF, Global Fund, GAVI |
| C04C | Multilateral - UN Orgs | UN organizations excluding pooled funds |
| C04D | Multilateral - UN Pooled Funds | UN inter-agency pooled funds |
| C04E | Multilateral - Other | Other multilateral institutions |
| C05 | Foundations | Philanthropic foundations (e.g., Gates Foundation) |
| C06 | Private Sector | Corporate donors |
| C07 | Academic | Academic, training and research institutions |
| C08A | European Union | EU and European Commission |
| C08B | Other Contributors | Unclassified (correction bucket, use with caution) |
| C09 | No Contributor | Revenue from activities (interest, FX gains) |

**Example (2023 Foundations):**
- Category total from `contrib_type.csv`: $890M
- Gates Foundation from `nongov_donors.csv`: $460M
- "Other Foundations": $430M (calculated remainder)

## Output Schema

File: `data/ceb/fused/revenue_by_contributor.csv`

| Column | Description |
|--------|-------------|
| `entity` | UN entity (e.g., UNICEF, WHO, UNDP) |
| `year` | Calendar year |
| `contrib_code` | C-code (C01-C09) or "Other"/"Unknown" for Tier 1 years |
| `donor_type` | Category name (Government, Foundations, etc.) |
| `donor_name` | Specific donor name or "Other {Category}" |
| `amount` | Amount in USD |
| `is_other` | True if calculated remainder (not a specific named donor) |

## Known Limitations

### Data Quality Issues

1. **C08B "Other Contributors"**: Has 85% negative-to-positive ratio across years. This category appears to be used as a correction/adjustment bucket. Use with caution.

2. **Entity naming inconsistencies**: Some entities have different names across files (e.g., "UN Tourism" vs "UNWTO"). IRMCT is missing from some files.

3. **Negative amounts**: Legitimate accounting entries from audited statements including FX losses, refunds, and prior-period corrections. Approximately 1-2B/year in negative entries across all categories.

4. **Donor name variations**: Multiple variants of the same donor (e.g., "GAVI Alliance" / "GAVI The Vaccine Alliance") are normalized via `DONOR_MAPPING` in `utils.py`.

5. **Category misclassifications**: Some donors appear with incorrect C-codes in the source data. `DONOR_CATEGORY_OVERRIDES` in `utils.py` fixes known cases (e.g., Bill & Melinda Gates Foundation → Foundations, European Union → EU).

6. **Generic bucket donors**: Entries like "Private Sector", "Private Donors" are aggregated catch-all buckets, not specific donors. These are marked as `is_other=True` via `GENERIC_DONORS` in `utils.py`.

### Coverage Gaps

- Pre-2013: No government donor breakdown available
- Pre-2021: No contributor type breakdown (C-codes) available
- Non-gov donors file only covers major institutional donors, not all private/foundation contributions

## Validation

Both tiers reconcile each entity × year × financing instrument to `revenue.csv`
within one cent. Independent tests classify the original textual instrument
labels and compare them to the final exports. Contributor trends preserve Other
and include all attribution statuses in All contributors. Unknown financing codes
fail validation. See [the remediation notes](data-integrity-remediation.md).

## Data Sources

All source data comes from the [UN CEB Financial Statistics](https://unsceb.org/financial-statistics) database, which collects data from 43 UN entities annually. Figures are validated against audited financial statements.

The data standards are documented in the [UN Data Cube](https://unsceb.org/data-standards-united-nations-system-wide-reporting-financial-data) initiative.
