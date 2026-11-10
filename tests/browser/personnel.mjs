import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const manifest = JSON.parse(
  fs.readFileSync("public/data/manifest.json", "utf8"),
).personnel;
const source = (year) =>
  JSON.parse(fs.readFileSync(`public/data/personnel-${year}.json`, "utf8"));
const latest = source(manifest.default);
const previous = source(manifest.years.at(-2));
const number = (value) => value.toLocaleString("en-US");
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(30_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${portalUrl}/system/personnel/`);
  await page
    .getByRole("heading", { name: "People across the UN System" })
    .waitFor();
  assert.equal(await page.locator("h1").count(), 1);
  assert.ok(
    (await page.getByTestId("personnel-dashboard").innerText()).includes(
      number(latest.total),
    ),
  );
  assert.equal(
    await page
      .locator("[data-personnel-row]")
      .first()
      .getAttribute("data-personnel-row"),
    "International Professional-UG",
  );
  const chart = page.locator("#personnel-organizations");
  assert.equal(
    await chart.getByRole("slider").count(),
    1,
    "Year is grouped in the treemap header",
  );
  assert.equal(
    await chart
      .getByRole("button", { name: "Organization for organization chart" })
      .count(),
    1,
  );
  assert.equal(
    await page
      .locator(
        '#personnel a[href="https://unsceb.org/statistics/human-resources-statistics/"]',
      )
      .count(),
    1,
    "Intro retains the main data source",
  );
  assert.equal(
    await page
      .locator("[data-page-references] a[data-methodology-link]")
      .getAttribute("href"),
    "/about/#personnel-methodology",
  );
  const scale = chart.locator('[aria-label="Organization chart people scale"]');
  const scaleExpander = chart.locator("[data-personnel-scale-expander]");
  assert.equal(
    await scaleExpander.getAttribute("open"),
    null,
    "Scale starts collapsed",
  );
  await scaleExpander.locator("summary").click();
  await scale.locator('[data-scale-count="10000"]').waitFor();
  assert.deepEqual(
    await scale
      .locator("[data-scale-count]")
      .evaluateAll((items) =>
        items.map((item) => Number(item.getAttribute("data-scale-count"))),
      ),
    [1, 10, 100, 1000, 10000],
  );
  assert.equal(
    await scale.locator('[data-scale-calibrated="true"]').count(),
    1,
  );
  assert.equal(
    await scale
      .locator('[data-scale-calibrated="true"]')
      .getAttribute("data-scale-count"),
    "10000",
  );
  assert.deepEqual(
    await scale
      .locator("[data-zoom-from]")
      .evaluateAll((items) =>
        items.map((item) => [
          Number(item.getAttribute("data-zoom-from")),
          Number(item.getAttribute("data-zoom-to")),
        ]),
      ),
    [
      [10, 1],
      [100, 10],
      [1000, 100],
      [10000, 1000],
    ],
  );
  assert.equal(
    await page
      .getByRole("heading", { name: "How many people is that?" })
      .count(),
    0,
  );
  const referenceSide = Number(
    await scale
      .locator('[data-scale-count="10000"]')
      .getAttribute("data-scale-side"),
  );
  const unicefTile = await chart
    .getByRole("button", { name: "UNICEF", exact: true })
    .boundingBox();
  const unicefStaff = latest.organizations.find(
    (item) => item.org === "UNICEF",
  ).total;
  assert.ok(
    Math.abs(
      referenceSide ** 2 /
        10000 /
        ((unicefTile.width * unicefTile.height) / unicefStaff) -
        1,
    ) < 0.001,
    "Scale reference has the same pixel area per person as a real tile",
  );
  assert.equal(
    await chart
      .getByRole("region", { name: "Peacekeeping", exact: true })
      .count(),
    0,
  );
  const secretariat = chart.getByRole("region", {
    name: "UN Secretariat",
    exact: true,
  });
  for (const entity of ["MINUSCA", "UNAMA", "DPO"]) {
    assert.equal(
      await secretariat
        .getByRole("button", { name: entity, exact: true })
        .count(),
      1,
      `${entity} remains a direct Secretariat tile`,
    );
  }
  await chart.getByRole("button", { name: "DPO", exact: true }).click();
  assert.ok(
    (await page.getByRole("dialog").innerText()).includes(
      "not the financial UN-DPO",
    ),
  );
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("heading", { name: "Gender", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Close personnel sidebar" }).click();
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "DPO",
  );
  await page.keyboard.press("Enter");
  await page.getByRole("dialog", { name: "DPO personnel" }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "DPO",
  );
  const chartSearch = chart.getByRole("searchbox", {
    name: "Search organizations and UN entities",
  });
  await chartSearch.fill(" UNICEF ");
  assert.ok((await chart.innerText()).includes(number(unicefStaff)));
  await chartSearch.fill("");
  const grade = page.locator("#personnel-gender-grade");
  assert.equal(await grade.locator("[data-personnel-row]").count(), 8);
  assert.equal(
    await grade
      .getByRole("radio", { name: "Absolute", exact: true })
      .isChecked(),
    true,
  );
  for (const sex of ["female", "male"]) {
    const bar = grade.locator(`[data-pyramid-sex="${sex}"]`).first();
    assert.deepEqual(
      await bar.evaluate((element, sex) => {
        const style = getComputedStyle(element);
        const outer =
          sex === "female"
            ? [style.borderTopLeftRadius, style.borderBottomLeftRadius]
            : [style.borderTopRightRadius, style.borderBottomRightRadius];
        const center =
          sex === "female"
            ? [style.borderTopRightRadius, style.borderBottomRightRadius]
            : [style.borderTopLeftRadius, style.borderBottomLeftRadius];
        return {
          height: style.height,
          outerRounded: outer.every((value) => parseFloat(value) >= 4),
          centerFlat: center.every((value) => parseFloat(value) === 0),
        };
      }, sex),
      { height: "8px", outerRounded: true, centerFlat: true },
      `${sex} bar has a rounded outer cap and flat center`,
    );
  }
  for (const [id, label] of [
    ["personnel-gender-grade", "International Professional"],
    ["personnel-gender-organization", "Organization"],
  ]) {
    const header = page
      .locator(`#${id}`)
      .getByRole("heading", { name: label, exact: true })
      .locator("..");
    const labelBox = await header
      .getByRole("heading", { name: label, exact: true })
      .boundingBox();
    for (const name of ["Women", "Men", "Staff"]) {
      const box = await header.getByText(name, { exact: true }).boundingBox();
      assert.ok(
        Math.abs(labelBox.y + labelBox.height - box.y - box.height) < 2,
        `${id} ${name} shares the category header row`,
      );
    }
  }
  for (const id of ["personnel-age", "personnel-tenure"]) {
    assert.equal(
      await page.locator(`#${id}`).getByText("Staff", { exact: true }).count(),
      0,
      `${id} has no redundant Staff headers`,
    );
  }
  for (const id of [
    "personnel-gender-grade",
    "personnel-gender-organization",
    "personnel-age",
    "personnel-tenure",
    "personnel-age-trends",
    "personnel-tenure-trends",
  ]) {
    assert.equal(
      await page.locator(`#${id}`).locator("button[aria-pressed]").count(),
      0,
      `${id} uses static legend pills`,
    );
  }
  const dashboardWidth = (
    await page.getByTestId("personnel-dashboard").boundingBox()
  ).width;
  for (const id of [
    "personnel-trends",
    "personnel-gender-trends",
    "personnel-age-trends",
    "personnel-tenure-trends",
    "personnel-gender-grade",
    "personnel-gender-organization",
  ]) {
    assert.ok(
      (await page.locator(`#${id}`).boundingBox()).width <=
        dashboardWidth * 0.51,
      `${id} is half-width on desktop`,
    );
  }
  for (const kind of ["gender", "age", "tenure"]) {
    await page
      .locator(`#personnel-${kind}-trends .recharts-area-area`)
      .first()
      .waitFor();
    assert.ok(
      (await page
        .locator(`#personnel-${kind}-trends .recharts-area-area`)
        .count()) >= 3,
      `${kind} stacked areas render`,
    );
  }
  await grade
    .getByRole("radio", { name: "Relative", exact: true })
    .locator("..")
    .click();
  assert.equal(
    await grade
      .locator('[data-personnel-row] [role="img"]')
      .first()
      .evaluate((element) => getComputedStyle(element).height),
    "8px",
  );
  await grade
    .getByRole("radio", { name: "Absolute", exact: true })
    .locator("..")
    .click();
  await grade
    .getByRole("radio", { name: "Absolute", exact: true })
    .locator("..")
    .click();
  const pyramidMaximum = await grade
    .locator("[data-pyramid-maximum]")
    .first()
    .getAttribute("data-pyramid-maximum");
  await grade
    .getByRole("button", { name: "Show all grades", exact: true })
    .click();
  assert.ok((await grade.locator("[data-personnel-row]").count()) > 8);
  assert.deepEqual(
    [
      ...new Set(
        await grade
          .locator("[data-pyramid-maximum]")
          .evaluateAll((items) =>
            items.map((item) => item.getAttribute("data-pyramid-maximum")),
          ),
      ),
    ],
    [pyramidMaximum],
  );
  assert.ok((await grade.locator("[data-pyramid-unknown]").count()) > 0);
  await grade
    .getByRole("button", { name: "Show fewer grades", exact: true })
    .click();
  assert.equal(
    await grade
      .getByRole("radio", { name: "Absolute", exact: true })
      .isChecked(),
    true,
  );

  // Lazy map rendering must complete after bringing it into view.
  const map = page.getByTestId("personnel-map");
  await map.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-testid="personnel-map"] circle').length >
      100,
    null,
    { timeout: 7000 },
  );
  const geography = page.locator("#personnel-geography");
  assert.equal(
    await geography.getByRole("radio", { name: "List", exact: true }).count(),
    0,
  );
  assert.equal(await geography.locator("table").count(), 0);
  assert.equal(
    await geography.locator(":scope > h2 + p").count(),
    0,
    "No repeated map description, organization scope or date caption",
  );
  await geography
    .getByRole("radio", { name: "Nationality", exact: true })
    .locator("..")
    .click();
  const selectOrg = async (label, value) => {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.getByRole("menuitemradio", { name: value, exact: true }).click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
  };
  const unknownSearch = geography.getByPlaceholder("Search countries…");
  await unknownSearch.fill(" Unclear ");
  await unknownSearch.press("Enter");
  await page
    .getByRole("dialog", { name: "Unclear personnel", exact: true })
    .waitFor();
  const unknownStaff = latest.nationalities
    .filter((row) => row.country === "Unclear")
    .reduce((sum, row) => sum + row.count, 0);
  assert.ok(unknownStaff > 0);
  assert.ok(
    (await page.getByRole("dialog").innerText()).includes(number(unknownStaff)),
  );
  await page.getByRole("button", { name: "Close personnel sidebar" }).click();
  assert.equal(
    await unknownSearch.evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  );
  await unknownSearch.fill("");
  await selectOrg("Organization for organization chart", "IMO");
  await selectOrg("Organization for map", "UNICEF");
  assert.equal(
    await grade
      .getByRole("button", {
        name: "Organization for grade balance",
        exact: true,
      })
      .innerText(),
    "All organizations",
  );
  await selectOrg("Organization for grade balance", "IMO");
  assert.equal(
    await chart
      .getByRole("button", {
        name: "Organization for organization chart",
        exact: true,
      })
      .innerText(),
    "IMO",
  );
  assert.equal(
    await geography
      .getByRole("button", { name: "Organization for map", exact: true })
      .innerText(),
    "UNICEF",
  );
  for (const label of [
    "Organization for organization balance",
    "Organization for workforce trend",
    "Organization for gender trend",
  ]) {
    assert.equal(
      await page.getByRole("button", { name: label, exact: true }).innerText(),
      "All organizations",
      `${label} remains independent`,
    );
  }
  await selectOrg("Organization for organization chart", "All organizations");
  const genderTrend = page.locator("#personnel-gender-trends");
  const menPill = genderTrend.getByRole("button", { name: "Men", exact: true });
  await menPill.click();
  assert.equal(await menPill.getAttribute("aria-pressed"), "false");
  assert.equal(await genderTrend.locator(".recharts-area-area").count(), 2);
  await menPill.click();
  assert.equal(await menPill.getAttribute("aria-pressed"), "true");
  for (const name of ["Women", "Men", "Not reported"])
    await genderTrend.getByRole("button", { name, exact: true }).click();
  await genderTrend.getByText("No series selected.", { exact: true }).waitFor();
  for (const name of ["Women", "Men", "Not reported"])
    await genderTrend.getByRole("button", { name, exact: true }).click();
  await genderTrend.locator(".recharts-area-area").first().waitFor();
  for (const id of [
    "personnel-trends",
    "personnel-gender-trends",
    "personnel-age-trends",
    "personnel-tenure-trends",
    "personnel-age",
    "personnel-tenure",
    "personnel-gender-grade",
    "personnel-gender-organization",
  ]) {
    assert.equal(
      await page.locator(`#${id} > p`).count(),
      0,
      `${id} omits repeated scope/date captions`,
    );
  }
  assert.equal(
    await page
      .locator(
        "#personnel-age button[aria-haspopup], #personnel-tenure button[aria-haspopup], #personnel-age-trends button[aria-haspopup], #personnel-tenure-trends button[aria-haspopup]",
      )
      .count(),
    0,
    "System-wide-only data has no fabricated organization filter",
  );
  assert.equal(
    await page.locator("#personnel-age dl, #personnel-tenure dl").count(),
    0,
    "No redundant system totals",
  );
  assert.equal(
    await page
      .locator(
        "#personnel-gender-grade [data-chart-hint], #personnel-gender-organization [data-chart-hint], #personnel-age [data-chart-hint], #personnel-tenure [data-chart-hint], #personnel-trends [data-chart-hint], #personnel-gender-trends [data-chart-hint], #personnel-age-trends [data-chart-hint], #personnel-tenure-trends [data-chart-hint]",
      )
      .count(),
    0,
    "Hints remain only on map and treemap",
  );
  assert.equal(
    await page
      .locator("#personnel-gender-organization [data-personnel-row]")
      .count(),
    8,
  );
  await page
    .locator("#personnel-gender-organization")
    .getByRole("button", { name: "Show all organizations", exact: true })
    .click();
  assert.equal(
    await page
      .locator("#personnel-gender-organization [data-personnel-row]")
      .count(),
    latest.organizations.length,
  );

  // Opening, sharing and changing years inside the panel preserve page position.
  await selectOrg("Organization for map", "All organizations");
  const countrySearch = geography.getByPlaceholder("Search countries…");
  await countrySearch.fill("USA");
  await countrySearch.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  await countrySearch.press("Enter");
  await page
    .getByRole("dialog", { name: "United States of America personnel" })
    .waitFor();
  assert.ok(
    Math.abs((await page.evaluate(() => window.scrollY)) - scroll) < 5,
    `Open sidebar preserves ${scroll}; actual ${await page.evaluate(() => window.scrollY)}`,
  );
  assert.ok(
    decodeURIComponent(new URL(page.url()).hash).includes(
      `nationality|USA|all@${latest.year}`,
    ),
  );
  assert.equal(
    await page.getByRole("button", { name: "Copy link to clipboard" }).count(),
    1,
  );
  await page.getByRole("button", { name: "Select personnel year" }).click();
  await page
    .getByRole("button", { name: String(previous.year), exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByText(`Staff at 31 December ${previous.year}`, { exact: true })
    .waitFor();
  assert.ok(
    Math.abs((await page.evaluate(() => window.scrollY)) - scroll) < 5,
    "Year changes retain background layout",
  );
  await page.getByRole("button", { name: "Close personnel sidebar" }).click();
  assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - scroll) < 5);

  await page.goto(
    `${portalUrl}/system/personnel/#personnel=${encodeURIComponent(`org|UNICEF|UNICEF@${previous.year}`)}`,
  );
  await page.getByRole("dialog", { name: "UNICEF personnel" }).waitFor();
  assert.ok(
    (await page.getByRole("dialog").innerText()).includes(
      number(
        previous.organizations.find((item) => item.org === "UNICEF").total,
      ),
    ),
  );
  // Invalid same-prefix hashes must close an already-open panel as well.
  await page.evaluate((year) => {
    history.replaceState(
      null,
      "",
      `#personnel=${encodeURIComponent(`org|UNICEF|unknown-organization@${year}`)}`,
    );
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, previous.year);
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(new URL(page.url()).hash, "");

  // A canceled in-flight deep link must stay canceled after its data arrives.
  await page.goto(
    `${portalUrl}/system/personnel/#personnel=${encodeURIComponent(`org|UNICEF|all@${latest.year}`)}`,
  );
  await page.getByRole("dialog", { name: "UNICEF personnel" }).waitFor();
  let releaseYear;
  let interceptYear;
  const heldYear = new Promise((resolve) => {
    releaseYear = resolve;
  });
  const interceptedYear = new Promise((resolve) => {
    interceptYear = resolve;
  });
  const heldPattern = `**/data/personnel-${previous.year}.json`;
  await page.route(heldPattern, async (route) => {
    interceptYear();
    await heldYear;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(previous),
    });
  });
  await page.evaluate((year) => {
    history.replaceState(
      null,
      "",
      `#personnel=${encodeURIComponent(`org|WHO|all@${year}`)}`,
    );
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, previous.year);
  await interceptedYear;
  await page.getByRole("button", { name: "Close personnel sidebar" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  releaseYear();
  await page
    .locator("#personnel-organizations")
    .getByText(`Staff at 31 December ${previous.year}`, { exact: true })
    .waitFor();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(new URL(page.url()).hash, "");
  await page.unroute(heldPattern);

  // Retained error content still exposes controls to recover to a known year.
  await page.goto(`${portalUrl}/system/personnel/`);
  await page
    .getByRole("heading", { name: "People across the UN System" })
    .waitFor();
  await page.route(heldPattern, (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.getByRole("slider").focus();
  await page.keyboard.press("ArrowLeft");
  await page.getByTestId("personnel-dashboard").getByRole("alert").waitFor();
  assert.equal(await page.getByRole("slider").count(), 1);
  await page.getByRole("slider").focus();
  await page.keyboard.press("End");
  await page
    .locator("#personnel-organizations")
    .getByText(`Staff at 31 December ${latest.year}`, { exact: true })
    .waitFor();
  await page.unroute(heldPattern);

  // Unreported organization-years retain the selection without inventing zeros.
  await selectOrg("Organization for organization chart", "ICC");
  await page.getByRole("slider").focus();
  await page.keyboard.press("ArrowLeft");
  await chart
    .getByText(`ICC personnel data is unavailable for ${previous.year}.`, {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await chart
      .getByRole("button", {
        name: "Organization for organization chart",
        exact: true,
      })
      .innerText(),
    "ICC (unavailable)",
  );
  assert.equal(
    await chart.getByText("Unavailable", { exact: true }).count(),
    1,
  );
  await page.getByRole("slider").focus();
  await page.keyboard.press("End");
  await chart.getByRole("button", { name: "ICC", exact: true }).waitFor();

  await page.goto(
    `${portalUrl}/system/personnel/#personnel=${encodeURIComponent(`nationality|USA|UNICEF@${latest.year}`)}`,
  );
  await page
    .getByRole("dialog", { name: "United States of America personnel" })
    .waitFor();
  await page.getByRole("button", { name: "Close personnel sidebar" }).click();
  assert.equal(
    await page
      .locator("#personnel-geography")
      .getByRole("radio", { name: "Nationality", exact: true })
      .isChecked(),
    true,
    "Country deep link restores its geographic measure",
  );

  assert.equal(
    await page
      .getByRole("button", { name: "Organization for map", exact: true })
      .innerText(),
    "UNICEF",
  );
  assert.equal(
    await page
      .getByRole("button", {
        name: "Organization for organization chart",
        exact: true,
      })
      .innerText(),
    "ICC",
    "Country deep link leaves the treemap selection unchanged",
  );
  assert.equal(
    await page
      .getByRole("button", {
        name: "Organization for grade balance",
        exact: true,
      })
      .innerText(),
    "All organizations",
  );

  // Sparse organization histories remain visible without filling unavailable years.
  await page
    .locator("#personnel-gender-trends")
    .getByRole("button", { name: "Organization for gender trend" })
    .click();
  await page.getByRole("menuitemradio", { name: "ICC", exact: true }).click();
  await page.getByRole("menu").waitFor({ state: "hidden" });
  await page.waitForFunction(
    () =>
      Array.from(
        document.querySelectorAll(
          "#personnel-gender-trends .recharts-bar-rectangle",
        ),
      ).filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      }).length === 2,
  );
  assert.equal(
    await page
      .locator(
        "#personnel-gender-grade table, #personnel-gender-organization table, #personnel-age table, #personnel-tenure table, #personnel-trends table, #personnel-gender-trends table, #personnel-age-trends table, #personnel-tenure-trends table",
      )
      .count(),
    0,
    "No expandable numerical tables",
  );

  // Hiding a series preserves the original population denominator.
  const sparseTrend = page.locator("#personnel-gender-trends");
  await sparseTrend.getByRole("button", { name: "Men", exact: true }).click();
  await sparseTrend.locator('[role="application"]').focus();
  for (let i = 0; i < manifest.years.length; i++)
    await page.keyboard.press("ArrowRight");
  const women = latest.composition
    .filter((row) => row.org === "ICC" && row.sex === "F")
    .reduce((sum, row) => sum + row.count, 0);
  const iccTotal = latest.organizations.find((row) => row.org === "ICC").total;
  const sparseTooltip = sparseTrend.locator(".recharts-tooltip-wrapper");
  await sparseTooltip.waitFor({ state: "visible" });
  assert.ok(
    (await sparseTooltip.innerText()).includes(
      `${((women / iccTotal) * 100).toFixed(1)}%`,
    ),
  );
  assert.equal((await sparseTooltip.innerText()).includes("Men"), false);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
    null,
    { timeout: 3000 },
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Active keyboard tooltip remains contained after resize and blur",
  );
  await page.screenshot({
    path: "audits/browser/personnel-mobile.png",
    fullPage: true,
  });

  // A failed annual download is unavailable, and retry can recover.
  await page.route(`**/data/personnel-${latest.year}.json`, (route) =>
    route.abort(),
  );
  await page.goto(`${portalUrl}/system/personnel/`);
  await page
    .getByRole("alert")
    .getByText(`Personnel data could not be loaded for ${latest.year}.`, {
      exact: false,
    })
    .waitFor();
  await page.unroute(`**/data/personnel-${latest.year}.json`);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page
    .getByRole("heading", { name: "People across the UN System" })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log("Personnel browser checks passed.");
} finally {
  await browser.close();
}
