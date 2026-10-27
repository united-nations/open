import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  const assertConsistentControls = async (contributorPanel) => {
    assert.equal(await contributorPanel.getByRole("slider").count(), 1);
    assert.equal(
      await contributorPanel.getByRole("slider").getAttribute("aria-valuemin"),
      "2017",
    );
    assert.equal(
      await contributorPanel.getByRole("slider").getAttribute("aria-valuemax"),
      "2024",
    );
    assert.equal(await source.count(), 1);
    assert.equal(await source.getByRole("radio").count(), 5);
    assert.equal(await contributorPanel.getByRole("combobox").count(), 0);
    assert.equal(
      await contributorPanel
        .getByRole("group", { name: "Contributor reporting source" })
        .count(),
      0,
      "Reporting-source toggle must remain outside the chart controls",
    );
    const sourceBounds = await source.boundingBox();
    const yearBounds = await contributorPanel.getByRole("slider").boundingBox();
    assert.ok(sourceBounds && yearBounds);
    assert.ok(
      sourceBounds.y + sourceBounds.height <= yearBounds.y,
      "Source toggle must occupy a separate row above the year/search controls",
    );
    assert.equal(
      await contributorPanel
        .getByRole("group", { name: "Contributor reporting year" })
        .count(),
      0,
    );
    assert.equal(
      await contributorPanel
        .getByRole("group", { name: "Contributor funding scope" })
        .count(),
      0,
    );
  };
  const sourceFooter = (contributorPanel) =>
    contributorPanel
      .locator("footer")
      .getByRole("button", { name: /^Source:/ });
  const assertStandaloneSourceReferences = async (contributorPanel) => {
    assert.equal(
      await contributorPanel
        .locator("summary")
        .filter({ hasText: /^Source references$/ })
        .count(),
      0,
      "Standalone source notes belong in the shared chart footer",
    );
    assert.equal(
      await sourceFooter(contributorPanel).getAttribute("aria-expanded"),
      "false",
    );
    await contributorPanel
      .locator("footer")
      .getByText("Click on a contributor to explore details", { exact: true })
      .waitFor();
  };
  const assertCleanTooltip = async (tile, amountLabel) => {
    await tile.focus();
    const triggerId = await tile.getAttribute("id");
    const tooltip =
      (await tile.getAttribute("aria-haspopup")) === "dialog"
        ? page.locator(`[role="dialog"][aria-labelledby="${triggerId}"]`)
        : page.getByRole("tooltip").filter({ hasText: amountLabel });
    await tooltip.waitFor();
    assert.equal(await tooltip.getByRole("link").count(), 0);
    assert.ok(!(await tooltip.innerText()).includes("Source references"));
    assert.ok((await tooltip.innerText()).includes("$"));
    await tile.press("Escape");
  };
  page.on("pageerror", (error) => errors.push(error.message));
  const data = JSON.parse(
    fs.readFileSync("public/data/secretariat-xb-contributors.json"),
  );
  await page.goto(`${portalUrl}/secretariat/trust-funds/contributors/`, {
    waitUntil: "networkidle",
  });
  const source = page.getByRole("group", {
    name: "Contributor reporting source",
  });
  assert.deepEqual(
    (await source.locator("label").allTextContents()).map((label) =>
      label.trim(),
    ),
    [
      "UN Secretariat trust-fund schedules",
      "UNODC",
      "UN-Habitat",
      "ITC",
      "UNEP",
    ],
    "Reporting sources follow the requested order and Secretariat terminology",
  );
  assert.equal(
    await source
      .getByRole("radio", {
        name: "UN Secretariat trust-fund schedules",
        exact: true,
      })
      .isChecked(),
    true,
  );
  const selectSource = async (name) => {
    await source.getByText(name, { exact: true }).click();
    assert.equal(
      await source.getByRole("radio", { name, exact: true }).isChecked(),
      true,
    );
  };
  const legacy = JSON.parse(
    fs.readFileSync("public/data/trust-fund-contributors-2024.json"),
  );
  const legacyDonor =
    legacy.contributors.find((row) => row.amount_usd > 0) ??
    legacy.contributors[0];
  await assertCleanTooltip(
    page.getByRole("button", { name: legacyDonor.name, exact: true }).first(),
    "Contributions and transfers",
  );
  await selectSource("UN-Habitat");
  let panel = page.locator('[data-xb-contributor-panel="UN-HABITAT"]');
  await panel
    .getByText(
      "Provisional contributions and transfers covering only part of UN-Habitat’s funding.",
      { exact: true },
    )
    .waitFor();
  await panel.getByRole("slider").press("End");
  await panel.getByRole("slider").press("ArrowLeft");
  await assertConsistentControls(panel);
  await assertStandaloneSourceReferences(panel);
  assert.equal(await panel.getByText(/USD 68,100/).isVisible(), false);
  await sourceFooter(panel).click();
  await panel.getByText(/USD 68,100/).waitFor();
  await sourceFooter(panel).click();
  await selectSource("ITC");
  panel = page.locator('[data-xb-contributor-panel="ITC"]');
  await panel
    .getByText(
      "Reported funding received; not directly comparable with the other sources.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await panel.getByRole("slider").getAttribute("aria-valuenow"),
    "2023",
  );
  await panel.getByRole("slider").press("End");
  await panel
    .getByText(/No contributor breakdown is available.*2024/)
    .filter({ visible: true })
    .waitFor();
  await assertConsistentControls(panel);
  const unavailableSummary = panel.locator("dl").filter({
    has: page.locator("dt").getByText("Contributor data", { exact: true }),
  });
  assert.equal(
    await unavailableSummary.locator("dd").innerText(),
    "Not available",
    "Missing ITC2024 contributor data must not be presented as a zero amount",
  );
  assert.equal(
    await sourceFooter(panel).count(),
    1,
    "Unavailable-year charts retain the shared footer",
  );
  await panel.getByRole("slider").press("End");
  await panel.getByRole("slider").press("ArrowLeft");
  await panel
    .getByText(
      "Reported funding received; not directly comparable with the other sources.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await panel
      .getByRole("button", { name: "Revolving funds", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await panel
      .getByText("Other source categories (not named contributors)", {
        exact: true,
      })
      .count(),
    0,
    "Non-donor funding categories must not have a standalone chart section",
  );
  const revolvingNote = panel
    .locator("footer")
    .getByText(
      "Revolving funds: $208K (a funding category, not a named contributor).",
      { exact: true },
    );
  assert.equal(
    await revolvingNote.isVisible(),
    false,
    "Revolving funds belong in the collapsed source notes",
  );
  await sourceFooter(panel).click();
  await revolvingNote.waitFor();
  assert.ok(
    (await revolvingNote.locator("..").locator('a[href*="#page="]').count()) >
      0,
    "The non-donor category must retain its source-page links",
  );
  await sourceFooter(panel).click();
  const itc = data.series.find(
    (s) => s.entity === "ITC" && s.year === 2023 && s.scope === "entity",
  );
  const zeroContributors = itc.rows.filter((row) => row.amount === 0);
  assert.equal(
    zeroContributors.length,
    23,
    "Exact zero source rows must remain available in the extracted data",
  );
  assert.equal(itc.rows.filter((row) => row.amount < 0).length, 0);
  assert.equal(
    await panel
      .getByText("Zero or negative reported amounts", { exact: true })
      .count(),
    0,
  );
  assert.equal(
    await panel.getByText("Negative reported amounts", { exact: true }).count(),
    0,
    "An entity without negative rows must not show an empty negative-amount section",
  );
  for (const row of zeroContributors)
    assert.equal(
      await panel.getByRole("button", { name: row.name, exact: true }).count(),
      0,
      "Exact zero contributor rows must not appear as UI destinations",
    );
  const itcTotal = panel.locator("dl").filter({
    has: page
      .locator("dt")
      .getByText("Listed contributor amounts", { exact: true }),
  });
  const compactUSD = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  assert.equal(
    await itcTotal.locator("dd").innerText(),
    compactUSD.format(itc.contributorTotal),
    "Hiding zero rows must preserve the reported contributor total",
  );
  const itcTile = panel.getByRole("button", {
    name: itc.rows.find((r) => r.amount > 0).name,
    exact: true,
  });
  await assertCleanTooltip(itcTile, "XB funding received");
  await itcTile.click();
  let dialog = page.locator('aside[role="dialog"]');
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /XB funding received/);
  await dialog.getByText("Source references", { exact: true }).click();
  assert.ok((await dialog.locator('a[href*="#page="]').count()) > 0);
  await dialog
    .getByRole("button", { name: "Close contributor details" })
    .click();
  await dialog.waitFor({ state: "detached" });
  await selectSource("UNEP");
  const unepAvailability = page.locator("[data-unep-contributor-availability]");
  await unepAvailability
    .getByText(
      /A contributor breakdown is not available in the official financial data used here/,
    )
    .waitFor();
  const unepAnnualReport = unepAvailability.getByRole("link", {
    name: /UNEP’s annual report/,
  });
  assert.equal(await unepAnnualReport.isVisible(), true);
  assert.equal(
    await unepAnnualReport.getAttribute("href"),
    "https://www.unep.org/annualreport/2023",
  );
  assert.equal(await page.locator("[data-xb-contributor-panel]").count(), 0);
  assert.equal(await page.getByRole("slider").count(), 0);
  assert.equal(await page.getByRole("searchbox").count(), 0);
  assert.equal(
    data.series.filter((series) => series.entity === "UNEP").length,
    0,
    "UNEP availability option must not publish partial contributor series",
  );
  await selectSource("UNODC");
  panel = page.locator('[data-xb-contributor-panel="UNODC"]');
  assert.equal(
    await panel.getByRole("slider").getAttribute("aria-valuenow"),
    "2023",
    "Availability-only UNEP view must preserve the selected reporting year",
  );
  await panel.getByRole("slider").press("End");
  await panel
    .getByText("Pledged contributions, rather than money received or spent.", {
      exact: true,
    })
    .waitFor();
  const unodcSeries = data.series.filter((series) => series.entity === "UNODC");
  assert.ok(
    unodcSeries.every((series) => series.scope === "entity"),
    "UNODC publishes one aggregate view per year",
  );
  assert.equal(
    await panel
      .getByRole("group", { name: "Contributor funding scope" })
      .count(),
    0,
  );
  assert.equal(
    await panel
      .getByRole("button", { name: /General Purpose|Special Purpose/ })
      .count(),
    0,
  );
  await assertConsistentControls(panel);
  await assertStandaloneSourceReferences(panel);
  assert.equal(
    await panel.getByText(/headline says 82 donors/).isVisible(),
    false,
  );
  assert.equal(await panel.getByRole("table").count(), 0);
  assert.ok(!(await panel.innerText()).includes("pledged_contributions"));
  await sourceFooter(panel).click();
  await panel.getByText(/headline says 82 donors/).waitFor();
  assert.ok(!(await panel.innerText()).includes("pledged_contributions"));
  await sourceFooter(panel).click();
  const unodc2024 = unodcSeries.find((series) => series.year === 2024);
  await panel
    .getByRole("button", { name: unodc2024.rows[0].name, exact: true })
    .click();
  dialog = page.locator('aside[role="dialog"]');
  await dialog.waitFor();
  assert.equal(
    await dialog
      .getByRole("heading", { name: "Reported destinations", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await dialog.getByText("General Purpose", { exact: true }).isVisible(),
    false,
  );
  assert.equal(
    await dialog.getByText("Special Purpose", { exact: true }).isVisible(),
    false,
  );
  assert.equal(await dialog.getByRole("table").count(), 0);
  assert.ok(!(await dialog.innerText()).includes("pledged_contributions"));
  await dialog.getByText("Source references", { exact: true }).click();
  assert.ok((await dialog.getByRole("link").count()) > 0);
  assert.ok(!(await dialog.innerText()).includes("pledged_contributions"));
  await dialog
    .getByRole("button", { name: "Close contributor details" })
    .click();
  await dialog.waitFor({ state: "detached" });
  await panel.getByRole("slider").press("End");
  await panel.getByRole("slider").press("ArrowLeft");
  assert.equal(await panel.getByText(/USD 16,382.65/).isVisible(), false);
  await sourceFooter(panel).click();
  await panel.getByText(/USD 16,382.65/).waitFor();
  await sourceFooter(panel).click();
  await selectSource("UN-Habitat");
  panel = page.locator('[data-xb-contributor-panel="UN-HABITAT"]');
  await panel
    .getByText(
      "Provisional contributions and transfers covering only part of UN-Habitat’s funding.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await panel.getByRole("slider").getAttribute("aria-valuenow"),
    "2023",
  );
  await assertConsistentControls(panel);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(700);
  await page.screenshot({
    path: "audits/browser/trust-fund-contributor-sources-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  const results = [
    "Habitat source difference preserved",
    "ITC funding windows and non-donor category separated",
    "UNEP availability view links the annual report without publishing contributor data",
    "UNODC shows one pledge view; provenance and source caveats are collapsed",
    "Source segmented control, shared year slider, chart footer and source-free tooltips are consistent",
    "Contributor details and mobile layout pass",
  ];
  fs.writeFileSync(
    "audits/browser/trust-fund-contributor-sources.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(results);
} finally {
  await browser.close();
}
