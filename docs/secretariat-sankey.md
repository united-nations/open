# Secretariat expenditure flows

The overview treemap and Sankey have separate controls and consume the same `secretariat-overview-YEAR.json`. The ledger retains every annual-report occurrence, exact amount, original code/type/reference/note, classification evidence, priority and funding arrangement. Source hashes plus row ordinal preserve historical duplicates. Display rounding differences are explicit.

`python python/11-export_secretariat_json.py` exports audited budgets and the ledger-backed overview together. `python python/secretariat_ledger.py` regenerates only the overview. Money comes exclusively from the three annual-report CSV inputs. System Chart and PPB references supply names and classifications; fund schedules supply exact-name membership only.

Seven groups are independent of financing: departments/offices, regional commissions, peacekeeping missions/support, operational SPMs, other bodies, common costs/central allocations and unallocated. The map's geographic classification stays separate. UNSOS is Support office between Field missions and Service centres on the peacekeeping-budget page.

Funding families distinguish programme, peacekeeping, IRMCT assessed, trust funds, identified treaty financing, unitemized extrabudgetary and unresolved convention identity. A reviewed exact-name table preserves individual funds, named arrangements and source aggregates. Expansion replaces a parent; the largest 12 arrangements appear individually and remaining occurrences stay in an inspectable group. Show every named arrangement expands that compact view without changing scope or totals.

Both cuts conserve signed expenditure. Ribbons show gross positive activity; totals and details retain corrections. Negative-only and net-zero activity remain selectable. Selection restricts downstream amounts by source IDs. Scoped entity details retain the originating year and filters; full-entity trends and share links are only available in the existing unfiltered treemap context.

Five historical SPM occurrences lack named same-year budget membership and explicitly carry null. Three convention-labelled ODA rows ($4,950,756) retain unresolved identities. Dated budget reporting labels do not establish operational succession dates. OSET and historical evaluation activities do not become today's successor offices. Mixed periods, source budget substitutes and redistributed Staff Assessment remain source facts.

Checks:

- `.venv/bin/python -m unittest discover -s python/tests -p 'test_secretariat*.py'`
- `node --test src/lib/tests/systemFlows.test.mjs src/lib/tests/secretariatFlows.test.mjs`
- `npm run typecheck`

All source occurrences, exact totals and cell memberships are checked. Graph tests cover every family expansion and all System selectors. The handoff manifest pins input files, commits and the unpublished UI tarball. Use its verification command until shared UI changes are integrated; this task publishes nothing remotely.
