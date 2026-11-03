import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const { unDocumentLinks } = await moduleAt("src/lib/unDocumentLinks.ts");

test("links explicit symbols and resolution references without changing prose", () => {
  const cases = [
    ["See A/80/6/Add.1.", "A/80/6/Add.1"],
    ["Under A/res/80/251,", "A/RES/80/251"],
    ["See (ST/SGB/2013/4).", "ST/SGB/2013/4"],
    ["General Assembly resolution 3243 (XXIX)", "A/RES/3243(XXIX)"],
    ["General Assembly Resolution 40/131", "A/RES/40/131"],
    ["Security Council resolution 1966 (2010)", "S/RES/1966(2010)"],
    ["S/RES/1966(2010)", "S/RES/1966(2010)"],
  ];
  for (const [text, symbol] of cases) {
    const parts = unDocumentLinks(text);
    assert.equal(parts.map((part) => part.text).join(""), text);
    assert.deepEqual(
      parts.filter((part) => part.href).map((part) => part.href),
      [`https://docs.un.org/${symbol}`],
    );
  }
});

test("leaves ambiguous references alone and handles several links", () => {
  for (const text of [
    "resolution 3243 (XXIX)",
    "40/131",
    "Schedule 2.1",
    "(a) First; (b) second.",
  ]) {
    assert.deepEqual(unDocumentLinks(text), [{ text }]);
  }
  const text = "A/80/6/Add.1 and General Assembly resolution 40/131.";
  const parts = unDocumentLinks(text);
  assert.equal(parts.filter((part) => part.href).length, 2);
  assert.equal(parts.map((part) => part.text).join(""), text);
});
