import { spawn } from "node:child_process";
import fs from "node:fs";
import profiles from "../../config/features.json" with { type: "json" };
import { portalUrl } from "./helpers.mjs";
const portalChecks = [
  "header-layout",
  "mobile-friendliness",
  "personnel",
  "number-formatting",
  "page-headings",
  "treemap-search-labels",
  "list-groups",
  "list-bars",
  "ceb-methodology",
  "related-data-pages",
  "page-notes",
  "data-disclosures",
  "ceb-refresh",
  "ceb-assessment-outstanding",
  "ceb-assessments-page",
  "sdg-trends",
  "sdg-groups",
  "historical-coverage",
  "locations-grouping",
  "locations-bubbles",
  "system-functions",
  "pooled-funds",
  "function-geography",
  "routes-and-financials",
  "uninfo-funding",
  "peacekeeping-stages",
  "secretariat-flows",
  "sidebar-years",
  "sidebar-text",
  "data-integrity-fixes",
  "secretariat-sidebar-years",
  ...(profiles[process.env.SITE_VARIANT ?? "public"].regularBudgetOutstanding
    ? ["regular-budget-outstanding"]
    : ["regular-budget-contributors-visibility"]),
  ...(profiles[process.env.SITE_VARIANT ?? "public"].programmeBudget
    ? ["regular-budget-source-links"]
    : []),
  "budget-sources",
  "budget-funding",
  "ppb-ranges-currency",
  "trust-fund-visibility",
  ...(profiles[process.env.SITE_VARIANT ?? "public"].trustFunds
    ? [
        "trust-fund-office-links",
        "trust-fund-groups",
        "trust-fund-mptf",
        "trust-fund-categories",
      ]
    : []),
  ...(profiles[process.env.SITE_VARIANT ?? "public"].additionalTrustFunds
    ? ["trust-fund-sources", "trust-fund-contributor-sources"]
    : []),
  "hydration",
];
const checks = profiles[process.env.SITE_VARIANT ?? "public"].portal
  ? portalChecks
  : ["feature-profiles"];
function runCheck(name) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [`tests/browser/${name}.mjs`], {
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${name} failed (${code})`)),
    );
  });
}
(async () => {
  let server;
  try {
    if (!process.env.PORTAL_URL) {
      if (!fs.existsSync("out/index.html"))
        throw new Error("Run pnpm build before browser checks");
      try {
        await fetch(portalUrl);
        throw new Error(
          "Port 8766 is occupied; set PORTAL_URL to use an existing server",
        );
      } catch (e) {
        if (e.message.includes("occupied")) throw e;
      }
      server = spawn(
        "uv",
        [
          "run",
          "python",
          "-m",
          "http.server",
          "8766",
          "--bind",
          "127.0.0.1",
          "--directory",
          "out",
        ],
        { stdio: ["ignore", "ignore", "ignore"] },
      );
      let failure;
      server.on("error", (e) => {
        failure = e;
      });
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (failure) throw failure;
        if (server.exitCode !== null)
          throw new Error("Static server exited before becoming ready");
        try {
          ready = (await fetch(portalUrl)).ok;
        } catch {}
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!ready) throw new Error("Static server did not become ready");
    }
    for (const check of checks) await runCheck(check);
  } finally {
    server?.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
