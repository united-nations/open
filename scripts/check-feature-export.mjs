import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { moduleAt } from "../src/lib/tests/moduleAt.mjs";

const variant = process.env.SITE_VARIANT ?? "public";
assert.ok(["public", "preview"].includes(variant), "Invalid SITE_VARIANT");
process.env.NEXT_PUBLIC_SITE_VARIANT = variant;
const { SECRETARIAT_NAV, isRouteEnabled, visibleSecretariatNav } =
  await moduleAt("src/lib/navigation.ts");
const { FEATURES } = await moduleAt("src/lib/featureFlags.ts");
const home = fs.readFileSync("out/index.html", "utf8");
const secretariat = fs.readFileSync("out/secretariat/index.html", "utf8");
const pages = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(filename);
    else if (entry.name === "page.tsx") {
      pages.push(
        "/" + path.relative("src/app", directory).split(path.sep).join("/"),
      );
    }
  }
}
collect("src/app");
for (const item of SECRETARIAT_NAV) {
  const enabled = isRouteEnabled(item.href);
  assert.equal(
    visibleSecretariatNav().some((nav) => nav.href === item.href),
    enabled,
  );
  // An enabled parent must not expose an explicitly disabled descendant.
  assert.equal(isRouteEnabled(item.href + "/future-subpage/"), enabled);
  for (const html of [home, secretariat]) {
    assert.equal(
      html.includes(`href="${process.env.BASE_PATH ?? ""}${item.href}/"`),
      enabled,
      `${variant}: navigation for ${item.href}`,
    );
  }
  for (const route of pages.filter(
    (route) => route === item.href || route.startsWith(item.href + "/"),
  )) {
    assert.equal(
      fs.existsSync(path.join("out", route, "index.html")),
      isRouteEnabled(route),
      `${variant}: exported route ${route}`,
    );
  }
}
for (const route of ["locations", "goals"]) {
  const html = fs.readFileSync(`out/system/${route}/index.html`, "utf8");
  assert.equal(
    html.includes("UNINFO"),
    FEATURES.uninfo,
    `${variant}: ${route} source disclosure`,
  );
}
const locations = fs.readFileSync("out/system/locations/index.html", "utf8");
assert.equal(
  locations.includes('id="function-geography"'),
  FEATURES.functionGeography,
  `${variant}: function/geography plot`,
);
assert.ok(
  secretariat.includes('id="secretariat-funding-flows"'),
  "Direct funding chart is always available",
);
assert.equal(
  secretariat.includes('id="secretariat-flows"'),
  FEATURES.secretariatDetailedFlows,
  `${variant}: detailed Secretariat flows`,
);
console.log(`Feature export checks passed (${variant}).`);
