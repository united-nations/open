import type { NextConfig } from "next";
import path from "node:path";
import { realpathSync } from "node:fs";
import { writeFile } from "node:fs/promises";

import featureProfiles from "./config/features.json";

// Resolve once at build time so server and browser use the same profile.
const siteVariant = process.env.SITE_VARIANT ?? "public";
if (siteVariant !== "public" && siteVariant !== "preview") {
  throw new Error(
    `Invalid SITE_VARIANT: ${siteVariant}. Expected public or preview.`,
  );
}
const featureKeys = Object.keys(featureProfiles.public);
for (const [name, flags] of Object.entries({
  public: featureProfiles.public,
  preview: featureProfiles.preview,
})) {
  if (
    Object.keys(flags).length !== featureKeys.length ||
    featureKeys.some(
      (key) => typeof (flags as Record<string, unknown>)[key] !== "boolean",
    )
  ) {
    throw new Error(
      `Invalid feature profile: ${name}. Both profiles must define the same boolean flags.`,
    );
  }
}

for (const [route, feature] of Object.entries(featureProfiles.routes)) {
  if (
    !route.startsWith("/") ||
    route.split("/").includes("..") ||
    !featureKeys.includes(feature)
  ) {
    throw new Error(`Invalid feature route: ${route} (${feature})`);
  }
}

// Local shared UI edits are resolved from the sibling checkout during iteration.
const projectRoot = path.resolve(__dirname);
const workspaceRoot = path.dirname(projectRoot);
const sharedUiRoot = realpathSync(
  path.join(projectRoot, "node_modules/@un-eosg/ui"),
);
const linkedSharedUi = !sharedUiRoot.startsWith(`${projectRoot}${path.sep}`);

// Set to your repository name for GitHub Pages, or '' for custom domain
const basePath =
  process.env.NODE_ENV === "production" ? process.env.BASE_PATH || "" : "";

// NOTE: use basePath variable for Image src
// https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath#images

const nextConfig: NextConfig = {
  compiler: {
    async runAfterProductionCompile({ distDir }) {
      // Keep pruning metadata independent of Next.js's internal manifests.
      await writeFile(
        path.join(distDir, "site-variant.json"),
        JSON.stringify({ siteVariant }),
      );
    },
  },
  transpilePackages: ["@un-eosg/ui"],
  turbopack: {
    root: linkedSharedUi ? workspaceRoot : projectRoot,
    resolveAlias: linkedSharedUi
      ? {
          react:
            "./" +
            path.relative(
              workspaceRoot,
              path.join(projectRoot, "node_modules/react"),
            ),
          "react-dom":
            "./" +
            path.relative(
              workspaceRoot,
              path.join(projectRoot, "node_modules/react-dom"),
            ),
        }
      : undefined,
  },
  output: "export",
  trailingSlash: true,
  basePath: basePath,
  assetPrefix: basePath,
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_VARIANT: siteVariant,
  },
};

export default nextConfig;
