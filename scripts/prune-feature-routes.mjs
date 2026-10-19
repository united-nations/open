import fs from "node:fs";
import path from "node:path";
import config from "../config/features.json" with { type: "json" };

const variant = process.env.SITE_VARIANT ?? "public";
if (!["public", "preview"].includes(variant)) {
  throw new Error(`Invalid SITE_VARIANT: ${variant}`);
}
// Use the profile embedded in the build, even if this script is called separately.
const builtVariant = JSON.parse(
  fs.readFileSync(".next/required-server-files.json", "utf8"),
).config.env.NEXT_PUBLIC_SITE_VARIANT;
if (variant !== builtVariant)
  throw new Error(`Export was built as ${builtVariant}, not ${variant}`);
const out = path.resolve("out");
for (const [route, feature] of Object.entries(config.routes)) {
  if (typeof config[variant][feature] !== "boolean")
    throw new Error(`Unknown feature: ${feature}`);
  const directory = path.resolve(out, "." + route);
  if (!route.startsWith("/") || !directory.startsWith(out + path.sep)) {
    throw new Error(`Invalid feature route: ${route}`);
  }
  if (!config[variant][feature]) {
    fs.rmSync(directory, { recursive: true, force: true });
    console.log(`Excluded ${route} (${variant}).`);
  }
}
