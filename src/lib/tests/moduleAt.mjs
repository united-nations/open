import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const cache = new Map();
function moduleUrl(filename) {
  const absolute = path.resolve(filename);
  if (cache.has(absolute)) return cache.get(absolute);
  let source = absolute.endsWith(".json") ? "export default " + fs.readFileSync(absolute, "utf8")
    : ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: {
        module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
      } }).outputText;
  source = source.replace(/from ["']([^"']+)["']/g, (_match, specifier) => {
    let dependency = specifier.startsWith("@/") ? path.resolve("src", specifier.slice(2))
      : specifier.startsWith(".") ? path.resolve(path.dirname(absolute), specifier)
      : require.resolve(specifier);
    if (!fs.existsSync(dependency)) dependency += ".ts";
    return "from " + JSON.stringify(moduleUrl(dependency));
  });
  const url = "data:text/javascript;base64," + Buffer.from(source).toString("base64");
  cache.set(absolute, url);
  return url;
}
export const moduleAt = filename => import(moduleUrl(filename));
