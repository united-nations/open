# Secretariat expenditure flows

The overview treemap and Sankey chart have separate controls and consume the same `secretariat-overview-YEAR.json`. The ledger retains every annual-report occurrence, exact amount, original code/type/reference/note, classification evidence, priority and funding arrangement. Source hashes plus row ordinal preserve historical duplicates. Display rounding differences are explicit.

The public overview has one configurable “Financial flows” chart. Its three
persistent selectors offer:

- Funding mechanism or Funding arrangement.
- Entity category, Entity, or None.
- Priority area (always shown).

Funding and priority columns always remain visible. Selectors sit inside the
chart above three fixed column slots. Choosing None in the optional middle
selector leaves its slot empty and displays the selector as a + button. The
outer columns keep their positions and ribbons span the gap. The default remains
Funding mechanism → Priority area, with the middle slot empty. Every displayed node and adjacent link retains its exact ledger source
occurrences. Changing dimensions never estimates allocations or changes scope.
Detailed entity/arrangement columns always show the largest 12 entries plus an
inspectable remainder, preserving every amount without an expansion toggle.
Arrangement families retain the existing reviewed classification, including
unitemized extrabudgetary amounts grouped by reporting entity and trust funds
shown together.

Funding nodes use the shared UI funding-source colors. Regular budget uses
rgb(0, 73, 135), Other assessed uses rgb(0, 158, 219), and Extrabudgetary uses
rgb(197, 223, 239). Priority nodes match the overview treemap colors. Incoming
ribbons use the left funding column's colors; outgoing ribbons use the right
priority column's colors. Direct two-column ribbons retain their funding color.
Individual entity bars are neutral gray. Selecting Entity category displays a
notice directly below the entity dropdown that the categories are preliminary. Nodes are ordered by descending
net expenditure, with generated remainder nodes last. Funding arrangements use distinct, stable colors from the shared palette.
Both Sankeys use translucent ribbons without gaps at either end. All node labels wrap within equal left
and right label gutters without truncation. The viewport fits the rendered labels
and dropdown controls with a small outer inset, rather than reserving symmetric
outer margins. Column anchors remain equally spaced, including an empty middle
slot.
Node spacing reserves the full wrapped label and amount height, so neighboring
labels do not overlap, including small or negative-only entries.

Both the System and Secretariat Sankeys compose `FinancialFlowDiagram` over
`@un-eosg/ui`'s `SankeyDiagram`. The existing pnpm UI patch adds an optional
`renderSelection(selection, onClear)` slot; the shared diagram retains its
original inline panel for callers that omit the slot. Hover details remain
compact tooltips. Click/Enter/Space opens the shared `FinancialFlowSidebar`,
using a modal dialog and the same `FinancialDetailPanel` and bar rows as other
sidebars. Escape, outside click, or Close dismisses it and restores focus to the
originating chart item. Flow sidebars show only the selected chart dimensions,
using the same visible node labels, ordering and remainder groups. Funding
mechanisms and arrangements do not appear together; entity categories do not
expose an individual-entity breakdown. Raw source-record tables with hidden
dimensions are omitted. Signed adjustments remain available alongside net totals.
When individual entities are displayed, their detail links replace the flow
sidebar with the existing entity view, preserving year and selection scope. That
view also hides its funding-source breakdown when mechanisms are not displayed
in the originating Sankey.

The System chart retains all three existing dimension selectors and its current
default. Revenue and expenditure remain distinct measures across organizations;
there is no direct contributor-to-destination allocation and no combined
organization option. Its incoming ribbons use the left funding colors, and
outgoing ribbons use the right expenditure destination colors.

`python python/11-export_secretariat_json.py` exports audited budgets and the ledger-backed overview together. `python python/secretariat_ledger.py` regenerates only the overview. Money comes exclusively from the three annual-report CSV inputs. System Chart and PPB references supply names and classifications; fund schedules supply exact-name membership only.

Seven groups are independent of financing: departments/offices, regional commissions, peacekeeping missions/support, operational SPMs, other bodies, common costs/central allocations and unallocated. The map's geographic classification stays separate. UNSOS is Support office between Field missions and Service centres on the peacekeeping-budget page.

Funding families distinguish programme, peacekeeping, IRMCT assessed, trust funds, identified treaty financing, unitemized extrabudgetary and unresolved convention identity. A reviewed exact-name table preserves individual funds, named arrangements and source aggregates. Expansion replaces a parent; the largest 12 arrangements appear individually and remaining occurrences stay in an inspectable group.

Both cuts conserve signed expenditure. Ribbons show gross positive activity; totals and details retain corrections. Negative-only and net-zero activity remain selectable. Selection restricts downstream amounts by source IDs. Scoped entity details retain the originating year and filters; full-entity trends and share links are only available in the existing unfiltered treemap context.

Five historical SPM occurrences lack named same-year budget membership and explicitly carry null. Three convention-labelled ODA rows ($4,950,756) retain unresolved identities. Dated budget reporting labels do not establish operational succession dates. OSET and historical evaluation activities do not become today's successor offices. Mixed periods, source budget substitutes and redistributed Staff Assessment remain source facts.

Checks:

- `.venv/bin/python -m unittest discover -s python/tests -p 'test_secretariat*.py'`
- `node --test src/lib/tests/systemFlows.test.mjs src/lib/tests/secretariatFlows.test.mjs`
- `npm run typecheck`

All source occurrences, exact totals and cell memberships are checked. Graph tests cover every family expansion and all System selectors. The handoff manifest pins input files, commits and the unpublished UI tarball. Use its verification command until shared UI changes are integrated; this task publishes nothing remotely.
