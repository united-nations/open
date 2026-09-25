import fs from "node:fs";
fs.mkdirSync("audits/browser", { recursive: true });
const settings = {
  portalUrl: process.env.PORTAL_URL || "http://127.0.0.1:8766",
  browserOptions: {
    headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {}),
  },
};

export const { portalUrl, browserOptions } = settings;
