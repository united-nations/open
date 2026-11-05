import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch(browserOptions);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const columnCount = async (section) =>
  section
    .locator("svg g[role=button] > rect")
    .evaluateAll(
      (rects) => new Set(rects.map((rect) => rect.getAttribute("x"))).size,
    );
const checkLabelLayout = async (section) => {
  const geometry = await section.locator("svg[role=group]").evaluate((svg) => ({
    x: svg.viewBox.baseVal.x,
    width: svg.viewBox.baseVal.width,
    nodes: [...svg.querySelectorAll("g[role=button]")].map((node) => {
      const [label, amount] = node.querySelectorAll("text");
      const labelBox = label.getBBox();
      const amountBox = amount.getBBox();
      return {
        column: Number(node.querySelector("rect").getAttribute("x")) + 2,
        text: label.textContent,
        lines: label.querySelectorAll("tspan").length,
        left: labelBox.x,
        right: labelBox.x + labelBox.width,
        top: labelBox.y,
        bottom: Math.max(
          labelBox.y + labelBox.height,
          amountBox.y + amountBox.height,
        ),
      };
    }),
  }));
  const columns = [...new Set(geometry.nodes.map((node) => node.column))].sort(
    (a, b) => a - b,
  );
  for (let index = 2; index < columns.length; index++) {
    assert.equal(
      columns[index] - columns[index - 1],
      columns[1] - columns[0],
      "Columns are equally spaced",
    );
  }
  assert.ok(
    geometry.x > 0 && geometry.width < 1110,
    "Viewport trims unused outer space",
  );
  assert.ok(
    geometry.nodes.some((node) => node.lines > 1),
    "Long labels wrap",
  );
  for (const column of columns) {
    let previousBottom = -Infinity;
    for (const node of geometry.nodes
      .filter((node) => node.column === column)
      .sort((a, b) => a.top - b.top)) {
      assert.ok(
        node.left >= geometry.x && node.right <= geometry.x + geometry.width,
        `Label stays inside chart: ${node.text}`,
      );
      assert.ok(
        !node.text.includes("…"),
        `Label is not truncated: ${node.text}`,
      );
      assert.ok(
        node.top >= previousBottom,
        `Wrapped labels do not overlap: ${node.text}`,
      );
      previousBottom = node.bottom;
    }
  }
};
const checkRibbonColors = async (section) => {
  const ribbons = await section.locator("svg[role=group]").evaluate((svg) => {
    const nodes = [...svg.querySelectorAll("g[role=button]")].map((node) => ({
      label: node.getAttribute("aria-label").split(":")[0],
      x: Number(node.querySelector("rect").getAttribute("x")) + 2,
      color: getComputedStyle(node.querySelector("polygon:last-of-type")).fill,
    }));
    return [...svg.querySelectorAll("path[role=button]")].map((path) => {
      const label = path.getAttribute("aria-label");
      const source = nodes.find((node) =>
        label.startsWith(node.label + " to "),
      );
      const target =
        source &&
        nodes.find((node) =>
          label.startsWith(source.label + " to " + node.label + ": "),
        );
      return {
        label,
        actual: getComputedStyle(path).fill,
        expected: source?.x === 190 ? source.color : target?.color,
      };
    });
  });
  assert.ok(ribbons.length > 0);
  for (const ribbon of ribbons)
    assert.equal(
      ribbon.actual,
      ribbon.expected,
      `Ribbon uses its outer column color: ${ribbon.label}`,
    );
};
const checkVisibleBreakdowns = async (section, expected) => {
  const dialog = page.getByRole("dialog");
  for (const heading of [
    "Funding mechanisms",
    "Funding arrangements",
    "Entity categories",
    "Entities",
    "Priority areas",
  ]) {
    assert.equal(
      await dialog.getByRole("heading", { name: heading, exact: true }).count(),
      Number(expected.includes(heading)),
      `Sidebar follows the chart's selected dimension: ${heading}`,
    );
  }
  assert.equal(
    await dialog
      .getByRole("heading", { name: "Source records", exact: true })
      .count(),
    0,
    "Raw hidden dimensions are not exposed in the sidebar",
  );
  const chartLabels = await section
    .locator("svg g[role=button]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label").split(":")[0]),
    );
  for (const heading of expected) {
    const breakdown = dialog.locator("section").filter({
      has: page.getByRole("heading", { name: heading, exact: true }),
    });
    const labels = await breakdown
      .locator(".grid > div:first-child")
      .allTextContents();
    assert.ok(labels.length > 0, `${heading} has a selected breakdown`);
    for (const label of labels)
      assert.ok(
        chartLabels.includes(label),
        `Sidebar item uses a displayed chart group: ${label}`,
      );
  }
};
const select = async (section, label, choice) => {
  await section.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("menuitemradio", { name: choice, exact: true }).click();
  await page.getByRole("menu").waitFor({ state: "detached" });
};
const close = async () => {
  await page
    .getByRole("button", { name: "Close flow details", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
};
const checkSidebar = async () => {
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.equal(await dialog.getAttribute("aria-modal"), "true");
  assert.ok(
    await dialog.locator(".h-2[style]").count(),
    "Sidebar contains financial bars",
  );
  assert.equal(
    await page.locator('section[aria-label="Selected flow"]').count(),
    0,
    "No inline detail panel remains",
  );
  assert.equal(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    true,
    "Focus enters the sidebar",
  );
  const box = await dialog.boundingBox();
  assert.equal(
    Math.round(box.x + box.width),
    page.viewportSize().width,
    "Sidebar is anchored to the right",
  );
  assert.ok(box.width <= 512, "Matches existing sidebar width");
  return dialog;
};
try {
  await page.goto(portalUrl + "/secretariat/", { waitUntil: "networkidle" });
  const section = page.locator("#secretariat-flows");
  await section.locator("svg g[role=button]").first().waitFor();
  assert.equal(
    await page.locator("#secretariat-funding-flows").count(),
    0,
    "Duplicate chart is removed",
  );
  assert.equal(await columnCount(section), 2);
  const selectorPositions = async () => {
    const result = [];
    for (const label of ["Left column", "Middle column", "Right column"]) {
      result.push(
        await section
          .getByRole("button", { name: label, exact: true })
          .evaluate((element) => {
            const slot = element.closest("[data-sankey-column]");
            return {
              left: slot.style.left,
              inside: Boolean(slot.closest(".overflow-x-auto")),
            };
          }),
      );
    }
    return result;
  };
  const fixedPositions = await selectorPositions();
  const assertEqualSpacing = async () => {
    const centers = (await selectorPositions()).map((position) =>
      Number.parseFloat(position.left),
    );
    assert.ok(
      Math.abs(centers[1] - centers[0] - (centers[2] - centers[1])) < 0.00001,
      "Column selectors remain equally spaced",
    );
    assert.ok(
      centers.every((center) => center > 0 && center < 100),
      "Column selectors fit inside the chart",
    );
  };
  await assertEqualSpacing();
  await checkLabelLayout(section);
  await checkRibbonColors(section);
  assert.equal(
    await section
      .getByText("Entity categories are preliminary.", { exact: true })
      .count(),
    0,
  );
  assert.ok(
    fixedPositions.every((position) => position.inside),
    "Selectors are inside the chart above their slots",
  );
  await section
    .getByRole("button", { name: "Middle column", exact: true })
    .locator(".lucide-plus")
    .waitFor();
  const total = await section
    .getByText("Total expenditure", { exact: true })
    .locator("..")
    .innerText();
  for (const label of ["Left column", "Right column"]) {
    await section.getByRole("button", { name: label, exact: true }).click();
    assert.equal(
      await page
        .getByRole("menuitemradio", { name: "None", exact: true })
        .count(),
      0,
      "Outer columns cannot be omitted",
    );
    await page.keyboard.press("Escape");
    await page.getByRole("menu").waitFor({ state: "detached" });
  }

  const regularBudget = section.getByRole("button", {
    name: /^Regular budget:/,
  });
  await regularBudget.press("Enter");
  await checkSidebar();
  await checkVisibleBreakdowns(section, [
    "Funding mechanisms",
    "Priority areas",
  ]);
  await page.screenshot({
    path: "audits/browser/secretariat-flow-sidebar.png",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.waitForFunction(() =>
    document.activeElement
      ?.getAttribute("aria-label")
      ?.startsWith("Regular budget:"),
  );
  await regularBudget.press("Enter");
  await checkSidebar();
  await checkVisibleBreakdowns(section, [
    "Funding mechanisms",
    "Priority areas",
  ]);
  await close();

  await select(section, "Middle column", "Entity category");
  await section
    .getByText("Entity categories are preliminary.", { exact: true })
    .waitFor();
  await checkRibbonColors(section);
  assert.equal(await columnCount(section), 3);
  await checkLabelLayout(section);
  await assertEqualSpacing();
  await regularBudget.press("Enter");
  await checkSidebar();
  await checkVisibleBreakdowns(section, [
    "Funding mechanisms",
    "Entity categories",
    "Priority areas",
  ]);
  await close();
  await select(section, "Left column", "Funding arrangement");
  await select(section, "Middle column", "Entity");
  assert.equal(
    await section
      .getByText("Entity categories are preliminary.", { exact: true })
      .count(),
    0,
  );
  const entityColors = await section
    .locator('svg g[role=button]:has(rect[x="533"]) polygon:last-of-type')
    .evaluateAll((polygons) => [
      ...new Set(polygons.map((polygon) => polygon.getAttribute("fill"))),
    ]);
  assert.deepEqual(
    entityColors,
    ["var(--color-dusty-gray)"],
    "Individual entities have a uniform neutral fill",
  );
  await checkRibbonColors(section);
  assert.equal(
    await section
      .getByRole("button", {
        name: /^(Show all entities and arrangements|Show largest 12 per detailed column)$/,
      })
      .count(),
    0,
    "Detailed columns have no expansion toggle",
  );
  for (const x of ["188", "533"]) {
    assert.ok(
      (await section
        .locator(`svg g[role=button]:has(rect[x="${x}"])`)
        .count()) <= 13,
      "Detailed columns retain at most 12 entries plus their remainder",
    );
  }
  await assertEqualSpacing();
  await section
    .locator(
      'svg g[role=button]:has(rect[x="533"]):not([aria-label*="other entities:"])',
    )
    .first()
    .press("Enter");
  await checkSidebar();
  await checkVisibleBreakdowns(section, [
    "Funding arrangements",
    "Entities",
    "Priority areas",
  ]);
  // A scoped entity drilldown replaces the flow sidebar rather than stacking dialogs.
  await page
    .getByRole("dialog")
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Entities", exact: true }),
    })
    .getByRole("button")
    .first()
    .click();
  await page
    .getByRole("button", { name: "Close entity details", exact: true })
    .waitFor();
  assert.equal(await page.getByRole("dialog").count(), 1);
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("heading", {
        name: "Expenditure by funding source",
        exact: true,
      })
      .count(),
    0,
    "Entity drilldowns do not reintroduce a hidden funding mechanism breakdown",
  );
  await page
    .getByRole("dialog")
    .getByText(/Sankey selection/)
    .waitFor();
  await page
    .getByRole("button", { name: "Close entity details", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  const populatedPositions = await selectorPositions();
  await select(section, "Middle column", "None");
  assert.equal(await columnCount(section), 2);
  assert.deepEqual(
    await selectorPositions(),
    populatedPositions,
    "Removing the middle grouping leaves the column slots in place",
  );
  await assertEqualSpacing();
  assert.deepEqual(
    await section
      .locator("svg g[role=button] > rect")
      .evaluateAll((rects) =>
        [...new Set(rects.map((rect) => rect.getAttribute("x")))].sort(),
      ),
    ["188", "878"],
    "The outer columns stay fixed when the middle column is removed",
  );
  await section
    .getByRole("button", { name: "Middle column", exact: true })
    .locator(".lucide-plus")
    .waitFor();
  await section
    .locator('svg g[role=button]:has(rect[x="188"])')
    .first()
    .press("Enter");
  await checkSidebar();
  await checkVisibleBreakdowns(section, [
    "Funding arrangements",
    "Priority areas",
  ]);
  await close();
  await select(section, "Middle column", "Entity category");
  await select(section, "Left column", "Funding mechanism");
  await select(section, "Middle column", "None");
  assert.equal(
    await section
      .getByText("Total expenditure", { exact: true })
      .locator("..")
      .innerText(),
    total,
    "Changing dimensions preserves the total",
  );
  await section.locator("svg path[role=button]").first().click();
  await checkSidebar();
  await close();

  const slider = section.getByRole("slider");
  const previousYear = Number(await slider.getAttribute("aria-valuenow"));
  await page.route(
    `**/secretariat-overview-${previousYear - 1}.json`,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    },
  );
  await page.evaluate(() => {
    window.savedFlows = document.querySelector("#secretariat-flows svg");
  });
  await slider.press("ArrowLeft");
  await page.waitForTimeout(150);
  assert.equal(
    await page.evaluate(
      () =>
        window.savedFlows === document.querySelector("#secretariat-flows svg"),
    ),
    true,
  );
  assert.match(await section.innerText(), /until ready/);
  await page.waitForFunction(
    () => !document.querySelector("#secretariat-flows [aria-busy=true]"),
  );
  await section.screenshot({ path: "audits/browser/secretariat-flows.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await section.screenshot({
    path: "audits/browser/secretariat-flows-mobile.png",
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "Selectors do not overflow the mobile viewport",
  );
  await section
    .getByRole("button", { name: /^Regular budget:/ })
    .press("Enter");
  await checkSidebar();
  await page.screenshot({
    path: "audits/browser/secretariat-flow-sidebar-mobile.png",
  });
  await close();

  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(portalUrl + "/system/organizations/", {
    waitUntil: "networkidle",
  });
  const system = page.locator("#system-flows");
  await system.locator("svg g[role=button]").first().waitFor();
  assert.equal(await columnCount(system), 3);
  await checkLabelLayout(system);
  await checkRibbonColors(system);
  for (const label of ["Revenue by", "Through", "Expenditure by"]) {
    await system.getByRole("button", { name: label, exact: true }).click();
    assert.equal(
      await page
        .getByRole("menuitemradio", {
          name: /^(None|All organizations combined)$/,
        })
        .count(),
      0,
      "System options are unchanged",
    );
    await page.keyboard.press("Escape");
  }
  await system
    .locator('svg g[role=button]:has(rect[x="533"])')
    .first()
    .press("Enter");
  await checkSidebar();
  await page
    .getByRole("dialog")
    .getByRole("heading", { name: "Revenue and expenditure", exact: true })
    .waitFor();
  await page.screenshot({ path: "audits/browser/system-flow-sidebar.png" });
  await close();
  await select(system, "Through", "Organization");
  await system
    .locator('svg g[role=button]:has(rect[x="533"])')
    .first()
    .press("Enter");
  await checkSidebar();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /^Open organization details/ })
    .click();
  await page
    .getByRole("button", { name: "Close sidebar", exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("dialog").count(),
    1,
    "Organization drilldown replaces the flow dialog",
  );
  await page
    .getByRole("button", { name: "Close sidebar", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await system.locator("svg path[role=button]").first().click();
  await checkSidebar();
  await close();
  await page.setViewportSize({ width: 390, height: 844 });
  await system.locator("svg g[role=button]").first().press("Enter");
  await checkSidebar();
  await page.screenshot({
    path: "audits/browser/system-flow-sidebar-mobile.png",
  });
  await close();
  assert.deepEqual(errors, []);
  console.log(
    "Financial flows: configurable Secretariat columns, conserved totals, shared modal sidebars, keyboard focus, scoped drilldowns and mobile layout passed",
  );
} finally {
  await browser.close();
}
