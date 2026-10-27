import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const data = (name, year) =>
  JSON.parse(fs.readFileSync(`public/data/${name}-${year}.json`));
const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
const browser = await chromium.launch(browserOptions);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [],
  results = [];
page.on("pageerror", (error) => errors.push(error.message));
const chartYear = async (year) => {
  const slider = page.getByRole("slider").first();
  await slider.press("End");
  while (Number(await slider.getAttribute("aria-valuenow")) > year)
    await slider.press("ArrowLeft");
};
const fiscalLabel = (year) => `${year}/${String(year + 1).slice(-2)}`;
const choose = async (
  dialog,
  year,
  { fiscal = false, assessment = false } = {},
) => {
  await dialog
    .getByRole("button", {
      name: assessment
        ? "Select assessment cycle"
        : fiscal
          ? "Select fiscal year"
          : "Select year",
      exact: true,
    })
    .click();
  if (fiscal || assessment)
    assert.equal(
      await page
        .getByRole("button", { name: String(year), exact: true })
        .count(),
      0,
      "Peacekeeping options must display fiscal cycles rather than calendar years",
    );
  await page
    .getByRole("button", {
      name: fiscal || assessment ? fiscalLabel(year) : String(year),
      exact: true,
    })
    .click();
};
const total = (dialog, label) =>
  dialog
    .locator("div.flex.items-baseline.justify-between > span.min-w-0")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("..")
    .locator(":scope > span")
    .last();
