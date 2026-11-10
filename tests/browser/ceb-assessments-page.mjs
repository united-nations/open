import assert from "node:assert/strict";
import { chromium, devices } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

async function assertSidebarPosition(section) {
  const position = await section.evaluate((el) => {
    const content = el.closest(".sidebar-scroll-content");
    return {
      scroll: content.scrollTop,
      max: content.scrollHeight - content.clientHeight,
      delta:
        el.getBoundingClientRect().top - content.getBoundingClientRect().top,
    };
  });
  assert.ok(
    position.scroll > 0,
    "Sidebar content should scroll to assessments",
  );
  assert.ok(
    position.delta >= 0 &&
      (position.delta < 55 || Math.abs(position.scroll - position.max) < 3),
    `Section should be near panel top: ${JSON.stringify(position)}`,
  );
}

const browser = await chromium.launch(browserOptions);
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage(
      mobile
        ? devices["iPhone 13"]
        : { viewport: { width: 1440, height: 1050 } },
    );
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (text) => {
            window.copiedSidebarLink = text;
          },
        },
      }),
    );
    await page.goto(`${portalUrl}/system/assessments/`, {
      waitUntil: "networkidle",
    });
    const nav = page.getByRole("navigation", {
      name: "UN System financials",
      exact: true,
    });
    const labels = await nav.getByRole("link").allTextContents();
    assert.equal(
      labels.indexOf("Assessments"),
      labels.indexOf("Contributors") + 1,
    );
    const contributors = page.getByRole("region", {
      name: "Assessed contributions payable and paid by member state",
      exact: true,
    });
    const organizations = page.getByRole("region", {
      name: "Assessed contributions receivable and received by organization",
      exact: true,
    });
    const china = contributors.getByRole("button", {
      name: "China",
      exact: true,
    });
    const un = organizations.getByRole("button", {
      name: "UN Secretariat",
      exact: true,
    });
    await china.waitFor();
    await un.waitFor();
    const a = await contributors.boundingBox(),
      b = await organizations.boundingBox();
    assert.ok(Math.abs(a.width - b.width) < 2 && a.y < b.y);
    const trend = organizations.getByRole("region", {
      name: "System-wide assessments and payments over time",
      exact: true,
    });
    const balances = organizations.getByRole("region", {
      name: "Reported outstanding assessments",
      exact: true,
    });
    const trendBox = await trend.boundingBox(),
      balanceBox = await balances.boundingBox();
    if (!mobile)
      assert.ok(
        Math.abs(trendBox.width - balanceBox.width) < 2 &&
          trendBox.x < balanceBox.x,
      );
    await china.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);
    await china.click();
    const dialog = page.getByRole("dialog");
    const assessment = dialog.getByRole("region", {
      name: "Assessments and payments",
      exact: true,
    });
    await assessment.getByText("By organization", { exact: true }).waitFor();
    const revenue = dialog.getByText("Contributions", { exact: true }).first();
    await revenue.waitFor();
    assert.ok(
      await revenue.evaluate(
        (el) =>
          !!(
            document
              .querySelector(
                '[role="dialog"] [aria-label="Assessments and payments"]',
              )
              .compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING
          ),
      ),
    );
    await page.waitForTimeout(500);
    await assertSidebarPosition(assessment);
    assert.ok(Math.abs((await page.evaluate(() => scrollY)) - before) < 4);
    assert.equal(new URL(page.url()).pathname, "/system/assessments/");
    await dialog
      .getByRole("button", { name: "Select year", exact: true })
      .click();
    await page.getByRole("button", { name: "2023", exact: true }).click();
    await assessment.getByText("Paid toward 2023", { exact: true }).waitFor();
    await dialog
      .getByRole("button", { name: "Copy link to clipboard", exact: true })
      .click();
    const share = await page.evaluate(() => window.copiedSidebarLink);
    assert.ok(share.includes("/system/assessments/#assessment="));
    assert.ok(share.endsWith("%402023"));
    await page.goto(share, { waitUntil: "networkidle" });
    await page
      .getByRole("dialog")
      .getByRole("region", { name: "Assessments and payments", exact: true })
      .getByText("Paid toward 2023", { exact: true })
      .waitFor();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close sidebar", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await un.scrollIntoViewIfNeeded();
    await un.click();
    await page
      .getByRole("dialog")
      .getByRole("region", { name: "Assessments and payments", exact: true })
      .getByText("By contributor", { exact: true })
      .waitFor();
    const expenditure = page
      .getByRole("dialog")
      .getByText("Total expenditure", { exact: true });
    await expenditure.waitFor();
    assert.ok(
      await expenditure.evaluate(
        (el) =>
          !!(
            document
              .querySelector(
                '[role="dialog"] [aria-label="Assessments and payments"]',
              )
              .compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING
          ),
      ),
    );
    await page.waitForTimeout(500);
    await assertSidebarPosition(
      page
        .getByRole("dialog")
        .getByRole("region", { name: "Assessments and payments", exact: true }),
    );
    assert.equal(await page.getByRole("dialog").count(), 1);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  const page = await browser.newPage();
  for (const route of ["contributors", "organizations"]) {
    await page.goto(`${portalUrl}/system/${route}/`, {
      waitUntil: "networkidle",
    });
    assert.equal(
      await page
        .getByRole("heading", {
          name: "Assessed contributions payable and paid by member state",
          exact: true,
        })
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("heading", {
          name: "Reported outstanding assessments",
          exact: true,
        })
        .count(),
      0,
    );
    if (route === "organizations") {
      assert.equal(
        await page
          .getByText(/Assessed contributions here are revenue recognized/)
          .count(),
        0,
      );
      await page
        .getByRole("radio", { name: "Revenue", exact: true })
        .locator("..")
        .click();
    }
    const note = page.getByText(
      /Assessed contributions here are revenue recognized/,
    );
    await note.waitFor();
    if (route === "contributors") {
      assert.equal(
        await page
          .getByRole("heading", {
            name: "Explore trends about contributions",
            exact: true,
          })
          .count(),
        0,
      );
      const heading = page.getByRole("heading", {
        name: "Compare contributors",
        exact: true,
      });
      assert.equal(
        await heading.evaluate((el) => getComputedStyle(el).fontSize),
        "18px",
      );
    }
    assert.equal(
      await note
        .getByRole("link", { name: "Assessments", exact: true })
        .getAttribute("href"),
      "/system/assessments/",
    );
    if (route === "organizations") {
      await page
        .getByRole("radio", { name: "Expenditure", exact: true })
        .locator("..")
        .click();
      await note.waitFor({ state: "hidden" });
      await page
        .getByText(/The chart groups organizations using the official/)
        .waitFor();
    }
  }
  await page.goto(
    `${portalUrl}/system/assessments/#assessment=C01%3ACN%402023`,
    { waitUntil: "networkidle" },
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Show all \d+ entities$/ })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "UNDP", exact: true })
    .click();
  await page.waitForURL(
    /\/system\/organizations\/\?year=2023#entity=UNDP%402023$/,
  );
  const recipient = page.getByRole("dialog");
  await recipient.getByRole("heading", { name: "UNDP", exact: true }).waitFor();
  assert.equal(
    await recipient
      .getByRole("button", { name: "Select year", exact: true })
      .innerText(),
    "2023",
  );
  await page.goto(`${portalUrl}/`, { waitUntil: "networkidle" });
  const assessmentCard = page
    .locator('a[href="/system/assessments/"]')
    .filter({ hasText: "Assessments payable" });
  assert.equal(await assessmentCard.count(), 1);
  assert.ok((await assessmentCard.locator("svg rect[stroke]").count()) > 100);
  assert.ok(
    (await assessmentCard
      .locator('svg rect[fill="var(--color-gray-400)"]')
      .count()) > 0,
  );
  console.log(
    "Dedicated Assessments tab: navigation, layout, contextual combined sidebars, year-specific share links, preserved scroll, mobile fit and links from revenue pages passed.",
  );
} finally {
  await browser.close();
}
