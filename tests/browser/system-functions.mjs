import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) =>
    errors.push(`${page.url()}: ${error.message}`),
  );
  await page.goto(portalUrl + "/", { waitUntil: "networkidle" });
  assert.ok(await page.locator('a[href$="/system/functions/"]').count());
  await page.goto(portalUrl + "/system/functions/", {
    waitUntil: "networkidle",
  });
  const nav = page.getByRole("navigation", { name: "UN System financials" });
  assert.deepEqual(await nav.getByRole("link").allTextContents(), [
    "Organizations",
    "Contributors",
    "Locations",
    "Functions",
    "Goals",
  ]);
  await page
    .getByRole("heading", {
      name: "Which functions do funds support?",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("heading", {
      name: "Expenditure by function over time",
      exact: true,
    })
    .waitFor();
  const slider = page.getByRole("slider");
  assert.equal(await slider.count(), 1);
  const originalYear = Number(await slider.getAttribute("aria-valuenow"));
  await slider.press("ArrowLeft");
  assert.equal(
    Number(await slider.getAttribute("aria-valuenow")),
    originalYear - 1,
  );
  await page.screenshot({
    path: "audits/browser/system-functions.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto(
    portalUrl + "/system/functions/?year=2023#function=development",
    { waitUntil: "networkidle" },
  );
  await page
    .getByRole("dialog", { name: "Development assistance", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Close function details", exact: true })
    .click();
  await page.goto(portalUrl + "/system/goals/?year=2023#function=development", {
    waitUntil: "networkidle",
  });
  await page.waitForURL(
    /\/system\/functions\/\?year=2023#function=development$/,
  );
  await page
    .getByRole("dialog", { name: "Development assistance", exact: true })
    .waitFor();

  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(portalUrl + "/system/goals/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^SDG 1:/ }).waitFor();
  const sdgTrends = page.getByRole("region", {
    name: "Expenditure by SDG classification over time",
  });
  await sdgTrends.getByRole("table").waitFor({ state: "attached" });
  assert.equal(await sdgTrends.locator("tbody tr").count(), 7);
  assert.deepEqual(
    await sdgTrends
      .locator("tbody tr")
      .last()
      .locator("th, td")
      .allTextContents(),
    ["2024", "$41.3B", "$10.2B", "$14.5B", "$66B"],
  );
  await sdgTrends
    .locator(".recharts-area")
    .nth(2)
    .waitFor({ state: "attached" });
  assert.equal(await sdgTrends.getByRole("button").count(), 3);
  assert.equal(
    await page.getByRole("group", { name: "Goals view", exact: true }).count(),
    1,
  );
  const goalsToggle = page.getByRole("radio", { name: "Goals", exact: true });
  const expenditureToggle = page.getByRole("radio", {
    name: "Expenditure",
    exact: true,
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await goalsToggle.locator("..").click();
    await page.waitForTimeout(100);
    const squares = await page
      .getByRole("button", { name: /^SDG \d+:/ })
      .evaluateAll((tiles) =>
        tiles.map((tile) => {
          const rect = tile.getBoundingClientRect();
          const plot = tile.parentElement.getBoundingClientRect();
          return {
            top: rect.top - plot.top,
            width: rect.width,
            height: rect.height,
          };
        }),
      );
    assert.equal(squares.length, 17);
    assert.ok(
      Math.abs(squares[0].top) < 1,
      "Goals grid must align to plot top",
    );
    assert.ok(
      squares.every((tile) => Math.abs(tile.width - tile.height) < 1),
      "Goal tiles must stay square",
    );
    assert.equal(
      await page.locator('[aria-label="Non-SDG"]').isVisible(),
      false,
    );
    assert.equal(
      await page.locator('[aria-label="Not specified"]').isVisible(),
      false,
    );
    const goalsTotal = await page
      .getByText("Total", { exact: true })
      .first()
      .locator("..")
      .innerText();
    await expenditureToggle.locator("..").click();
    await page.waitForTimeout(100);
    const unallocated = page.locator('[aria-label="Non-SDG"]');
    await unallocated.waitFor();
    await page.locator('[aria-label="Not specified"]').waitFor();
    assert.equal(await page.locator('[aria-label="Unallocated"]').count(), 0);
    const snappedEdges = await unallocated
      .locator("[data-entity-label]")
      .evaluateAll((labels) =>
        labels.flatMap((label) => {
          const tile = label.parentElement;
          const box = tile.getBoundingClientRect();
          const parent = tile.parentElement.getBoundingClientRect();
          return [
            box.left - parent.left,
            box.right - parent.left,
            box.top - parent.top,
            box.bottom - parent.top,
          ];
        }),
      );
    assert.ok(
      snappedEdges.every((edge) => Math.abs(edge - Math.round(edge)) <= 0.02),
      "Entity edges must snap to common pixel coordinates regardless of the data layout",
    );
    assert.equal(
      await page
        .getByText("Total", { exact: true })
        .first()
        .locator("..")
        .innerText(),
      goalsTotal,
      "Goals and Expenditure must include the same unallocated amount in their totals",
    );
    const allocatedBottom = await page
      .getByRole("button", { name: /^SDG \d+:/ })
      .evaluateAll((tiles) =>
        Math.max(...tiles.map((tile) => tile.getBoundingClientRect().bottom)),
      );
    const extra = await unallocated.boundingBox();
    assert.ok(extra.y >= allocatedBottom, "Non-SDG must remain below the SDGs");
    assert.ok(
      await page
        .locator("[data-sdg-heading]")
        .evaluateAll((labels) =>
          labels.every(
            (label) => getComputedStyle(label).visibility === "visible",
          ),
        ),
      "SDG group labels must always remain visible",
    );
    const insetViolations = await page
      .locator("[data-sdg-heading]")
      .evaluateAll((labels) =>
        labels
          .filter((label) => {
            const box = label.getBoundingClientRect();
            const tile = label.parentElement.getBoundingClientRect();
            if (tile.width < 2 || tile.height < 2) return false;
            return (
              box.left < tile.left + 0.95 ||
              box.top < tile.top + 0.95 ||
              box.right > tile.right - 0.95 ||
              box.bottom > tile.bottom - 0.95
            );
          })
          .map((label) => label.textContent),
      );
    assert.deepEqual(
      insetViolations,
      [],
      "SDG labels must preserve their inset on every edge",
    );
    const labelFit = await page
      .locator("[data-entity-label]")
      .evaluateAll((labels) => {
        const visible = labels.filter(
          (label) => getComputedStyle(label).visibility === "visible",
        );
        return {
          hidden: labels.length - visible.length,
          visible: visible.length,
          clipped: visible
            .filter((label) => {
              const box = label.getBoundingClientRect();
              const tile = label.parentElement.getBoundingClientRect();
              return (
                box.right > tile.right + 0.5 ||
                box.bottom > tile.bottom + 0.5 ||
                label.scrollWidth > label.clientWidth ||
                label.scrollHeight > label.clientHeight
              );
            })
            .map((label) => label.textContent),
        };
      });
    assert.ok(labelFit.hidden > 0, "Tiny labels should be hidden");
    assert.ok(labelFit.visible > 0, "Readable labels should remain visible");
    assert.deepEqual(
      labelFit.clipped,
      [],
      "Visible labels must fit their tiles",
    );
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.waitForTimeout(1100);
  assert.equal(
    await page
      .getByRole("heading", {
        name: "Expenditure by function over time",
        exact: true,
      })
      .count(),
    0,
  );
  assert.ok(
    !requests.some((url) => url.endsWith("/data/function-expenses.json")),
  );
  assert.ok(
    (await page.locator("body").innerText()).includes(
      "Annual snapshots are not directly comparable",
    ),
  );
  await page.screenshot({
    path: "audits/browser/system-goals-treemap.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: /^SDG 1:/ }).click();
  await page
    .getByRole("button", { name: "Close modal", exact: true })
    .waitFor();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(portalUrl + "/system/goals/", { waitUntil: "networkidle" });
  await goalsToggle.locator("..").click();
  await page.waitForTimeout(1500);
  const animatedNonSdg = page.locator('[aria-label="Non-SDG"]');
  const retainedNode = await animatedNonSdg.elementHandle();
  await expenditureToggle.locator("..").click();
  await page.waitForTimeout(350);
  const entering = await animatedNonSdg.evaluate((tile) => ({
    height: tile.getBoundingClientRect().height,
    target:
      (parseFloat(tile.style.height) *
        tile.parentElement.getBoundingClientRect().height) /
      100,
    duration: getComputedStyle(tile).transitionDuration,
  }));
  assert.ok(
    entering.height > 0 && entering.height < entering.target - 1,
    "Non-SDG must grow into view",
  );
  assert.equal(
    entering.duration,
    await page
      .getByRole("button", { name: /^SDG 1:/ })
      .evaluate((tile) => getComputedStyle(tile).transitionDuration),
  );
  await page.waitForTimeout(1150);
  await goalsToggle.locator("..").click();
  await page.waitForTimeout(350);
  const exitingHeight = await animatedNonSdg.evaluate(
    (tile) => tile.getBoundingClientRect().height,
  );
  assert.ok(
    exitingHeight > 0 && exitingHeight < entering.target - 1,
    "Non-SDG must shrink out of view",
  );
  await page.waitForTimeout(1150);
  assert.equal(await animatedNonSdg.isVisible(), false);
  assert.equal(await retainedNode.evaluate((tile) => tile.isConnected), true);
  assert.deepEqual(errors, []);
  console.log(
    "Functions and Goals: tab order, separate charts, annual selection, current/legacy deep links, and SDG sidebar passed.",
  );
} finally {
  await browser.close();
}
