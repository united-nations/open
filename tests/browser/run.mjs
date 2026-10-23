import { spawn } from "node:child_process";
import fs from "node:fs";
import { portalUrl } from "./helpers.mjs";
const checks = [
  "header-layout",
  "data-disclosures",
  "ceb-refresh",
  "locations-grouping",
  "locations-bubbles",
  "system-functions",
  "function-geography",
  "routes-and-financials",
  "uninfo-funding",
  "peacekeeping-stages",
  "secretariat-flows",
  "sidebar-years",
  "hydration",
];
function runCheck(name) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [`tests/browser/${name}.mjs`], {
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${name} failed (${code})`)),
    );
  });
}
(async () => {
  let server;
  try {
    if (!process.env.PORTAL_URL) {
      if (!fs.existsSync("out/index.html"))
        throw new Error("Run pnpm build before browser checks");
      try {
        await fetch(portalUrl);
        throw new Error(
          "Port 8766 is occupied; set PORTAL_URL to use an existing server",
        );
      } catch (e) {
        if (e.message.includes("occupied")) throw e;
      }
      server = spawn(
        "uv",
        [
          "run",
          "python",
          "-m",
          "http.server",
          "8766",
          "--bind",
          "127.0.0.1",
          "--directory",
          "out",
        ],
        { stdio: ["ignore", "ignore", "ignore"] },
      );
      let failure;
      server.on("error", (e) => {
        failure = e;
      });
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (failure) throw failure;
        if (server.exitCode !== null)
          throw new Error("Static server exited before becoming ready");
        try {
          ready = (await fetch(portalUrl)).ok;
        } catch {}
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!ready) throw new Error("Static server did not become ready");
    }
    for (const check of checks) await runCheck(check);
  } finally {
    server?.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
