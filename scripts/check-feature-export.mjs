import profiles from "../config/features.json" with { type: "json" };
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { moduleAt } from "../src/lib/tests/moduleAt.mjs";

const variant = process.env.SITE_VARIANT ?? "public";
assert.ok(
  ["public", "preview", "full"].includes(variant),
  "Invalid SITE_VARIANT",
);
process.env.NEXT_PUBLIC_SITE_VARIANT = variant;
const { SECRETARIAT_NAV, isRouteEnabled, visibleSecretariatNav } =
  await moduleAt("src/lib/navigation.ts");
const { FEATURES } = await moduleAt("src/lib/featureFlags.ts");
const home = fs.readFileSync("out/index.html", "utf8");
if (variant === "public") {
  assert.match(home, /Launching December 2026/);
  assert.match(home, /Further Resources/);
  for (const route of ["system", "secretariat", "about"]) {
    assert.ok(!fs.existsSync(`out/${route}`), `Public excludes ${route}`);
    assert.ok(
      !home.includes(`href="${process.env.BASE_PATH ?? ""}/${route}/"`),
    );
  }
  const manifest = JSON.parse(
    fs.readFileSync("public/downloads/legacy/manifest.json", "utf8"),
  );
  for (const dataset of manifest.datasets) {
    assert.ok(
      home.includes(
        `${process.env.BASE_PATH ?? ""}/downloads/legacy/${dataset.file}`,
      ),
    );
    assert.ok(fs.existsSync(`out/downloads/legacy/${dataset.file}`));
  }
  console.log("Feature export checks passed (public teaser).");
  process.exit(0);
}
const secretariat = fs.readFileSync("out/secretariat/index.html", "utf8");
const organizations = fs.readFileSync(
  "out/system/organizations/index.html",
  "utf8",
);
for (const html of [home, organizations]) {
  assert.ok(
    !html.includes(`href="${process.env.BASE_PATH ?? ""}/system/personnel/"`),
  );
}
assert.ok(
  !fs.existsSync("out/system/personnel/index.html"),
  "Personnel route removed",
);
assert.match(organizations, /Workforce trends/);
assert.match(
  fs.readFileSync("out/about/index.html", "utf8"),
  /id="personnel-methodology"/,
);
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
for (const prefix of Object.keys(profiles.routes)) {
  for (const route of pages.filter(
    (route) => route === prefix || route.startsWith(prefix + "/"),
  )) {
    assert.equal(
      fs.existsSync(path.join("out", route, "index.html")),
      isRouteEnabled(route),
      `${variant}: exported route ${route}`,
    );
  }
}
assert.equal(
  fs.existsSync("out/secretariat/field-missions/index.html"),
  false,
  "Former Field Missions route is removed",
);
for (const route of ["locations", "goals"]) {
  const html = fs.readFileSync(`out/system/${route}/index.html`, "utf8");
  assert.equal(
    html.includes('href="https://uninfo.org/"'),
    FEATURES.uninfo,
    `${variant}: ${route} source disclosure`,
  );
}
const locations = fs.readFileSync("out/system/locations/index.html", "utf8");
assert.equal(
  locations.includes('id="function-geography"'),
  true,
  `${variant}: function/geography plot`,
);
assert.equal(
  secretariat.includes('id="secretariat-flows"'),
  true,
  "One configurable Secretariat Sankey is present",
);
assert.equal(
  secretariat.includes('id="secretariat-funding-flows"'),
  false,
  "The duplicate funding Sankey is removed",
);
console.log(`Feature export checks passed (${variant}).`);