try {
  await page.goto(
    `${portalUrl}/secretariat/trust-funds/#trust-fund=${encodeURIComponent("xb-entity:UNODC")}`,
    { waitUntil: "networkidle" },
  );
  let dialog = page.locator('aside[role="dialog"]');
  await dialog.waitFor();
  const expense = (year) =>
    data("budget-trust-funds", year).nodes.find(
      (node) => node.id === "xb-entity:UNODC",
    ).amount;
  assert.equal(
    await total(dialog, "Expenditure").innerText(),
    money(expense(2024)),
  );
  await choose(dialog, 2023);
  await total(dialog, "Expenditure")
    .filter({ hasText: money(expense(2023)) })
    .waitFor();
  assert.equal(
    await total(dialog, "Expenditure").innerText(),
    money(expense(2023)),
  );
  assert.equal(
    await page.getByRole("slider").first().getAttribute("aria-valuenow"),
    "2024",
  );
  await choose(dialog, 2022);
  await dialog
    .getByText("No fund data is published for this year.", { exact: true })
    .waitFor();
  assert.equal(
    await dialog.getByText("Expenditure", { exact: true }).count(),
    0,
  );
  assert.equal(await dialog.locator("[data-xb-contributor-panel]").count(), 0);
  await choose(dialog, 2024);
  await total(dialog, "Expenditure")
    .filter({ hasText: money(expense(2024)) })
    .waitFor();
  assert.equal(
    await total(dialog, "Expenditure").innerText(),
    money(expense(2024)),
  );
  results.push(
    "Trust-fund expense sidebar changes year independently and hides unavailable-year figures",
  );

  await page.goto(`${portalUrl}/secretariat/trust-funds/contributors/`, {
    waitUntil: "networkidle",
  });
  const source = page.getByRole("group", {
    name: "Contributor reporting source",
  });
  await source.getByText("ITC", { exact: true }).click();
  await chartYear(2023);
  const bundle = JSON.parse(
    fs.readFileSync("public/data/secretariat-xb-contributors.json"),
  );
  const series2023 = bundle.series.find(
    (series) =>
      series.entity === "ITC" &&
      series.scope === "entity" &&
      series.year === 2023,
  );
  const series2022 = bundle.series.find(
    (series) =>
      series.entity === "ITC" &&
      series.scope === "entity" &&
      series.year === 2022,
  );
  const donor = series2023.rows.find(
    (row) =>
      row.amount > 0 &&
      series2022.rows.some(
        (other) => other.name === row.name && other.amount > 0,
      ),
  );
  await page
    .locator('[data-xb-contributor-panel="ITC"]')
    .getByRole("button", { name: donor.name, exact: true })
    .click();
  dialog = page.locator('aside[role="dialog"]');
  await dialog.waitFor();
  assert.equal(
    await total(dialog, series2023.measure).innerText(),
    money(donor.amount),
  );
  await choose(dialog, 2022);
  await total(dialog, series2022.measure)
    .filter({
      hasText: money(
        series2022.rows.find((row) => row.name === donor.name).amount,
      ),
    })
    .waitFor();
  assert.equal(
    await total(dialog, series2022.measure).innerText(),
    money(series2022.rows.find((row) => row.name === donor.name).amount),
  );
  assert.equal(
    await page.getByRole("slider").getAttribute("aria-valuenow"),
    "2023",
  );
  await choose(dialog, 2024);
  await dialog
    .getByText("No contributor data is published for this year.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await dialog.getByText(series2023.measure, { exact: true }).count(),
    0,
  );
  await choose(dialog, 2023);
  await total(dialog, series2023.measure)
    .filter({ hasText: money(donor.amount) })
    .waitFor();
  assert.equal(
    await total(dialog, series2023.measure).innerText(),
    money(donor.amount),
  );
  results.push(
    "Contributor modal switches available years and removes stale totals for a missing year",
  );

  await page.goto(`${portalUrl}/secretariat/programme-budget/`, {
    waitUntil: "networkidle",
  });
  await chartYear(2025);
  await page
    .getByRole("radio", { name: "Approved", exact: true })
    .check({ force: true });
  await page
    .getByRole("radio", { name: "Entities", exact: true })
    .check({ force: true });
  await page.getByRole("button", { name: "OCHA", exact: true }).first().click();
  dialog = page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Select year", exact: true }),
  });
  await dialog.waitFor();
  await dialog
    .getByText("Approved budget by funding source", { exact: true })
    .waitFor();
  const ochaAmount = (year) =>
    data("budget-ppb-approved", year).nodes.find(
      (node) => node.entity?.acronym === "OCHA",
    ).amount;
  await dialog
    .getByText(money(ochaAmount(2025)), { exact: true })
    .filter({ visible: true })
    .first()
    .waitFor();
  await choose(dialog, 2024);
  await dialog
    .getByText(money(ochaAmount(2024)), { exact: true })
    .filter({ visible: true })
    .first()
    .waitFor();
  assert.equal(
    await dialog.getByText(/No budget details are published/).count(),
    0,
  );
  assert.equal(
    await page.getByRole("slider").first().getAttribute("aria-valuenow"),
    "2025",
  );
  await choose(dialog, 2025);
  await page.route("**/budget-ppb-approved-2024.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await choose(dialog, 2024);
  await dialog
    .getByText(
      "Unable to load this year's data. Select another year or try again.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await dialog
      .getByText("Approved budget by funding source", { exact: true })
      .count(),
    0,
  );
  await page.unroute("**/budget-ppb-approved-2024.json");
  await choose(dialog, 2025);
  await dialog
    .getByText(money(ochaAmount(2025)), { exact: true })
    .filter({ visible: true })
    .first()
    .waitFor();
  results.push(
    "Projected PPB entities resolve across years and failed loads hide old funding figures",
  );

  await page.goto(`${portalUrl}/secretariat/programme-budget/`, {
    waitUntil: "networkidle",
  });
  await chartYear(2024);
  await page
    .getByRole("radio", { name: "Expenditure", exact: true })
    .check({ force: true });
  await page
    .getByRole("radio", { name: "Entities", exact: true })
    .check({ force: true });
  await page.getByRole("button", { name: "OCHA", exact: true }).first().click();
  dialog = page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Select year", exact: true }),
  });
  await dialog
    .getByText("Expenditure by funding source", { exact: true })
    .waitFor();
  const expenseSources = (year) =>
    data("budget-ppb-expenditure", year).nodes.find(
      (node) => node.entity?.acronym === "OCHA",
    ).values;
  for (const amount of Object.values(expenseSources(2024)))
    await dialog
      .getByText(money(amount), { exact: true })
      .filter({ visible: true })
      .first()
      .waitFor();
  await choose(dialog, 2023);
  for (const amount of Object.values(expenseSources(2023)))
    await dialog
      .getByText(money(amount), { exact: true })
      .filter({ visible: true })
      .first()
      .waitFor();
  assert.equal(
    await page.getByRole("slider").first().getAttribute("aria-valuenow"),
    "2024",
  );
  results.push(
    "Projected entity expenditure preserves the full published funding scope across sidebar years",
  );

  await page.goto(
    `${portalUrl}/secretariat/peacekeeping-budget/#pko-mission=MINURSO`,
    { waitUntil: "networkidle" },
  );
  dialog = page.getByRole("dialog", { name: "MINURSO", exact: true });
  await dialog.waitFor();
  const missionAmount = (year) =>
    data("budget-pko-expenditure", year).nodes.find(
      (node) => node.tier === "mission" && node.code === "MINURSO",
    ).amount;
  assert.equal(
    await dialog
      .getByRole("button", { name: "Select fiscal year", exact: true })
      .innerText(),
    "2024/25",
  );
  assert.equal(
    await total(dialog, "Expenditure").innerText(),
    money(missionAmount(2024)),
  );
  await choose(dialog, 2023, { fiscal: true });
  await dialog
    .getByText(money(missionAmount(2023)), { exact: true })
    .filter({ visible: true })
    .first()
    .waitFor();
  assert.equal(
    await total(dialog, "Expenditure").innerText(),
    money(missionAmount(2023)),
  );
  assert.equal(
    await page.getByRole("slider").first().getAttribute("aria-valuenow"),
    "2024",
  );
  await choose(dialog, 2024, { fiscal: true });
  assert.equal(
    await total(dialog, "Expenditure").innerText(),
    money(missionAmount(2024)),
  );
  results.push(
    "Mission sidebar updates its fiscal-year total without changing the page year",
  );
  await dialog
    .getByRole("button", { name: "Close mission details", exact: true })
    .click();
  await dialog.waitFor({ state: "detached" });
  await page.route("**/budget-pko-expenditure-2023.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  const missionYearLoaded = page.waitForResponse((response) =>
    response.url().includes("budget-pko-expenditure-2023.json"),
  );
  await page.getByRole("slider").first().press("ArrowLeft");
  await page.evaluate(() => {
    history.pushState(null, "", "#pko-mission=MINURSO");
    dispatchEvent(new HashChangeEvent("hashchange"));
  });
  await (await missionYearLoaded).finished();
  dialog = page.getByRole("dialog", { name: "MINURSO", exact: true });
  await total(dialog, "Expenditure")
    .filter({ hasText: money(missionAmount(2023)) })
    .waitFor();
  assert.equal(
    await dialog
      .getByRole("button", { name: "Select fiscal year", exact: true })
      .innerText(),
    "2023/24",
    "Opening during a page-year load must resolve to the loaded mission year",
  );
  await page.unrouteAll({ behavior: "wait" });
  results.push(
    "Mission opened during a page-year request resets to the loaded fiscal year",
  );
  await page.goto(
    `${portalUrl}/secretariat/peacekeeping-budget/contributors/#peacekeeping-contributor=Germany`,
    { waitUntil: "networkidle" },
  );
  dialog = page.locator('aside[role="dialog"]');
  await dialog.waitFor();
  const assessmentYear = Number(
    await page.getByRole("slider").getAttribute("aria-valuenow"),
  );
  const assessment = (year) =>
    data("peacekeeping-contributors", year).contributors.find(
      (row) => row.name === "Germany",
    ).net_assessment;
  assert.equal(
    await dialog
      .getByRole("button", { name: "Select assessment cycle", exact: true })
      .innerText(),
    fiscalLabel(assessmentYear),
  );
  await choose(dialog, 2024, { assessment: true });
  await total(dialog, "Net assessed amount")
    .filter({ hasText: money(assessment(2024)) })
    .waitFor();
  assert.equal(
    await dialog
      .getByRole("button", { name: "Select assessment cycle", exact: true })
      .innerText(),
    "2024/25",
  );
  await choose(dialog, 2023, { assessment: true });
  await total(dialog, "Net assessed amount")
    .filter({ hasText: money(assessment(2023)) })
    .waitFor();
  assert.equal(
    await dialog
      .getByRole("button", { name: "Select assessment cycle", exact: true })
      .innerText(),
    "2023/24",
  );
  assert.equal(
    await page.getByRole("slider").getAttribute("aria-valuenow"),
    String(assessmentYear),
  );
  results.push(
    "Peacekeeping contributor header and menu display complete assessment cycles while retaining numeric data keys",
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "audits/browser/secretariat-sidebar-years.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(results);
} finally {
  await browser.close();
}
