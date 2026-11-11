import assert from "node:assert/strict";
import { chromium } from "playwright";
import profiles from "../../config/features.json" with { type: "json" };
import { browserOptions, portalUrl } from "./helpers.mjs";

const flags = profiles[process.env.SITE_VARIANT ?? "public"];
const browser = await chromium.launch(browserOptions);
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  const goto = (route) =>
    page.goto(portalUrl + route, { waitUntil: "networkidle" });
  const scrollY = () => page.evaluate(() => window.scrollY);
  const place = async (locator, top) => {
    await locator.evaluate((el, y) => {
      window.scrollBy(0, el.getBoundingClientRect().top - y);
    }, top);
    return locator.boundingBox();
  };
  const swipe = async (x, y, dx, dy) => {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 10; i++) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + (dx * i) / 10, y: y + (dy * i) / 10 }],
      });
    }
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  };
  const assertReflow = () =>
    page.waitForFunction(
      () =>
        document.documentElement.scrollWidth ===
        document.documentElement.clientWidth,
    );

  await page.setViewportSize({ width: 320, height: 568 });
  await goto("/system/goals/");
  await page.waitForFunction(() => {
    const link = document.querySelector('main nav [aria-current="page"]');
    const bounds = link?.getBoundingClientRect();
    return bounds && bounds.left >= 0 && bounds.right <= innerWidth;
  });
  await page.locator("[data-sdg-heading]").first().waitFor();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("[data-sdg-heading]")]
      .filter(
        (node) =>
          node.getBoundingClientRect().height > 0 &&
          node.closest("[data-sdg-number], button")?.getBoundingClientRect()
            .height > 0,
      )
      .every((node) => {
        const tile = node
          .closest("[data-sdg-number], button")
          .getBoundingClientRect();
        return node.getBoundingClientRect().bottom <= tile.bottom + 1;
      }),
  );
  await assertReflow();
  const goalsView = page.getByRole("group", { name: "Goals view" });
  await goalsView.getByRole("radio", { name: "SDG overview" }).waitFor();
  await goalsView.getByRole("radio", { name: "List" }).locator("..").tap();
  await page.locator("[data-ranked-list-item]").first().waitFor();
  await goalsView.getByRole("radio", { name: "Chart" }).locator("..").tap();
  await page.locator("[data-sdg-heading]").first().waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  await goto("/system/goals/#sdg=1");
  await page.reload({ waitUntil: "networkidle" });
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.waitForFunction(() =>
    document.querySelector('[role="dialog"]').contains(document.activeElement),
  );
  await dialog.getByRole("button", { name: "Select year", exact: true }).tap();
  await page
    .getByRole("button", { name: /^20\d\d$/, exact: false })
    .first()
    .waitFor();
  await page.keyboard.press("Escape");
  assert.equal(
    await dialog.count(),
    1,
    "Escape closes only the nested year selector",
  );
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(
    () => document.activeElement.id === "main-content",
  );

  await goto("/system/contributors/");
  const slider = page.getByRole("slider").first();
  const track = await place(slider, 230);
  assert.ok(track);
  const year = await slider.getAttribute("aria-valuenow");
  const start = await scrollY();
  await swipe(track.x + 20, track.y + 20, 0, -105);
  await page.waitForFunction((y) => window.scrollY > y + 35, start);
  assert.equal(await slider.getAttribute("aria-valuenow"), year);
  const repositioned = await place(slider, 230);
  await swipe(
    repositioned.x + repositioned.width - 4,
    repositioned.y + 20,
    -65,
    0,
  );
  await page.waitForFunction(
    (previous) =>
      document
        .querySelector('[role="slider"]')
        .getAttribute("aria-valuenow") !== previous,
    year,
  );

  await goto("/system/contributors/");
  const chart = page.getByRole("group", { name: "Data view" }).first();
  await page.setViewportSize({ width: 1107, height: 844 });
  const [filters, toggle, yearControl, search] = await Promise.all([
    page.getByRole("group", { name: "Financing instruments" }).boundingBox(),
    chart.boundingBox(),
    page.getByRole("slider").first().boundingBox(),
    page.getByRole("searchbox", { name: "Search contributors" }).boundingBox(),
  ]);
  assert.ok(filters && toggle && yearControl && search);
  assert.ok(filters.y + filters.height <= toggle.y);
  assert.ok(toggle.x < yearControl.x && yearControl.x < search.x);
  assert.ok(
    Math.abs(toggle.y + toggle.height / 2 - search.y - search.height / 2) < 2,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await chart
    .getByRole("radio", { name: "List", exact: true })
    .locator("..")
    .tap();
  const list = page.getByRole("group", { name: "Ranked chart data" });
  await list.waitFor();
  assert.ok(
    (await list.getByRole("list").first().getByRole("listitem").count()) > 1,
    "Member States share a ranked list",
  );
  const expand = page.getByRole("button", { name: /^Show more \(/ }).first();
  await expand.press("Enter");
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll("[data-ranked-list-item]");
    return rows.length > 20 && rows[20].contains(document.activeElement);
  });
  assert.ok((await list.getByRole("list").count()) > 0);
  await page.getByRole("button", { name: "Show less", exact: true }).tap();
  assert.equal(await list.locator("[data-ranked-list-item]").count(), 20);
  await page.setViewportSize({ width: 320, height: 844 });
  assert.ok(
    await list
      .locator("[data-ranked-list-item]")
      .first()
      .evaluate((row) => {
        const [name, bar, amount] = Array.from(row.children, (element) =>
          element.getBoundingClientRect(),
        );
        return (
          bar.width > 0 &&
          name.right < amount.left &&
          bar.top >= Math.max(name.bottom, amount.bottom) &&
          Math.abs(bar.left - name.left) < 1 &&
          Math.abs(bar.right - amount.right) < 1
        );
      }),
    "The bar spans the row below the name and amount at 320 px",
  );
  await chart
    .getByRole("radio", { name: "Chart", exact: true })
    .locator("..")
    .tap();
  await page.waitForFunction(() => {
    const plot = document.querySelector(
      "main [style*='--grouped-treemap-height']",
    );
    const tile = plot?.querySelector("button[aria-describedby]");
    const bounds = plot?.getBoundingClientRect();
    return (
      bounds &&
      bounds.width > 0 &&
      bounds.width < 320 &&
      tile?.getBoundingClientRect().width > 0
    );
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await chart
    .getByRole("radio", { name: "List", exact: true })
    .locator("..")
    .tap();
  await page
    .getByRole("searchbox", { name: "Search contributors" })
    .fill("Switzerland");
  const donor = list.getByRole("button", { name: /^Switzerland/ });
  const donorBox = await place(donor, 220);
  assert.ok(
    (await donor.locator('[aria-hidden="true"] [style*="width"]').count()) > 0,
  );
  const beforeDrawer = await scrollY();
  await page.touchscreen.tap(
    donorBox.x + donorBox.width / 2,
    donorBox.y + donorBox.height / 2,
  );
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Close sidebar" }).tap();
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(() =>
    document.activeElement.matches("[data-ranked-list-item]"),
  );
  assert.ok(
    await donor.evaluate((element) => document.activeElement === element),
  );
  assert.equal(await scrollY(), beforeDrawer);

  await page.setViewportSize({ width: 667, height: 375 });
  await goto("/system/contributors/#donor=Switzerland");
  await dialog.getByRole("button", { name: "Select year", exact: true }).tap();
  const yearPopup = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("button", { name: "2011", exact: true }) })
    .last();
  await yearPopup.waitFor();
  assert.ok(
    await yearPopup.evaluate((node) => node.scrollHeight > node.clientHeight),
  );
  const popupBox = await yearPopup.boundingBox();
  await swipe(
    popupBox.x + popupBox.width / 2,
    popupBox.y + popupBox.height - 30,
    0,
    -170,
  );
  await page.waitForFunction(() => {
    const popup = [...document.querySelectorAll('[role="dialog"]')].at(-1);
    return popup.scrollTop > 50;
  });
  await yearPopup.getByRole("button", { name: "2011", exact: true }).tap();
  await dialog.waitFor();
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  await goto("/system/locations/");
  const map = page.getByTestId("locations-map");
  const plot = map.locator("svg").first();
  const mapBox = await place(plot, 180);
  assert.ok(mapBox.height < 650);
  const zoom = map.getByRole("button", { name: "Zoom in", exact: true });
  assert.ok((await zoom.boundingBox()).height >= 44);
  const zoomOut = map.getByRole("button", { name: "Zoom out", exact: true });
  assert.ok((await zoomOut.boundingBox()).height >= 44);
  const mapStart = await scrollY();
  await swipe(mapBox.x + mapBox.width / 2, 425, 0, -155);
  await page.waitForFunction((y) => window.scrollY > y + 35, mapStart);
  const geographicView = page.getByRole("group", { name: "Geographic view" });
  assert.equal(await geographicView.getByRole("radio").count(), 3);
  await geographicView.getByRole("radio", { name: "List" }).locator("..").tap();
  const geographicList = page.getByRole("group", {
    name: "Expenditure by location",
  });
  await geographicList.getByRole("group").first().waitFor();
  await geographicView
    .getByRole("radio", { name: "Chart" })
    .locator("..")
    .tap();
  await page
    .locator(
      "main [style*='--grouped-treemap-height'] button[aria-describedby]",
    )
    .first()
    .waitFor();
  await geographicView.getByRole("radio", { name: "List" }).locator("..").tap();
  await page.getByRole("button", { name: "All entities", exact: true }).tap();
  await page.getByPlaceholder("Search...", { exact: true }).fill("WIPO");
  await page.getByText("WIPO", { exact: true }).tap();
  await page
    .getByRole("searchbox", { name: "Search by country or region" })
    .fill(" Kenya ");
  await page
    .getByText("No records match the selected filters.", { exact: true })
    .waitFor();
  assert.equal(await geographicList.count(), 0);

  const requests = [];
  page.on("request", (request) =>
    requests.push(new URL(request.url()).pathname),
  );
  await goto("/system/organizations/");
  assert.ok(
    requests.every((path) => !path.includes("/data/system-flow-spending")),
  );
  const flows = page.locator("#system-flows");
  await flows.scrollIntoViewIfNeeded();
  const diagram = flows.getByRole("region", {
    name: "Scrollable flow diagram",
  });
  const next = flows.getByRole("button", { name: "Show next flow column" });
  await next.tap();
  await page.waitForFunction(
    () =>
      document.querySelector('[aria-label="Scrollable flow diagram"]')
        .scrollLeft > 0,
  );
  const explore = flows.getByRole("button", { name: "Explore column 2 of 3" });
  await explore.press("Enter");
  await page.waitForFunction(() =>
    document.activeElement.matches("svg g[role=button]"),
  );
  await flows.getByRole("button", { name: "Show previous flow column" }).tap();
  await page.waitForFunction(
    () =>
      document.querySelector('[aria-label="Scrollable flow diagram"]')
        .scrollLeft === 0,
  );
  assert.equal(
    await flows.getByRole("button", { name: "Flow list", exact: true }).count(),
    0,
  );
  assert.ok(
    requests.some((path) => /\/system-flow-spending\/\d{4}\.json$/.test(path)),
  );
  assert.ok(!requests.includes("/data/system-flow-spending.json"));
  const flow = diagram.locator("svg g[role=button]").first();
  await flow.press("Enter");
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Close flow details" }).tap();
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(
    (element) => document.activeElement === element,
    await flow.elementHandle(),
  );
  await page.setViewportSize({ width: 1200, height: 844 });
  await next.waitFor({ state: "hidden" });

  if (flags.regularBudgetOutstanding) {
    for (const width of [320, 390, 412]) {
      await page.setViewportSize({ width, height: 844 });
      await goto("/secretariat/programme-budget/contributors/");
      await page
        .getByText("Outstanding contributions over time", { exact: true })
        .waitFor();
      await assertReflow();
      if (width === 320) {
        const outstanding = page.getByRole("group", {
          name: "Outstanding contributions display",
        });
        assert.equal(await outstanding.getByRole("radio").count(), 3);
        await outstanding
          .getByRole("radio", { name: "List" })
          .locator("..")
          .tap();
        await page
          .getByRole("group", { name: "Outstanding balances by Member State" })
          .getByRole("listitem")
          .first()
          .waitFor();
        await outstanding
          .getByRole("radio", { name: "Chart" })
          .locator("..")
          .tap();
        await page
          .locator("#regular-budget-outstanding button[aria-describedby]")
          .first()
          .waitFor();
      }
      await page.getByText("Financial situation presentations by year").click();
      await page
        .getByRole("link", { name: /^2025 ·/ })
        .first()
        .waitFor();
      await assertReflow();
    }
  }
  if (flags.programmeBudget) {
    requests.length = 0;
    await goto("/secretariat/programme-budget/");
    await page
      .getByRole("heading", { name: "Programme budget over time" })
      .waitFor();
    const budgetFiles = requests.filter((path) =>
      /\/budget-ppb-(approved|proposed|expenditure)-\d{4}\.json$/.test(path),
    );
    assert.ok(
      budgetFiles.length <= 2 &&
        budgetFiles.every((path) => path.includes("-expenditure-")),
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Source citations", exact: true })
        .count(),
      0,
    );
    await page.getByRole("group", { name: "Budget trends" }).waitFor();
  }
  if (flags.peaceOperations) {
    await goto("/secretariat/peacekeeping-budget/peace-operations/");
    const listView = page
      .getByRole("group", { name: "Field mission view" })
      .getByRole("radio", { name: "List", exact: true })
      .locator("..");
    const firstMission = page
      .getByRole("group", { name: "Field mission expenditure" })
      .getByRole("button")
      .first();
    await listView.tap();
    await firstMission.tap();
    await dialog.waitFor();
    assert.match(new URL(page.url()).hash, /^#field-mission=.+%40\d{4}$/);
    await page.reload({ waitUntil: "networkidle" });
    await dialog.waitFor();
    await dialog.getByRole("button", { name: "Close mission details" }).tap();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(new URL(page.url()).hash, "");

    await listView.tap();
    const missionYear = page.getByRole("slider").first();
    const previousYear =
      Number(await missionYear.getAttribute("aria-valuenow")) - 1;
    const previousFile = `/data/secretariat-overview-${previousYear}.json`;
    let unblock;
    const delay = new Promise((resolve) => {
      unblock = resolve;
    });
    await page.route(`**${previousFile}`, async (route) => {
      await delay;
      await route.continue();
    });
    try {
      const requested = page.waitForRequest((request) =>
        request.url().endsWith(previousFile),
      );
      await missionYear.press("ArrowLeft");
      await requested;
      await firstMission.tap();
      assert.equal(new URL(page.url()).hash, "");
      assert.equal(await dialog.count(), 0);
    } finally {
      unblock();
    }
  }
  console.log(
    "Mobile reflow, touch controls, navigation, focus, ranked lists, and deferred requests passed",
  );
} finally {
  await browser.close();
}
