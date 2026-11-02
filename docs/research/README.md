# Data research

These notes retain the findings of the October 2026 financial-data investigations.
They consolidate the research READMEs, numerical summaries and entity-mapping
audit into documents that can be read without downloaded PDFs, XML snapshots,
generated CSVs or research scripts. Consolidated on 2 November 2026; source
inspection dates are stated in each note. This consolidation did not repeat the
web searches or change application data.

| Investigation | Main finding | Status and next step |
|---|---|---|
| [Historical CEB financing codes](ceb-historical-financing-codes.md) | Neither official reports nor numerical reconciliation establish a complete mapping of the 2015–2017 legacy codes to the four main instruments. | The portal uses **Other financing instruments** for contributor amounts without a supported allocation. An authoritative historical schema would be needed to replace it. |
| [Trust-fund source options](trust-fund-source-options.md) | UN-Habitat, ITC and UNODC expose different levels of accounting detail. Some useful candidate breakdowns exist, but none establishes a complete public individual-fund ledger across all three. | Research candidates only. Obtain the missing fund/grant schedules and reconcile accounting scope before integrating new amounts. |
| [Entity identity and reporting scope](entity-identity-audit.md) | Several apparent aliases describe successor bodies, changing mandates or different reporting scopes. | Dated audit findings and recommendations, not a record of implemented fixes. Validate each proposed change against its dataset and period. |

## How to use these notes

The notes preserve source URLs, document symbols, page references, material
amounts, methods, limitations and follow-up questions. Numerical research results
describe the inspected source vintages; they are not automatically refreshed
when a live download changes. The accompanying scratch files are not required
by these writeups and are not part of this retained documentation set.

Current processing rules remain in [CEB methodology](../ceb-methodology.md),
[revenue processing](../data-fusion-revenue.md),
[expense processing](../data-fusion-expenses.md) and the relevant Secretariat
documentation. An inference or candidate in a research note does not authorize
changing those rules or replacing published totals.

## Earlier investigations

The [original CEB legacy-code investigation](ceb-legacy-revenue-codes/README.md)
contains the earlier evidence and the mappings that were being challenged at
that time. Its references to a “current mapping” describe that historical
snapshot, not the portal's present classification. The consolidated follow-up
above records the later findings and display decision.

Other existing research includes the [data-source overview](data-sources-overview/),
[CEB aggregation](ceb_aggregation.md), and [UNINFO](uninfo.md). These documents
have their own dates and scopes.
