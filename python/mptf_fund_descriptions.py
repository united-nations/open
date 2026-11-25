"""Retain complete fund introductions from public MPTF profiles."""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path
import re
import urllib.error
import urllib.request

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/mptf"


def extract_profile_metadata(html: bytes) -> dict[str, str]:
    """Keep the exact source fields needed for reproducible introductions."""
    soup = BeautifulSoup(html, "html.parser")
    heading = soup.select_one("h1")
    tag = soup.select_one('meta[name="description"]')
    return {
        "heading": heading.get_text(" ", strip=True) if heading else "",
        "description": str(tag.get("content", "")) if tag else "",
    }


def metadata_hash(metadata: dict[str, str]) -> str:
    raw = json.dumps(metadata, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def description_from_metadata(metadata: dict[str, str]) -> str | None:
    title = metadata["heading"].casefold()
    if not title or any(term in title for term in ["not found", "access denied", "multi-partner trust fund office | gateway"]):
        return None
    # Profile-specific metadata, rather than navigation, project results or
    # unrelated document text. Missing intros remain unavailable.
    text = " ".join(BeautifulSoup(metadata["description"], "html.parser").get_text(" ", strip=True).split())
    # Donation prompts are separate calls to action, not part of the description.
    text = re.sub(r"\s*Click to donate\b.*$", "", text, flags=re.I).strip()
    text = re.sub(r"(?<=[a-z])\.(?=[A-Z])", ". ", text)
    if len(text) < 35 or text.casefold() in {"multi-partner trust fund office", "mptf office gateway"}:
        return None
    return text


def extract_description(html: bytes) -> str | None:
    return description_from_metadata(extract_profile_metadata(html))


def fetch_profile(item):
    code, url = item
    request = urllib.request.Request(url, headers={"User-Agent": "UN-Transparency-Portal/1.0"})
    try:
        response = urllib.request.urlopen(request, timeout=35)
        raw = response.read()
        # Reject redirects to the directory/home page; they are not fund profiles.
        if response.geturl().rstrip("/").lower() != url.rstrip("/").lower():
            return code, {"url": url, "status": "redirected"}
        if not extract_description(raw):
            return code, {"url": url, "status": "no_introduction"}
        path = DATA / "fund-pages" / f"{code}.html.gz"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(gzip.compress(raw, mtime=0))
        metadata = extract_profile_metadata(raw)
        return code, {"url": url, "status": "retrieved", "retrievedAt": datetime.now(timezone.utc).isoformat(), "sha256": hashlib.sha256(raw).hexdigest(), "metadataSha256": metadata_hash(metadata), "metadata": metadata}
    except (urllib.error.URLError, TimeoutError) as error:
        return code, {"url": url, "status": "unavailable", "reason": str(error)}


def export_descriptions():
    manifest_path = DATA / "fund-description-sources.json"
    manifest = json.loads(manifest_path.read_text())
    metadata_path = DATA / "fund-profile-metadata.json"
    profiles = json.loads(metadata_path.read_text()) if metadata_path.exists() else {}
    output = {}
    for code, source in manifest.items():
        if source["status"] != "retrieved":
            continue
        if code not in profiles:
            # Migrate retained HTML once. Full webpages remain an optional local
            # cache; subsequent clean-checkout replays use the compact snapshot.
            raw = gzip.decompress((DATA / "fund-pages" / f"{code}.html.gz").read_bytes())
            if hashlib.sha256(raw).hexdigest() != source["sha256"]:
                raise ValueError(f"Fund profile source changed: {code}")
            profiles[code] = extract_profile_metadata(raw)
            source["metadataSha256"] = metadata_hash(profiles[code])
        if metadata_hash(profiles[code]) != source.get("metadataSha256"):
            raise ValueError(f"Fund profile metadata changed: {code}")
        text = description_from_metadata(profiles[code])
        if text:
            output[code] = {"description": text, "url": source["url"], "retrievedAt": source["retrievedAt"]}
    metadata_path.write_text(json.dumps(profiles, ensure_ascii=False, indent=2) + "\n")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (DATA / "fund-descriptions.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(f"Retained descriptions for {len(output)} of {len(manifest)} fund profiles")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch", action="store_true")
    parser.add_argument("--funds", nargs="+")
    args = parser.parse_args()
    path = DATA / "fund-description-sources.json"
    if args.fetch:
        funds = json.loads((ROOT / "public/data/pooled-funds.json").read_text())["funds"]
        selected = [(code, fund["url"]) for code, fund in funds.items() if fund.get("url") and (not args.funds or code in args.funds)]
        sources = json.loads(path.read_text()) if path.exists() else {}
        metadata_path = DATA / "fund-profile-metadata.json"
        profiles = json.loads(metadata_path.read_text()) if metadata_path.exists() else {}
        with ThreadPoolExecutor(max_workers=6) as pool:
            for code, result in pool.map(fetch_profile, selected):
                # A transient refresh failure must not erase retained descriptions.
                if result["status"] == "retrieved" or code not in sources:
                    metadata = result.pop("metadata", None)
                    if metadata is not None:
                        profiles[code] = metadata
                    sources[code] = result
        metadata_path.write_text(json.dumps(profiles, ensure_ascii=False, indent=2) + "\n")
        path.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + "\n")
    export_descriptions()


if __name__ == "__main__":
    main()
