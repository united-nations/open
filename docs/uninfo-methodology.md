# UNINFO processing

UNINFO Cooperation Framework resources remain separate from CEB and Secretariat
finances. The retained snapshot has country SDG queries for 2024 where verified;
unverified periods, shared-workspace geography, and missing project/framework
query periods retain their existing qualifications in the exports and interface.
Refreshing these exports does not fetch or update the underlying source snapshot.

## SDG groups and overall resources

Country **Overall** resources sum every reported group in that country's SDG
response, including the group whose source SDG ID is null. That group is exported
as `unclassified` and displayed as **Not classified by SDG**. It is a reported
classification gap, not a calculated balance or an allocation to any numbered
goal. An absent group remains absent; an explicitly reported zero group remains
present. Signed observations are retained.

The global SDG export preserves the global source response independently,
including its own null-ID group where reported. It does not calculate a global
amount from country sums. Country comparisons include only verified 2024
country observations and exclude shared-workspace totals, so they need not sum
to global observations.

## Results framework identity

Strategic priorities, outcomes, and outputs use the API's stable source IDs.
Display codes can repeat under different parents and never establish duplicate
identity. Dated descriptions of the same source ID count once when their parent,
code, and financial observations agree; the description with the latest end date
is retained. Conflicting amounts or parent relationships fail export for review.
Every retained outcome and output must link to its reported parent at the
preceding level; orphaned IDs fail export rather than silently disappearing.
Parent and child financial amounts describe overlapping hierarchy levels and
must not be summed together.

Regression checks in `python/tests/test_uninfo_integrity.py` compare every
exported framework identity and parent with the retained raw snapshot, and check
country and global SDG amounts independently against their own source responses.
