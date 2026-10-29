# Monetary time-series display

Nominal USD is the default for every financial time-series chart. Each monetary
chart has an independent dropdown for **Adjusted USD**, explicitly labelled
**2025 USD · US CPI**. This is a US consumer purchasing-power proxy, not a measure
of UN operating costs, purchasing power parity, foreign exchange, or a revised
assessment or budget.

The agreed scope follows the nominal/real discussion in *IARC Entity Categorization*
and *Nominal and real trend values*: no universal UN cost deflator was identified.
The user subsequently chose the explicitly labelled US CPI proxy. The current
request covers all monetary time-series charts, including the monetary view of
the within-year payment timeline. Counts and percentages are never converted.

## Source and calculation

- Source: US Bureau of Labor Statistics **CUUR0000SA0**, CPI-U all items, US city
  average, not seasonally adjusted, **M13 published annual averages**.
- [Published annual index table](https://www.bls.gov/regions/mid-atlantic/data/consumerpriceindexannualandsemiannual_table.htm).
- Snapshot: `public/data/us-cpi.json`, including source URLs, retrieval date,
  response hashes and the fixed base year. Refresh with
  `uv run python/fetch_inflation_index.py`; the browser makes no live CPI requests.
- Adjusted amount = nominal amount × CPI(2025) / CPI(observation year).
- For an explicitly labelled July–June fiscal cycle, use the arithmetic mean
  of its two calendar-year annual indices. This is an approximation to the
  period's average price level, not a monthly fiscal-year index.
- Only published annual observations are used. Missing indices, including
  2026–2027 in the current snapshot, leave gaps with a visible notice. No forecast,
  portal-generated partial-year estimate, interpolation, or last-observation carry-forward is used.
- The published **2025** average excludes October, when CPI survey data were not
  collected during the lapse in appropriations. The snapshot and control's source
  description preserve this caveat. It is the published BLS average, not an
  independently reconstructed twelve-month average.

## Display boundary

The conversion applies to plotted monetary series, monetary axes, chart tooltips,
reference amounts drawn inside charts, and accessible chart-data tables. It keeps
signed adjustments and source-data gaps. It never mutates the financial datasets.

Page totals, summaries above charts, treemaps, maps, flow diagrams, sidebar totals,
ranked lists, funding breakdowns, source documents, and financial downloads remain
nominal. Decorative, non-interactive homepage navigation thumbnails also remain
nominal; their linked interactive time-series charts provide the dropdown.

The shared `FinancingInstrumentChart` covers stacked/bar trends, including SDGs,
functions, Secretariat priorities/funding, assessments, trust funds and sidebar
histories. Independent line charts (organization comparison, revenue/expenditure,
contributor comparison and programme budget), the sidebar entity trend, and the
payment timeline use the same conversion helper. Each dropdown starts nominal;
there is no global setting or persisted preference. Country-count views hide the
money control. Shared nominal payment-axis maxima are not reused for adjusted
values.

Source citations still point to the original nominal observations. Adjusted
chart tooltips carry their units so the displayed conversion is distinguishable
from the numbers printed in those source documents.
