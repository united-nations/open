# Detail panel component inventory

Reviewed across the current portal sidebars. Financial calculations, data loading,
navigation and source interpretation remain application responsibilities.

| Family | Current consumers / duplication | Shared status |
| --- | --- | --- |
| Fixed record header, circular actions, scrollable body | Organizations, Contributors, Secretariat Overview; other sidebar shells remain bespoke | DetailPanel and FinancialDetailPanel; SidebarControls composes shared controls |
| Section heading and subheading | Overview, Financials, chart headings across System panels | FinancialPanelHeading extracted; adopted in Organizations and Contributors |
| Compact year selector | Organizations, Contributors, Countries, Goals | FinancialPanelYearSelector extracted and integrated into FinancialDetailPanel; Organizations and Contributors adopted |
| Ranked single or stacked bars | Donors/countries in Organizations; organization lists in Contributors, Countries, Goals | FinancialPanelRankedRow and FinancialPanelBar extracted; Organizations and Contributors adopted |
| Goal marker with ranked bar | Organization spending by SDG | FinancialPanelGoalBadge composed with ranked row; Organizations and Contributors adopted |
| Funding labels and explanations | System and Secretariat funding breakdowns | Already shared FundingSourceLabel |
| Total, funding rows, source list, region states | Secretariat Overview financial panel | Already built into FinancialDetailPanel; adopt in other panels incrementally |
| Compact time-series charts | EntityTrendChart, FinancingInstrumentChart, SidebarStackedTrend | Reusable within portal; candidate to extract rendering while retaining data preparation |
| Expandable financial hierarchy | BudgetSidebar and PeacekeepingMissionSidebar | Strong next candidate: expandable row with amount/bar and child slot; preserve their different hierarchy logic |
| Required / available / spent bars | UninfoFundingBar in Countries and Goals | Reusable within portal; keep these three distinct metrics explicit when extracting |
| Assessment/credit exceptions and fund-specific records | PeacekeepingContributorSidebar, TrustFundContributorSidebar | Domain content; can later reuse fields/source blocks without genericizing accounting rules |
| Impact statements and project lists | Organizations, Countries and Goals | Domain content; shared list/card presentation possible later |

## Storybook

Under **open.un.org → Page Structure → Financial detail panel**:

- **Panel** demonstrates existing financial regions and states.
- **Content components** contains headings, year selection, ranked rows,
  integrated year selection, and this component-family inventory.

Examples use structural labels and dashes rather than invented financial records.
Illustrative bar lengths demonstrate geometry only.

The first extraction is used by Organizations and Contributors. Other panels have been inventoried,
not migrated. The existing general DetailHeader/DetailSection/DetailField components
remain available; the financial heading treatment preserves the portal's existing
uppercase hierarchy rather than changing all products' section styles.
