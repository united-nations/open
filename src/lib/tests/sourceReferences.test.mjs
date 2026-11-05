import assert from "node:assert/strict";
import test from "node:test";
import { moduleAt } from "./moduleAt.mjs";
const {
  sourceDocumentUrl,
  sourcePageUrl,
  sourceDownloads,
  uniqueSourceReferences,
} = await moduleAt("src/lib/sourceReferences.ts");
const schedule =
  "https://digitallibrary.un.org/record/4087012/files/%28DMSPC_OPPFB%29_FINANCIAL_STATEMENTS_FOR_THE_YEAR_ENDED_31_DECEMBER_2024-EN.pdf";
const ods =
  "https://documents.un.org/doc/undoc/gen/n25/222/89/pdf/n2522289.pdf";

test("verified identical ODS copy retains the physical page and viewer options", () => {
  assert.equal(
    sourceDocumentUrl(schedule + "#page=298&zoom=125"),
    ods + "#page=298&zoom=125",
  );
  assert.equal(
    sourcePageUrl(schedule + "#page=1&zoom=125", 298),
    ods + "#page=298&zoom=125",
  );
  assert.equal(sourceDownloads(schedule), false);
});
test("unverified chapter and differing 2023 schedule cannot inherit another PDF's pages", () => {
  for (const url of [
    "https://digitallibrary.un.org/record/4090394/files/A_80_5_Vol-III-ch-IV.pdf?version=1",
    "https://digitallibrary.un.org/record/4060617/files/%28DMSPC_OPPFB%29_FINANCIAL_STATEMENTS_FOR_THE_YEAR_ENDED_31_DECEMBER_2023-EN.pdf",
  ]) {
    assert.equal(sourcePageUrl(url, 2), url + "#page=2");
    assert.equal(sourceDownloads(url), true);
  }
  assert.equal(
    sourceDownloads("https://digitallibrary.un.org/record/4090394"),
    false,
  );
});
test("source deduplication merges verified copies but retains distinct row locators", () => {
  const first = {
    url: schedule,
    pdfPage: 298,
    rowLabel: "Total expenses",
    columnHeader: "2024",
  };
  const same = { ...first, url: ods };
  const different = { ...same, rowLabel: "Total revenue" };
  assert.deepEqual(uniqueSourceReferences([first, same, different]), [
    first,
    different,
  ]);
});
