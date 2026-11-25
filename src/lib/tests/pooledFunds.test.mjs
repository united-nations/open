import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const { sumPooledAmounts, pooledFundHref, parsePooledFundHash } =
  await moduleAt("src/lib/pooledFunds.ts");

test("pooled amounts preserve missing, zero and signed adjustments", () => {
  assert.equal(sumPooledAmounts([]), null);
  assert.equal(sumPooledAmounts([50, null]), null);
  assert.equal(sumPooledAmounts([50, -50]), 0);
  assert.equal(sumPooledAmounts([0]), 0);
});
test("pooled fund links preserve exact fund and selected year", () => {
  const href = pooledFundHref("PB000", 2023);
  const url = new URL(href, "https://example.org");
  assert.equal(url.pathname, "/system/pooled-funds/");
  assert.equal(url.searchParams.get("year"), "2023");
  assert.deepEqual(parsePooledFundHash(decodeURIComponent(url.hash.slice(6))), {
    id: "PB000",
    year: 2023,
  });
  assert.deepEqual(parsePooledFundHash("PB000"), { id: "PB000", year: null });
});
