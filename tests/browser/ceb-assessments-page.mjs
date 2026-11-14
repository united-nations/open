import assert from "node:assert/strict";
import { chromium, devices } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

async function assertSidebarPosition(page, section) {
  await page.waitForFunction(
    (el) => {
      const content = el.closest(".sidebar-scroll-content");
      const delta =
        el.getBoundingClientRect().top - content.getBoundingClientRect().top;
      const max = content.scrollHeight - content.clientHeight;
      return (
        content.scrollTop > 0 &&
        delta >= 0 &&
        (delta < 55 || Math.abs(content.scrollTop - max) < 3)
      );
    },
    await section.elementHandle(),
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
    await page.goto(`${portalUrl}/system/contributors/`, {
      waitUntil: "networkidle",
    });
    const nav = page.getByRole("navigation", {
      name: "UN System financials",
      exact: true,
    });
    const contributors = nav.getByRole("link", {
      name: "Contributors",
      exact: true,
    });
    const subnav = page.getByRole("navigation", {
      name: "UN System contributor views",
      exact: true,
    });
    assert.deepEqual(await subnav.getByRole("link").allTextContents(), [
      "Overview",
      "Assessed Contributions",
    ]);
    assert.equal(
      await nav.locator('a[href="/system/contributors/assessments/"]').count(),
      0,
    );
    const overview = subnav.getByRole("link", {
      name: "Overview",
      exact: true,
    });
    const assessments = subnav.getByRole("link", {
      name: "Assessed Contributions",
      exact: true,
    });
    assert.equal(await overview.getAttribute("aria-current"), "page");
    await assessments.click();
    await page.waitForURL(`${portalUrl}/system/contributors/assessments/`);
    assert.equal(await assessments.getAttribute("aria-current"), "page");
    assert.equal(await contributors.getAttribute("aria-current"), "page");
    const chart = page.getByRole("region", {
      name: "Assessed contributions and payments",
      exact: true,
    });
    const grouping = chart.getByRole("group", { name: "Group assessments by" });
    const byMemberState = grouping.getByRole("radio", {
      name: "By member state",
    });
    const byOrganization = grouping.getByRole("radio", {
      name: "By organization",
    });
    const years = chart
      .getByRole("combobox", { name: "Select year from list" })
      .first();
    const initialYear = await years.inputValue();
    const legend = chart.getByRole("group", { name: "Assessment measures" });
    const display = chart.getByRole("group", { name: "Data view" });
    const memberSearch = chart.getByRole("searchbox", {
      name: "Search member states",
    });
    const organizationSearch = chart.getByRole("searchbox", {
      name: "Search organizations",
    });
    const sourceParagraph = page.locator("p + p").filter({
      has: page.getByRole("link", {
        name: "CEB Financial Statistics on assessments voted and assessments received",
        exact: true,
      }),
    });
    assert.match(await sourceParagraph.innerText(), /^Figures come from/);
    const china = chart.getByRole("button", {
      name: "China",
      exact: true,
    });
    const un = chart.getByRole("button", {
      name: "UN Secretariat",
      exact: true,
    });
    await china.waitFor();
    assert.ok(await byMemberState.isChecked());
    assert.equal(await un.count(), 0);
    await legend
      .getByText(`Assessed contributions payable in ${initialYear}`, {
        exact: true,
      })
      .waitFor();
    const [groupBox, yearBox, legendBox, displayBox, searchBox, totalsBox] =
      await Promise.all(
        [
          grouping,
          years,
          legend,
          display,
          memberSearch,
          chart.locator("dl").first(),
        ].map((control) => control.boundingBox()),
      );
    const centerY = ({ y, height }) => y + height / 2;
    assert.ok(Math.abs(centerY(groupBox) - centerY(yearBox)) < 2);
    assert.ok(groupBox.y + groupBox.height <= legendBox.y);
    assert.ok(legendBox.y + legendBox.height <= searchBox.y);
    assert.ok(Math.abs(centerY(displayBox) - centerY(searchBox)) < 2);
    if (!mobile) {
      assert.ok(totalsBox.x > searchBox.x + searchBox.width);
      assert.ok(
        totalsBox.y <= centerY(searchBox) &&
          centerY(searchBox) < totalsBox.y + totalsBox.height,
      );
    }
    await years.selectOption("2024");
    if (!mobile) {
      for (const [label, explanation] of [
        ["Assessed contributions payable in 2024", /required to pay.*2024/],
        ["Paid in 2024 towards 2024", /received in 2024.*same year/],
        [
          "Paid in 2024 towards earlier years",
          /received in 2024.*earlier years/,
        ],
      ]) {
        await legend.getByText(label, { exact: true }).hover();
        await page
          .getByRole("tooltip")
          .filter({ hasText: explanation })
          .waitFor();
      }
    }
    const prior = legend.getByRole("button", {
      name: "Paid in 2024 towards earlier years",
      exact: true,
    });
    const current = legend.getByRole("button", {
      name: "Paid in 2024 towards 2024",
      exact: true,
    });
    const tileDescription = () =>
      china.evaluate(
        (tile) =>
          document.getElementById(tile.getAttribute("aria-describedby"))
            .textContent,
      );
    assert.match(await tileDescription(), /Paid in 2024 towards 2024:/);
    await current.click();
    assert.equal(await current.getAttribute("aria-pressed"), "false");
    assert.doesNotMatch(await tileDescription(), /Paid in 2024 towards 2024:/);
    await prior.click();
    assert.equal(await prior.getAttribute("aria-pressed"), "false");
    await memberSearch.fill("China");
    await display.getByRole("radio", { name: "List" }).locator("..").click();
    const list = chart.getByRole("group", { name: "Ranked chart data" });
    const chinaListItem = list.getByRole("button", { name: /^China / });
    await chinaListItem.waitFor();
    assert.doesNotMatch(
      await chinaListItem.innerText(),
      /paid in 2024 towards 2024/,
    );
    await byOrganization.locator("..").click();
    assert.equal(await years.inputValue(), "2024");
    assert.equal(await current.getAttribute("aria-pressed"), "false");
    assert.equal(await prior.getAttribute("aria-pressed"), "false");
    assert.equal(await organizationSearch.inputValue(), "");
    await organizationSearch.fill("UN Secretariat");
    await list.getByText("UN Secretariat", { exact: true }).waitFor();
    await byMemberState.locator("..").click();
    assert.equal(await memberSearch.inputValue(), "China");
    await current.click();
    assert.equal(await current.getAttribute("aria-pressed"), "true");
    await chinaListItem.getByText(/paid in 2024 towards 2024/).waitFor();
    await memberSearch.fill("");
    await prior.click();
    assert.equal(await prior.getAttribute("aria-pressed"), "true");
    await display.getByRole("radio", { name: "Chart" }).locator("..").click();
    await years.selectOption(initialYear);
    const trend = chart.getByRole("region", {
      name: "System-wide assessments and payments over time",
      exact: true,
    });
    const balances = chart.getByRole("region", {
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
    await assertSidebarPosition(page, assessment);
    assert.ok(Math.abs((await page.evaluate(() => scrollY)) - before) < 4);
    assert.equal(
      new URL(page.url()).pathname,
      "/system/contributors/assessments/",
    );
    await dialog
      .getByRole("button", { name: "Select year", exact: true })
      .click();
    await page.getByRole("button", { name: "2023", exact: true }).click();
    const currentPayment = assessment.getByText("Paid in 2023 towards 2023", {
      exact: true,
    });
    await currentPayment.waitFor();
    if (!mobile) {
      await currentPayment.locator("..").focus();
      await page
        .getByRole("tooltip")
        .filter({ hasText: /received in 2023.*same year/ })
        .waitFor();
    }
    await dialog
      .getByRole("button", { name: "Copy link to clipboard", exact: true })
      .click();
    const share = await page.evaluate(() => window.copiedSidebarLink);
    assert.ok(share.includes("/system/contributors/assessments/#assessment="));
    assert.ok(share.endsWith("%402023"));
    await page.goto(share, { waitUntil: "networkidle" });
    await page
      .getByRole("dialog")
      .getByRole("region", { name: "Assessments and payments", exact: true })
      .getByText("Paid in 2023 towards 2023", { exact: true })
      .waitFor();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close sidebar", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await byOrganization.locator("..").click();
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
    await assertSidebarPosition(
      page,
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
          name: "Assessed contributions and payments",
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
      await page.locator("#contributor-trends").scrollIntoViewIfNeeded();
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
        .getByRole("link", { name: "Assessed Contributions", exact: true })
        .getAttribute("href"),
      "/system/contributors/assessments/",
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
    `${portalUrl}/system/contributors/assessments/#assessment=C01%3ACN%402023`,
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
  assert.equal(
    await page.locator('a[href="/system/contributors/assessments/"]').count(),
    0,
    "The homepage lists main tabs only",
  );
  await page.locator('a[href="/system/contributors/"]').waitFor();
  assert.equal(
    await page
      .locator("[data-page-references] + section")
      .getByRole("heading", { name: "Further Resources", exact: true })
      .count(),
    1,
    "About the data appears before Further Resources",
  );
  console.log(
    "Assessed Contributions: contributor subtabs, layout, contextual combined sidebars, year-specific share links, preserved scroll, mobile fit and links from revenue pages passed.",
  );
} finally {
  await browser.close();
}
