"""Capture the public legacy dashboard payloads without changing their values.

Run before changing open.un.org hosting:
  python3 scripts/preserve-legacy-data.py
For an already fetched HTML capture:
  python3 scripts/preserve-legacy-data.py --html-dir /tmp
The latter expects open-legacy-{revenue,expenses,secretariat}.html.
"""
import argparse
import csv
import hashlib
import io
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile, ZIP_DEFLATED

SOURCES = {
    "revenue": ("un-systems-financials/revenue", "un-system-revenues"),
    "expenses": ("un-systems-financials/expenses", "un-system-expenses"),
    "secretariat": ("un-secretariat-financials/expenses", "un-secretariat-expenses"),
}


class SettingsParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            self.active = dict(attrs).get("data-drupal-selector") == "drupal-settings-json"

    def handle_endtag(self, tag):
        if tag == "script":
            self.active = False

    def handle_data(self, data):
        if self.active:
            self.parts.append(data)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--html-dir", type=Path)
args = parser.parse_args()
out = Path(__file__).resolve().parents[1] / "public/downloads/legacy"
out.mkdir(parents=True, exist_ok=True)
manifest = {"capturedAt": datetime.now(timezone.utc).isoformat(), "datasets": []}
for name, (route, page) in SOURCES.items():
    url = f"https://open.un.org/{route}"
    html = ((args.html_dir / f"open-legacy-{name}.html").read_bytes()
            if args.html_dir else urlopen(url, timeout=60).read())
    settings = SettingsParser()
    settings.feed(html.decode("utf-8"))
    apps = json.loads("".join(settings.parts))["elm_apps"]
    data = next(app["data"] for app in apps.values() if app.get("page") == page)
    observations = data["revenues" if name == "revenue" else "expenses"]
    if not observations:
        raise ValueError(f"No observations: {url}")
    years = sorted({row["year"] for row in observations})
    filename = f"{page}.zip"
    payload = (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode()
    with ZipFile(out / filename, "w", ZIP_DEFLATED) as archive:
        archive.writestr("data.json", payload)
        for key, rows in data.items():
            if not isinstance(rows, list) or not rows:
                continue
            fields = list(dict.fromkeys(field for row in rows for field in row))
            stream = io.StringIO(newline="")
            writer = csv.DictWriter(stream, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
            archive.writestr(f"{key}.csv", stream.getvalue())
        archive.writestr("README.txt", (
            f"Legacy UN Transparency Portal: {page}\nSource: {url}\n"
            f"Captured: {manifest['capturedAt']}\nYears: {years[0]}–{years[-1]}\n"
            "data.json preserves the complete dashboard data payload, including lookup tables, "
            "source codes and null values. CSV files provide the same tabular records for convenience; "
            "nulls appear as empty CSV fields. No figures have been reconciled or updated. "
            "These are data snapshots, not a preservation of the website or its interactive behaviour.\n"
        ))
    manifest["datasets"].append({
        "file": filename, "source": url, "version": data["version"],
        "years": years, "observations": len(observations),
        "sourceHtmlSha256": hashlib.sha256(html).hexdigest(),
        "payloadSha256": hashlib.sha256(payload).hexdigest(),
        "sha256": hashlib.sha256((out / filename).read_bytes()).hexdigest(),
    })
(out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
