import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const data = JSON.parse(
    fs.readFileSync("public/data/budget-trust-funds-2024.json"),
  );
  const results = [];
  const assertCleanTreemapTooltip = async (
    tile,
    sourceNode,
    { segment = false } = {},
  ) => {
    await tile.focus();
    const triggerId = await tile.getAttribute("id");
    assert.ok(triggerId);
    const tooltip = page.locator(
      `[role="dialog"][aria-labelledby="${triggerId}"]`,
    );
    await tooltip.waitFor();
    await tooltip.getByText("Expenditure", { exact: true }).waitFor();
    assert.ok(
      (await tooltip.innerText()).includes("$"),
      "Treemap tooltip retains its amount",
    );
    assert.equal(
      await tooltip.getByRole("link").count(),
      0,
      "Trust-fund treemap tooltips must not include source links",
    );
    assert.equal(
      await tooltip.getByText("Source references", { exact: true }).count(),
      0,
    );
    if (sourceNode.source?.symbol)
      assert.ok(
        !(await tooltip.innerText()).includes(sourceNode.source.symbol),
        "Treemap tooltip must not include its source document title",
      );
    if (segment)
      await tooltip.getByText(/Expenses before eliminations/).waitFor();
    await tile.press("Escape");
  };
  const assertSidebarReferences = async (
    sidebar,
    { contributors = false } = {},
  ) => {
    const disclosure = sidebar.locator("[data-expenditure-sources]");
    assert.equal(
      await sidebar
        .locator("summary")
        .filter({ hasText: /^Source references$/ })
        .count(),
      1,
      "Each new entity sidebar must have one consolidated Source references disclosure",
    );
    assert.equal(
      await disclosure.getAttribute("open"),
      null,
      "Consolidated source references must be collapsed by default",
    );
    await disclosure.locator(":scope > summary").click();
    await disclosure
      .getByRole("heading", { name: "Expenditure sources", exact: true })
      .waitFor();
    if (contributors)
      await disclosure
        .getByRole("heading", { name: "Contributor sources", exact: true })
        .waitFor();
    else
      assert.equal(
        await disclosure
          .getByRole("heading", { name: "Contributor sources", exact: true })
          .count(),
        0,
      );
    await disclosure.locator(":scope > summary").click();
    const order = await sidebar.evaluate((root) => {
      const contributor = root.querySelector("[data-xb-contributor-panel]");
      const accounting = [...root.querySelectorAll("details")].find(
        (item) =>
          item.querySelector(":scope > summary")?.textContent.trim() ===
          "Accounting details",
      );
      const sources = root.querySelector("[data-expenditure-sources]");
      const resources = root.querySelector("[data-additional-resources]");
      const before = (left, right) =>
        !left ||
        !right ||
        Boolean(
          left.compareDocumentPosition(right) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        );
      return (
        before(contributor, accounting) &&
        before(accounting, sources) &&
        before(contributor, sources) &&
        before(sources, resources)
      );
    });
    assert.equal(
      order,
      true,
      "Sidebar order must be contributors, accounting, source references, additional resources",
    );
  };
  for (const node of data.nodes.filter(
    (item) => item.sourceGroup === "separate_entities",
  )) {
    if (node.chartAsAggregate)
      assert.equal(
        node.financialPosition,
        undefined,
        "Entity roots must not substitute whole-entity positions for unavailable fund balances",
      );
    assert.equal(
      node.financialPerformance,
      undefined,
      "Whole-entity performance must not be published as trust-fund context",
    );
    assert.ok(
      !/whole (reporting )?entity/i.test(
        node.financialPosition?.scopeNote ?? "",
      ),
      "Financial position must have an explicit fund scope",
    );
  }
  for (let historicalYear = 2017; historicalYear <= 2022; historicalYear++) {
    const historical = JSON.parse(
      fs.readFileSync(`public/data/budget-trust-funds-${historicalYear}.json`),
    );
    assert.equal(
      historical.meta.sourceGroups.find(
        (group) => group.id === "separate_entities",
      ).amount,
      null,
    );
    assert.equal(
      historical.nodes.filter((node) => node.chartAsAggregate).length,
      0,
    );
  }
  await page.goto(`${portalUrl}/secretariat/trust-funds/`, {
    waitUntil: "networkidle",
  });
  const source = page.getByRole("group", { name: "Reporting source" });
  const selectSource = async (key) => {
    for (const group of [...data.meta.sourceGroups].sort(
      (a, b) =>
        Number(key === "all" || key === b.id) -
        Number(key === "all" || key === a.id),
    )) {
      const chip = source.getByRole("button", {
        name: group.label,
        exact: true,
      });
      const desired = key === "all" || key === group.id;
      if ((await chip.getAttribute("aria-pressed")) !== String(desired))
        await chip.click();
      assert.equal(await chip.getAttribute("aria-pressed"), String(desired));
    }
  };
  await source.waitFor();
  assert.equal(
    await source
      .getByRole("button", { name: "All sources", exact: true })
      .count(),
    0,
  );
  for (const group of data.meta.sourceGroups)
    assert.equal(
      await source
        .getByRole("button", { name: group.label, exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
  const totalSummary = page.locator("dl").filter({
    has: page
      .locator("dt")
      .getByText("Reported expenditure (unconsolidated)", { exact: true }),
  });
  const compactUSD = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const assertTotal = async (amount) => {
    assert.equal(await totalSummary.locator("dt").count(), 1);
    assert.equal(
      await totalSummary.locator("dd").innerText(),
      compactUSD.format(amount),
    );
  };
  await assertTotal(
    data.meta.sourceGroups.reduce((sum, group) => sum + group.amount, 0),
  );
  const chartSourceFooter = page.getByRole("button", {
    name: /^Source: UN Secretariat trust-fund schedules/,
  });
  await chartSourceFooter.click();
  const sourceMeasureNote = page.getByText(data.meta.sourceNote, {
    exact: true,
  });
  await sourceMeasureNote.waitFor();
  assert.match(
    await sourceMeasureNote.innerText(),
    /cross-source transfers have not been reconciled or eliminated/i,
  );
  assert.match(
    await sourceMeasureNote.innerText(),
    /not consolidated Secretariat expenditure/i,
  );
  await chartSourceFooter.click();
  await selectSource("none");
  await assertTotal(0);
  await page
    .getByText("Select at least one reporting source.", { exact: true })
    .waitFor();
  await selectSource("all");
  assert.equal(
    await page
      .getByRole("button", { name: "Environment Fund segment", exact: true })
      .count(),
    1,
  );
  for (const group of data.meta.sourceGroups) {
    assert.ok((await page.locator("body").innerText()).includes(group.label));
    assert.equal(
      await page
        .getByRole("region", { name: group.label, exact: true })
        .getByText(group.label, { exact: true })
        .count(),
      0,
    );
  }
  results.push("Two labelled source groups and four entity totals loaded");
  await selectSource("volume_i");
  await assertTotal(
    data.meta.sourceGroups.find((group) => group.id === "volume_i").amount,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Environment Fund segment", exact: true })
      .count(),
    0,
  );
  const legacyTooltipNode = data.nodes.find(
    (node) =>
      node.sourceGroup === "volume_i" &&
      node.tier === "detail" &&
      node.amount > 0,
  );
  await assertCleanTreemapTooltip(
    page
      .getByRole("button", { name: legacyTooltipNode.label, exact: true })
      .first(),
    legacyTooltipNode,
  );
  await selectSource("separate_entities");
  await assertTotal(
    data.meta.sourceGroups.find((group) => group.id === "separate_entities")
      .amount,
  );
  assert.equal(
    await page
      .getByRole("region", { name: "Funds with zero or negative expenditure" })
      .count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Environment Fund segment", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page.getByRole("button", { name: "ITC", exact: true }).count(),
    1,
  );
  const separateChart = page.getByRole("region", {
    name: "Separately reported entities",
    exact: true,
  });
  for (const code of ["UNEP", "UN-HABITAT", "UNODC", "ITC"]) {
    const header = separateChart
      .locator('div.pointer-events-none.absolute[class*="z-20"]')
      .filter({ hasText: new RegExp(`^${code} `) });
    assert.equal(await header.count(), 1, `${code} has one entity group label`);
    assert.equal(await header.isVisible(), true);
    assert.equal(
      await header.locator(":scope > span").isVisible(),
      false,
      `${code} header must not repeat its gross segment sum`,
    );
    const leafName =
      code === "UNEP"
        ? "Environment Fund segment"
        : code === "UN-HABITAT"
          ? "Foundation non-earmarked"
          : code;
    const tile = separateChart.getByRole("button", {
      name: leafName,
      exact: true,
    });
    const headerBounds = await header.boundingBox();
    const tileBounds = await tile.boundingBox();
    assert.ok(headerBounds && tileBounds);
    assert.ok(
      headerBounds.y <= tileBounds.y + 2,
      `${code} label is at group top`,
    );
    if (["UNODC", "ITC"].includes(code)) {
      assert.equal(
        await tile.evaluate((element) => getComputedStyle(element).color),
        "rgba(0, 0, 0, 0)",
        `${code} must not repeat the entity as a fund-level label`,
      );
    }
  }
  for (const entity of ["UNEP", "UN-HABITAT"]) {
    const categories = data.nodes.filter(
      (node) => node.parentId === `xb-entity:${entity}` && node.amount > 0,
    );
    assert.equal(categories.length, entity === "UNEP" ? 6 : 5);
    for (const category of categories) {
      assert.equal(
        await separateChart
          .getByRole("button", {
            name: category.label,
            exact: true,
          })
          .count(),
        1,
        `${entity} category ${category.label} is a chart tile`,
      );
    }
  }
  results.push(
    "Entity labels sit at group level; UNEP and Habitat categories are tiles, with no invented UNODC/ITC fund labels",
  );
  await assertCleanTreemapTooltip(
    page.getByRole("button", { name: "Environment Fund segment", exact: true }),
    data.nodes.find((node) => node.id === "xb:UNEP:annex:I"),
    { segment: true },
  );
  await page
    .getByRole("button", { name: "Environment Fund segment", exact: true })
    .click();
  let dialog = page.locator('aside[role="dialog"]');
  await dialog.waitFor();
  await assertSidebarReferences(dialog);
  await dialog
    .getByText(
      "Fund-account amounts are shown before consolidation and therefore do not add up to the entity total.",
      { exact: true },
    )
    .waitFor();
  const accounting = dialog
    .locator("details")
    .filter({ has: page.getByText("Accounting details", { exact: true }) });
  assert.equal(await accounting.getAttribute("open"), null);
  assert.equal(
    await dialog.getByText("Eliminations", { exact: true }).isVisible(),
    false,
  );
  await dialog.getByText("Accounting details", { exact: true }).click();
  assert.equal(
    await dialog.getByText("Eliminations", { exact: true }).isVisible(),
    true,
  );
  assert.ok((await accounting.locator('a[href*="#page="]').count()) > 0);
  assert.equal(
    await accounting.getByText("Rounding difference", { exact: true }).count(),
    0,
  );
  await dialog.getByText("Accounting details", { exact: true }).click();
  assert.equal(
    await dialog.locator('[data-xb-contributor-panel="UNEP"]').count(),
    0,
  );
  assert.equal(
    await dialog
      .getByRole("heading", { name: "By contributor", exact: true })
      .count(),
    0,
  );
  const resources = dialog.locator("[data-additional-resources]");
  await resources
    .getByRole("heading", { name: "Additional resources", exact: true })
    .waitFor();
  const spendingSources = dialog.locator("[data-expenditure-sources]");
  assert.equal(await spendingSources.getAttribute("open"), null);
  for (const name of [
    /UNEP Annual Report 2024/,
    /CBD contribution-status ledgers 2024/,
    /Audited CBD fund accounts.*PDF p. 135/,
  ]) {
    const resource = resources.getByRole("link", { name });
    assert.equal(
      await resource.isVisible(),
      true,
      "Additional resources must be visible without opening Source references",
    );
    assert.equal(
      await spendingSources.getByRole("link", { name }).count(),
      0,
      "Read-up links must not be mixed into expenditure source references",
    );
  }
  assert.equal(await dialog.getByText(/top-15/).count(), 0);
  const pdfs = await resources
    .locator('a[href*="#page="]')
    .evaluateAll((links) => links.map((link) => link.href));
  assert.ok(pdfs.length >= 2);
  const detail = data.nodes.find((node) => node.id === "xb:UNEP:account:FEL");
  const entityHash = await page.evaluate(() => location.hash);
  const environment = dialog.getByRole("button", {
    name: /^Environment Fund segment/,
  });
  await environment.focus();
  await environment.press("Enter");
  await dialog.getByText(`FEL · ${detail.label}`, { exact: true }).waitFor();
  assert.equal(
    await dialog.locator("[data-fund-position]").count(),
    0,
    "UNEP expanded segments must not show financial-position blocks",
  );
  assert.equal(
    await dialog.getByText("Net assets", { exact: true }).count(),
    0,
  );
  assert.equal(await page.evaluate(() => location.hash), entityHash);
  const conventions = dialog.getByRole("button", {
    name: /^Conventions and protocols segment/,
  });
  await conventions.focus();
  await conventions.press("Enter");
  const caribbean = dialog.getByRole("button", {
    name: /^Caribbean Environment Programme/,
  });
  await caribbean.focus();
  await caribbean.press("Enter");
  await dialog.getByText(/QCL · Support of the Cartagena/).waitFor();
  await dialog.getByText(/CRL · Regional trust fund/).waitFor();
  assert.equal(
    await dialog.locator("[data-fund-position]").count(),
    0,
    "UNEP expanded fund groups must not show financial-position blocks",
  );
  assert.equal(
    await dialog.getByText("Net assets", { exact: true }).count(),
    0,
  );
  assert.equal(await dialog.locator("#trust-fund-title").innerText(), "UNEP");
  assert.equal(await page.evaluate(() => location.hash), entityHash);
  await page.goto(
    `${portalUrl}/secretariat/trust-funds/#trust-fund=${encodeURIComponent(detail.id)}`,
    { waitUntil: "networkidle" },
  );
  await dialog
    .locator("#trust-fund-title")
    .getByText("FEL", { exact: true })
    .waitFor();
  assert.equal(
    await dialog
      .getByRole("heading", { name: "Financial position", exact: true })
      .count(),
    0,
    "UNEP individual-account sidebars must not show a financial-position section",
  );
  assert.equal(await dialog.locator("[data-fund-position]").count(), 0);
  assert.equal(
    await dialog.getByText("Net assets", { exact: true }).count(),
    0,
  );
  await dialog
    .getByRole("button", {
      name: /^Back to United Nations Environment Programme/,
    })
    .click();
  await page.waitForFunction(
    () => document.getElementById("trust-fund-title")?.textContent === "UNEP",
  );
  await dialog.getByRole("button", { name: "Close fund details" }).click();
  await dialog.waitFor({ state: "detached" });
  const search = page.getByRole("searchbox", {
    name: "Search entities and trust funds",
  });
  await search.fill(detail.code);
  assert.equal(
    await page
      .getByRole("button", { name: "Environment Fund segment", exact: true })
      .count(),
    1,
  );
  await search.fill("Cartagena");
  await page
    .getByRole("button", {
      name: "Conventions and protocols segment",
      exact: true,
    })
    .waitFor();
  const matchingTotal = page.locator("dl").filter({
    has: page
      .locator("dt")
      .getByText("Matching expenditure (unconsolidated)", { exact: true }),
  });
  assert.equal(await matchingTotal.locator("dd").innerText(), "$808.1M");
  await search.fill("");
  for (const code of ["UNODC", "UN-HABITAT", "ITC"]) {
    await page
      .getByRole("button", {
        name: code === "UN-HABITAT" ? "Foundation non-earmarked" : code,
        exact: true,
      })
      .click();
    await dialog.waitFor();
    await dialog.getByText("Expenditure", { exact: true }).waitFor();
    assert.ok((await dialog.locator('a[href*="#page="]').count()) > 0);
    const donors = dialog.locator(`[data-xb-contributor-panel="${code}"]`);
    await donors.waitFor();
    assert.equal(
      await donors
        .getByRole("group", { name: "Contributor reporting year" })
        .count(),
      0,
    );
    assert.equal(
      await donors
        .getByRole("group", { name: "Contributor funding scope" })
        .count(),
      0,
    );
    assert.equal(
      await dialog
        .getByRole("heading", {
          name: "Entity-wide revenue and expenses",
          exact: true,
        })
        .count(),
      0,
    );
    if (code === "ITC") {
      await donors
        .getByText(/No contributor breakdown is available.*2024/)
        .waitFor();
      assert.equal(
        await donors.getByText(/XB funding received/).isVisible(),
        false,
      );
    } else if (code === "UNODC") {
      await donors
        .getByText("Total pledged contributions", { exact: true })
        .waitFor();
      assert.equal(
        await donors
          .getByRole("button", {
            name: /General Purpose|Special Purpose|office-wide/,
          })
          .count(),
        0,
      );
      assert.equal(
        await donors.getByRole("table").filter({ visible: true }).count(),
        0,
      );
      assert.ok(!(await donors.innerText()).includes("pledged_contributions"));
      assert.ok(
        !(await donors.innerText()).includes("headline says 82 donors"),
      );
      assert.equal(
        await donors
          .locator("summary")
          .filter({ hasText: /^Source references$/ })
          .count(),
        0,
        "Compact contributor panel must use the sidebar's consolidated references",
      );
    } else {
      await donors
        .getByText(
          "Provisional contributions and transfers covering only part of UN-Habitat’s funding.",
          { exact: true },
        )
        .waitFor();
      const fund = data.nodes.find(
        (node) => node.id === "xb:UN-HABITAT:segment:FNDN",
      );
      assert.ok(
        fund.financialPosition,
        "Habitat Foundation fund position must be explicit in the source data",
      );
      assert.equal(await dialog.locator("[data-fund-position]").count(), 0);
      const foundation = dialog.getByRole("button", { name: /^FNDN ·/ });
      await foundation.focus();
      await foundation.press("Enter");
      const position = dialog.locator("[data-fund-position]");
      await position
        .getByText("Financial position · 31 December 2024", { exact: true })
        .waitFor();
      await position.getByText("Total assets", { exact: true }).waitFor();
      await position.getByText("Net assets", { exact: true }).waitFor();
      assert.equal(
        await dialog.locator("#trust-fund-title").innerText(),
        "UN-HABITAT",
      );
    }
    await assertSidebarReferences(dialog, { contributors: code !== "ITC" });
    await dialog.getByRole("button", { name: "Close fund details" }).click();
    await dialog.waitFor({ state: "detached" });
  }
  const spending2023 = page.waitForResponse((response) =>
    response.url().includes("budget-trust-funds-2023.json"),
  );
  await page.getByRole("slider").first().press("ArrowLeft");
  await (await spending2023).finished();
  await page.getByRole("button", { name: "ITC", exact: true }).click();
  await dialog
    .getByText("International Trade Centre · 2023", { exact: true })
    .waitFor();
  const itc2023 = dialog.locator('[data-xb-contributor-panel="ITC"]');
  await itc2023
    .getByText(
      "Reported funding received; not directly comparable with the other sources.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await itc2023
      .getByRole("group", { name: "Contributor reporting year" })
      .count(),
    0,
  );
  await assertSidebarReferences(dialog, { contributors: true });
  await dialog.getByRole("button", { name: "Close fund details" }).click();
  await dialog.waitFor({ state: "detached" });
  const spending2024 = page.waitForResponse((response) =>
    response.url().includes("budget-trust-funds-2024.json"),
  );
  await page.getByRole("slider").first().press("End");
  await (await spending2024).finished();
  results.push(
    "Source controls, inline hierarchy, same-year contributors and collapsed accounting/provenance work",
  );
  await selectSource("all");
  const legacy = data.nodes.find(
    (node) =>
      node.sourceGroup === "volume_i" &&
      node.tier === "detail" &&
      node.amount > 0,
  );
  await page.goto(
    `${portalUrl}/secretariat/trust-funds/#trust-fund=${encodeURIComponent(legacy.id)}`,
    { waitUntil: "networkidle" },
  );
  dialog = page.locator('aside[role="dialog"]');
  await dialog.waitFor();
  assert.ok((await dialog.innerText()).includes(legacy.label));
  await dialog.getByRole("button", { name: "Close fund details" }).click();
  await dialog.waitFor({ state: "detached" });
  await page.getByRole("slider").first().focus();
  await page.getByRole("slider").first().press("Home");
  await page
    .getByText("Separately reported entities: data is unavailable for 2017.")
    .waitFor();
  await selectSource("separate_entities");
  assert.ok((await page.locator("body").innerText()).includes("Not available"));
  assert.equal(
    await page
      .getByRole("button", { name: "Environment Fund segment", exact: true })
      .count(),
    0,
  );
  const historyYear = page.getByRole("slider").first();
  await historyYear.press("ArrowRight");
  await historyYear.press("ArrowRight");
  await page
    .getByText("Separately reported entities: data is unavailable for 2019.")
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Environment Fund segment", exact: true })
      .count(),
    0,
  );
  await historyYear.press("ArrowRight");
  await historyYear.press("ArrowRight");
  await historyYear.press("ArrowRight");
  await page
    .getByText("Separately reported entities: data is unavailable for 2022.")
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Environment Fund segment", exact: true })
      .count(),
    0,
  );
  results.push(
    "Legacy fund deep links work; 2019–2022 are unavailable without ARWO substitution",
  );
  await selectSource("all");
  await page.getByRole("slider").first().focus();
  await page.getByRole("slider").first().press("End");
  await page
    .getByRole("button", { name: "Environment Fund segment", exact: true })
    .waitFor();
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  await page.screenshot({
    path: "audits/browser/trust-fund-sources-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: "audits/browser/trust-fund-sources-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "audits/browser/trust-fund-sources.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(results);
} finally {
  await browser.close();
}
