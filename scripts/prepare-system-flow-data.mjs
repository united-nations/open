import { readFile, mkdir, writeFile, rename } from "node:fs/promises";

const root = new URL("../public/data/", import.meta.url);
const output = new URL("system-flow-spending/", root);
const { meta, data } = JSON.parse(
  await readFile(new URL("system-flow-spending.json", root), "utf8"),
);
await mkdir(output, { recursive: true });

async function writeJson(name, value) {
  const target = new URL(name, output);
  const temp = new URL(`.${name}.${process.pid}.tmp`, output);
  await writeFile(temp, JSON.stringify(value) + "\n");
  await rename(temp, target);
}

// Keep each year identical to the canonical export, including source metadata.
await Promise.all(data.map((row) => writeJson(`${row.year}.json`, row)));
await writeJson("index.json", meta);
