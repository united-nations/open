import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";
import profiles from "../../config/features.json" with { type: "json" };

const variant = process.env.SITE_VARIANT ?? "public";
const flags = profiles[variant];
assert.ok(flags, "Invalid SITE_VARIANT");
// The CI static server starts immediately before this check.
for (let attempt = 0; ; attempt++) {
  try {
    const response = await fetch(portalUrl);
    assert.equal(response.status, 200);
    break;
  } catch (error) {
    if (attempt >= 29) throw error;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) =>
    errors.push(`${page.url()}: ${error.message}`),
  );
  page.on("request", (request) => requests.push(request.url()));
  const routes = {
    programmeBudget: "/secretariat/programme-budget/",
    peacekeepingBudget: "/secretariat/peacekeeping-budget/",
    trustFunds: "/secretariat/trust-funds/",
    fieldMissions: "/secretariat/field-missions/",
  };
  await page.goto(portalUrl, { waitUntil: "networkidle" });
  for (const [feature, route] of Object.entries(routes)) {
    assert.equal(
      (await page.locator(`a[href$="${route}"]`).count()) > 0,
      flags[feature],
      route,
    );
    const response = await page.goto(portalUrl + route, {
      waitUntil: "networkidle",
    });
    assert.equal(response.status(), flags[feature] ? 200 : 404, route);
    if (feature !== "fieldMissions") {
      const child = await page.goto(portalUrl + route + "contributors/", {
        waitUntil: "networkidle",
      });
      assert.equal(
        child.status(),
        flags[feature] ? 200 : 404,
        route + "contributors/",
      );
    }
    await page.goto(portalUrl, { waitUntil: "networkidle" });
  }
  await page.goto(portalUrl + "/secretariat/", { waitUntil: "networkidle" });
  const fundingFlows = page.locator("#secretariat-funding-flows");
  await fundingFlows
    .getByRole("heading", {
      name: "Funding mechanisms and priority areas",
      exact: true,
    })
    .waitFor();
  await fundingFlows.locator("svg g[role=button]").first().waitFor();
  assert.equal(
    await page.locator("#secretariat-flows").count(),
    flags.secretariatDetailedFlows ? 1 : 0,
  );
  const columns = await fundingFlows
    .locator("svg g[role=button] > rect")
    .evaluateAll((rects) => [
      ...new Set(rects.map((rect) => rect.getAttribute("x"))),
    ]);
  assert.equal(columns.length, 2, "The public Sankey has exactly two columns");
  const regularBudget = fundingFlows.getByRole("button", {
    name: /^Regular budget:/,
  });
  assert.equal(
    await regularBudget.locator("polygon").last().getAttribute("fill"),
    "var(--color-open-funding-regular-budget)",
  );
  const otherAssessed = fundingFlows.getByRole("button", {
    name: /^Other assessed:/,
  });
  assert.equal(
    await otherAssessed.locator("polygon").last().getAttribute("fill"),
    "var(--color-open-funding-other-assessed)",
  );
  assert.equal(
    await otherAssessed
      .locator("polygon")
      .last()
      .evaluate((node) => getComputedStyle(node).fill),
    "rgb(0, 158, 219)",
  );
  const extrabudgetary = fundingFlows.getByRole("button", {
    name: /^Extrabudgetary:/,
  });
  assert.equal(
    await extrabudgetary.locator("polygon").last().getAttribute("fill"),
    "var(--color-open-funding-extrabudgetary)",
  );
  assert.equal(
    await regularBudget
      .locator("polygon")
      .last()
      .evaluate((node) => getComputedStyle(node).fill),
    "rgb(0, 73, 135)",
  );
  assert.equal(
    await extrabudgetary
      .locator("polygon")
      .last()
      .evaluate((node) => getComputedStyle(node).fill),
    "rgb(197, 223, 239)",
  );
  const ribbonColors = await fundingFlows
    .locator("svg path[role=button]")
    .evaluateAll((paths) =>
      paths.map((path) => ({
        label: path.getAttribute("aria-label"),
        fill: getComputedStyle(path).fill,
      })),
    );
  for (const ribbon of ribbonColors) {
    const node = ribbon.label.startsWith("Other assessed to ")
      ? otherAssessed
      : ribbon.label.startsWith("Extrabudgetary to ")
        ? extrabudgetary
        : regularBudget;
    const sourceColor = await node
      .locator("polygon")
      .last()
      .evaluate((node) => getComputedStyle(node).fill);
    assert.notEqual(sourceColor, "rgb(0, 0, 0)");
    assert.equal(ribbon.fill, sourceColor, ribbon.label);
  }
  await page.mouse.move(0, 0);
  await page.waitForFunction(() =>
    [
      ...document.querySelectorAll(
        "#secretariat-funding-flows svg path[role=button]",
      ),
    ].every((path) => getComputedStyle(path).opacity === "1"),
  );
  const geometry = await fundingFlows
    .locator("svg[role=group]")
    .evaluate((svg) => {
      const nodes = [...svg.querySelectorAll("g[role=button]")];
      const bars = nodes.map((node) =>
        node.querySelector("polygon:last-of-type").getBBox(),
      );
      const sourceRight = Math.min(...bars.map((bar) => bar.x)) + 40;
      const targetLeft = Math.max(...bars.map((bar) => bar.x));
      const ribbons = [...svg.querySelectorAll("path[role=button]")].map(
        (path) => path.getBBox(),
      );
      const labels = nodes
        .filter(
          (node) =>
            node.querySelector("rect").getAttribute("x") ===
            String(targetLeft - 2),
        )
        .map((node) => ({
          full: node.getAttribute("aria-label").split(":")[0],
          shown: [...node.querySelector("text").querySelectorAll("tspan")]
            .map((span) => span.textContent)
            .join(" "),
          right:
            node.querySelector("text").getBBox().x +
            node.querySelector("text").getBBox().width,
        }));
      return {
        sourceRight,
        targetLeft,
        ribbons: ribbons.map((box) => ({ x: box.x, right: box.x + box.width })),
        labels,
        width: svg.viewBox.baseVal.width,
      };
    });
  for (const ribbon of geometry.ribbons) {
    assert.ok(ribbon.x > geometry.sourceRight, "Gap after source bar");
    assert.ok(ribbon.right < geometry.targetLeft, "Gap before priority bar");
  }
  for (const label of geometry.labels) {
    assert.equal(label.shown, label.full, "Priority labels are not truncated");
    assert.ok(label.right < geometry.width, "Priority label fits inside chart");
  }
  await regularBudget.press("Enter");
  await fundingFlows
    .getByRole("button", { name: "Clear selection", exact: true })
    .waitFor();
  await fundingFlows
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await fundingFlows.getByRole("slider").press("ArrowLeft");
  await page.waitForFunction(
    () =>
      !document.querySelector("#secretariat-funding-flows [aria-busy=true]"),
  );
  await fundingFlows.locator("svg[role=group]").waitFor();
  await fundingFlows.screenshot({
    path: `audits/browser/funding-flows-${variant}.png`,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await fundingFlows.screenshot({
    path: `audits/browser/funding-flows-${variant}-mobile.png`,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const [route, heading] of [
    [
      "/system/locations/?year=2024#country=HTI",
      "UNSDG Cooperation Framework financials",
    ],
    [
      "/system/goals/?year=2024#sdg=1",
      "UNSDG Cooperation Framework financials",
    ],
  ]) {
    requests.length = 0;
    await page.goto(portalUrl + route, { waitUntil: "networkidle" });
    // Both deep links must open their CEB sidebar even when UNINFO is disabled.
    await page
      .getByRole("button", { name: /^Close (sidebar|modal)$/, exact: true })
      .waitFor();
    assert.equal(
      requests.some((url) => url.includes("/data/uninfo-")),
      flags.uninfo,
      route,
    );
    const uninfoHeading = page.getByRole("heading", {
      name: heading,
      exact: true,
    });
    if (flags.uninfo) await uninfoHeading.waitFor();
    assert.equal(await uninfoHeading.isVisible(), flags.uninfo, route);
  }
  assert.deepEqual(errors, []);
  console.log(`Feature browser checks passed (${variant}).`);
} finally {
  await browser.close();
}
