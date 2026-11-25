# Honour-roll regression evidence

- `honour-roll-2026-11-10.html`: exact HTML fetched from
  <https://www.un.org/en/ga/contributions/honourroll.shtml> on 25 November 2026
  UTC, with the portal's user agent and `Cache-Control: no-cache`. The source
  states 10 November 2026, with 150 paid states (55 on time, 95 late).
  SHA-256: `78278a49ebb8f8126634b9cbafd691c96c4e287ee1f68cb031e759dc793df5e5`.
- `honour-roll-baseline-2026-08-18.json`: the portal's approved 2026 assessment
  export at implementation time, with 129 paid states and the disclosed
  Malaysia amount discrepancy. Frozen separately so nightly updates cannot
  change the test baseline. SHA-256:
  `166fb9e0f93f272ea51d01724a0d8af0994c96e9afec4c87f444f7e0b954ae1a`.

The HTML also contains a monthly-statistics table and an unwrapped column
header. Preserve those details: simplified hand-written tables would miss two
important features of the actual source format. Retrieval time and the source's
snapshot/payment dates are distinct.
