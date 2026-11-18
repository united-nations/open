# Preserving the previous open.un.org

The temporary public profile serves only the teaser homepage. Preview and full
retain the portal. The teaser announces a December 2026 launch and serves local
copies of the legacy dashboard datasets, so switching the domain does not break
those downloads.

## Data already captured

On 18 November 2026, `scripts/preserve-legacy-data.py` extracted the complete
public dashboard data payload from each of these pages:

| Source page | Observations | Years | Download |
| --- | ---: | --- | --- |
| [System revenue](https://open.un.org/un-systems-financials/revenue) | 63,113 | 2013–2022 | `public/downloads/legacy/un-system-revenues.zip` |
| [System expenses](https://open.un.org/un-systems-financials/expenses) | 27,678 | 2013–2022 | `public/downloads/legacy/un-system-expenses.zip` |
| [Secretariat expenses](https://open.un.org/un-secretariat-financials/expenses) | 1,739 | 2019–2023 | `public/downloads/legacy/un-secretariat-expenses.zip` |

Each ZIP contains the original `data.json` payload, convenience CSVs of its
nonempty tables, and a README explaining provenance and CSV null handling.
The System expenses distribution table is included. Country and entity lookups,
source codes, signs, and notes are preserved. This capture does not substitute
our current processed CEB or Secretariat data for the previous site's figures.
`public/downloads/legacy/manifest.json` records capture time, source URLs, source
versions, observed years, row counts, and SHA-256 hashes of the source HTML,
JSON payload, and ZIPs. The source HTML itself is not in these downloads.

Refresh before the domain changes, if needed:

```bash
python3 scripts/preserve-legacy-data.py
```

Review changes to the manifest, coverage, and download labels together. Once the
domain serves the new portal this command cannot retrieve the previous site.
These data snapshots are complete for the three observed dashboard payloads;
they are not a complete website archive.

## Recommended preservation before switching hosting

1. Ask the current hosting owner for a dated Drupal database dump, uploaded
   files, custom themes/modules, configuration export, dependency lockfiles,
   deployment configuration, and restore instructions. Keep that backup private
   because it can contain account records, credentials, and operational details.
   Test restoring it in an isolated environment. Retain the current deployment
   until the backup and public replay have been verified.
2. Capture the public site as a browser-based WACZ archive. Inventory the sitemap,
   menu links, redirects, downloads, and any language versions first. Start with
   the homepage, all three dashboards, About, Data Standards, Funding Compact,
   and Financing Report. Capture year selections, filters, drilldowns, tooltips,
   and linked documents, including any required external assets. Use Browsertrix
   for the crawl and ArchiveWeb.page for interactions the automatic crawl misses.
   [Webrecorder's tools](https://webrecorder.net/) support WARC/WACZ capture and
   replay; [Browsertrix documents portable WACZ exports and offline replay](https://docs.browsertrix.com/user-guide/archived-items/).
3. Verify the archive with live network access disabled: navigate every captured
   route, exercise the dashboards, compare selected totals to the captured JSON,
   and open downloads. Keep desktop/mobile screenshots and a short interaction
   recording as additional references. Record anything that cannot be replayed.
4. Store the WACZ, capture inventory, screenshots, checksums, validation record,
   and private restoration backup in organization-controlled durable storage,
   with a second independent copy. Agree ownership and retention withcommit and  the site
   owner and records team.
5. Publish a read-only replay at an agreed UN-controlled archive address, with a
   clear capture date and archival label. An archive subdomain is a possible
   choice; it has not been provisioned. Link it from the new site only after
   replay verification. Keep the local dataset downloads accessible after launch.

A running Drupal copy on an archive subdomain is useful for short-term rollback,
but requires ongoing maintenance. A WACZ replay plus the private restoration
backup is the recommended long-term combination. A normal HTML mirror alone
should not be assumed to preserve the interactive dashboards.

## Cutover decisions still needed

The current hosting owner, backup access, archive address/storage, and retention
owner have not been established. No DNS, hosting, or deployment changes have been
made by this work. Inventory old URLs before cutover and agree explicit redirects
at the host/CDN: during the teaser period, legacy dashboard URLs can temporarily
redirect to `/#downloads-heading`; after launch they can map to the corresponding
System/Secretariat view. Keep informational pages mapped to appropriate resources
or the verified archive. GitHub Pages cannot provide arbitrary server-side
redirect rules; this needs to be handled by the actual production host/CDN.

The build removes the new System, Secretariat and About page trees from the public
export, while preview/full retain their existing feature controls. CI checks the
public teaser, download availability, excluded routes and narrow-screen layout;
the financial-view browser checks run in preview/full.
