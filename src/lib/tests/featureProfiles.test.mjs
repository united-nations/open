import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import profiles from "../../../config/features.json" with { type: "json" };

test("full enables all flags; preview keeps UNINFO disabled", () => {
  const keys = Object.keys(profiles.public).sort();
  assert.equal(profiles.preview.uninfo, false);
  for (const variant of ["public", "preview", "full"]) {
    assert.deepEqual(Object.keys(profiles[variant]).sort(), keys);
    assert.ok(
      Object.values(profiles[variant]).every(
        (value) => typeof value === "boolean",
      ),
    );
  }
  assert.ok(Object.values(profiles.full).every((value) => value === true));
});

test("frontend resolves each build profile and its route visibility", () => {
  for (const variant of ["public", "preview", "full"]) {
    const actual = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `
      import { moduleAt } from './src/lib/tests/moduleAt.mjs';
      const { SITE_VARIANT, FEATURES } = await moduleAt('src/lib/featureFlags.ts');
      const { isRouteEnabled, visibleSecretariatNav, visibleSystemNav } = await moduleAt('src/lib/navigation.ts');
      console.log(JSON.stringify({ variant: SITE_VARIANT, flags: FEATURES,
        nav: visibleSecretariatNav(), systemNav: visibleSystemNav(),
        personnel: isRouteEnabled('/system/personnel/'),
        personnelChild: isRouteEnabled('/system/personnel/future-subpage/'),
        peaceOperations: isRouteEnabled('/secretariat/peacekeeping-budget/peace-operations/') }));
    `,
        ],
        {
          env: { ...process.env, NEXT_PUBLIC_SITE_VARIANT: variant },
          encoding: "utf8",
        },
      ),
    );
    assert.equal(actual.variant, variant);
    assert.deepEqual(actual.flags, profiles[variant]);
    assert.equal(actual.personnel, variant === "full");
    assert.equal(actual.personnelChild, variant === "full");
    assert.equal(
      actual.systemNav.some((item) => item.href === "/system/personnel"),
      variant === "full",
    );
    assert.equal(
      actual.peaceOperations,
      profiles[variant].peaceOperations && profiles[variant].peacekeepingBudget,
    );
    assert.equal(
      actual.nav.some((item) => item.label === "Peace Operations"),
      false,
    );
    const budget = actual.nav.find(
      (item) => item.label === "Peacekeeping Budget",
    );
    if (budget)
      assert.ok(
        budget.aliases.includes(
          "/secretariat/peacekeeping-budget/peace-operations",
        ),
      );
  }
});
