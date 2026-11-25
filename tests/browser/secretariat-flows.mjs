import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch(browserOptions);
let page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
const watchPage = () => {
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
};
watchPage();
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
    scale: svg.getScreenCTM().a,
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
        labelFontSize: Number.parseFloat(getComputedStyle(label).fontSize),
        amountFontSize: Number.parseFloat(getComputedStyle(amount).fontSize),
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
      for (const [actual, target] of [
        [node.labelFontSize, 14],
        [node.amountFontSize, 12],
      ]) {
        assert.ok(
          Math.abs(
            actual * geometry.scale - target * Math.min(1, geometry.scale),
          ) < 0.2,
          `Sankey labels retain the normal text scale: ${node.text}`,
        );
      }
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
const select = async (section, label, choice) => {
  await section.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("menuitemradio", { name: choice, exact: true }).click();
  await page.getByRole("menu").waitFor({ state: "detached" });
};
const checkControls = async (section) => {
  const positions = await section
    .locator("[data-sankey-column]")
    .evaluateAll((slots) =>
      slots.map((slot) => {
        const button = slot.querySelector("button");
        const svg = slot
          .closest(".overflow-x-auto")
          .querySelector("svg[role=group]");
        const index = Number(slot.dataset.sankeyColumn);
        const point = svg.createSVGPoint();
        point.x = 210 + index * 345;
        const column = point.matrixTransform(svg.getScreenCTM());
        const box = button.getBoundingClientRect();
        return {
          distance: Math.abs(box.x + box.width / 2 - column.x),
          height: box.height,
          bottom: box.bottom,
          top: svg.getBoundingClientRect().top,
        };
      }),
    );
  assert.equal(positions.length, 3);
  for (const position of positions) {
    assert.ok(position.distance < 2, "Dropdown is directly above its column");
    assert.ok(position.height <= 30, "Dropdown keeps its compact height");
    assert.ok(
      position.bottom <= position.top,
      "Dropdown remains above the diagram",
    );
  }
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
};
const checkInteractions = async (section) => {
  for (const selector of ["svg g[role=button]", "svg path[role=button]"]) {
    const item = section.locator(selector).first();
    await item.hover({ force: true });
    await page.waitForTimeout(200);
    assert.equal(
      await section.locator(".fixed").count(),
      0,
      "Hover shows no tooltip",
    );
    await item.press("Enter");
    assert.equal(
      await item.getAttribute("aria-pressed"),
      "true",
      "Selection still highlights flows",
    );
    assert.equal(
      await page.getByRole("dialog").count(),
      0,
      "Selection opens no sidebar",
    );
    assert.equal(
      await section.locator('section[aria-label="Selected flow"]').count(),
      0,
    );
    await page.keyboard.press("Escape");
    assert.equal(await item.getAttribute("aria-pressed"), "false");
  }
  assert.equal(
    await section.locator("svg title").count(),
    0,
    "No native hover tooltips",
  );
};
try {
  await page.goto(portalUrl + "/secretariat/", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  const section = page.locator("#secretariat-flows");
  await section.scrollIntoViewIfNeeded();
  await section.locator("svg g[role=button]").first().waitFor();
  assert.equal(await columnCount(section), 2);
  await checkControls(section);
  await checkLabelLayout(section);
  await checkRibbonColors(section);
  await checkInteractions(section);
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
    );
    await page.keyboard.press("Escape");
  }
  await select(section, "Middle column", "Entity category");
  await section
    .getByText("Entity categories are preliminary.", { exact: true })
    .waitFor();
  assert.equal(await columnCount(section), 3);
  await checkControls(section);
  await checkLabelLayout(section);
  await checkRibbonColors(section);
  await select(section, "Left column", "Funding arrangement");
  await select(section, "Middle column", "Entity");
  assert.equal(
    await section
      .getByText("Entity categories are preliminary.", { exact: true })
      .count(),
    0,
  );
  await checkControls(section);
  await checkRibbonColors(section);
  for (const x of ["188", "533"]) {
    assert.ok(
      (await section
        .locator(`svg g[role=button]:has(rect[x="${x}"])`)
        .count()) <= 13,
    );
  }
  await select(section, "Middle column", "None");
  assert.equal(await columnCount(section), 2);
  assert.deepEqual(
    await section
      .locator("svg g[role=button] > rect")
      .evaluateAll((rects) =>
        [...new Set(rects.map((rect) => rect.getAttribute("x")))].sort(),
      ),
    ["188", "878"],
  );
  await select(section, "Left column", "Funding mechanism");
  assert.equal(
    await section
      .getByText("Total expenditure", { exact: true })
      .locator("..")
      .innerText(),
    total,
  );
  const slider = section.getByRole("slider");
  const previousYear = Number(await slider.getAttribute("aria-valuenow"));
  await page.route(
    `**/secretariat-overview-${previousYear - 1}.json`,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    },
  );
  const savedSvg = await section.locator("svg[role=group]").elementHandle();
  await slider.press("ArrowLeft");
  await section.getByText(/until ready/).waitFor();
  assert.ok(await savedSvg.evaluate((svg) => svg.isConnected));
  await page.waitForFunction(
    () => !document.querySelector("#secretariat-flows [aria-busy=true]"),
  );
  await section.screenshot({ path: "audits/browser/secretariat-flows.png" });
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await checkControls(section);
    await checkInteractions(section);
  }
  await section.screenshot({
    path: "audits/browser/secretariat-flows-mobile.png",
  });

  await page.close();
  page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  watchPage();
  await page.goto(portalUrl + "/system/organizations/", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  const system = page.locator("#system-flows");
  await system.scrollIntoViewIfNeeded();
  await system.locator("svg g[role=button]").first().waitFor();
  assert.equal(await columnCount(system), 3);
  await checkLabelLayout(system);
  await checkRibbonColors(system);
  await checkControls(system);
  await checkInteractions(system);
  for (const [label, choice] of [
    ["Revenue by", "Contributor category"],
    ["Through", "Organization"],
    ["Expenditure by", "Region"],
  ]) {
    await select(system, label, choice);
    await checkControls(system);
  }
  await system.screenshot({ path: "audits/browser/system-flows.png" });
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await checkControls(system);
    await checkInteractions(system);
  }
  const scroller = system.getByRole("region", {
    name: "Scrollable flow diagram",
  });
  await system.getByRole("button", { name: "Show next flow column" }).click();
  assert.ok(await scroller.evaluate((element) => element.scrollLeft > 0));
  await checkControls(system);
  await select(system, "Through", "Organization category");
  await checkControls(system);
  await system.screenshot({ path: "audits/browser/system-flows-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Financial flows: compact aligned controls, no sidebars or tooltips, highlighting, year changes and mobile scrolling passed",
  );
} finally {
  await browser.close();
}
