"""Export UNINFO Cooperation Framework data to JSON for frontend."""
import json
from pathlib import Path
from collections import defaultdict
import country_converter as coco

RAW = Path("data/uninfo/raw")
OUT = Path("public/data")
COUNTRIES_DIR = OUT / "uninfo-countries"
cc = coco.CountryConverter()

def get_iso3(country: str) -> str | None:
    result = cc.convert(country, to="ISO3", not_found=None)
    return result[0] if isinstance(result, list) else result

def extract_metrics(item: dict) -> dict:
    metrics = {m["metricName"]: m["total"] for m in item.get("metrics", [])}
    return {
        "required": round(metrics.get("Total Required Resources", 0), 2),
        "available": round(metrics.get("Total Available Resources", 0), 2),
        "spent": round(metrics.get("Total Expenditure", 0), 2),
    }

def load_raw():
    frameworks_path = RAW / "frameworks_by_country.json"
    return {
        "workspaces": json.loads((RAW / "workspaces.json").read_text()),
        "global_sdgs": json.loads((RAW / "global_sdgs.json").read_text()),
        "countries_sdgs": json.loads((RAW / "countries_sdgs.json").read_text()),
        "projects": json.loads((RAW / "projects_by_country.json").read_text()),
        "frameworks": json.loads(frameworks_path.read_text()) if frameworks_path.exists() else {},
    }

def build_projects_by_country(data: dict) -> dict[str, list]:
    """Build projects list grouped by ISO3 code."""
    by_country = defaultdict(list)
    for country, agencies in data["projects"].items():
        iso3 = get_iso3(country)
        if not iso3 or not isinstance(agencies, list): continue
        for agency_index, agency in enumerate(agencies):
            abbr = agency.get("abbreviation", "")
            for project_index, proj in enumerate(agency.get("planEntities", [])):
                m = extract_metrics(proj)
                sdg = proj["sdgs"][0].get("id") if proj.get("sdgs") else None
                by_country[iso3].append({
                    "id": proj.get("id"),
                    "row_key": f"{proj.get('id')}:{agency.get('id', abbr)}:{agency_index}:{project_index}",
                    "agency": abbr,
                    "sdg": sdg,
                    "code": proj.get("code", ""),
                    "name": proj.get("name", "")[:200],
                    "description": (proj.get("description") or "")[:500] or None,
                    "start": proj.get("startDate"),
                    "end": proj.get("endDate"),
                    "outcome": (proj.get("parentName") or "")[:200] or None,
                    **m,
                })
    # Sort each country's projects by required descending
    for iso3 in by_country:
        by_country[iso3].sort(key=lambda x: -x["required"])
    return dict(by_country)

def build_framework_tree(fw: dict) -> list[dict] | None:
    """Build nested framework tree from SP/OC/OU data."""
    if not fw or not any(fw.values()):
        return None
    
    sps, ocs, ous = fw.get("sp", []), fw.get("oc", []), fw.get("ou", [])
    if not sps:
        return None
    
    # Dedupe by keeping latest endDate per code
    def dedupe(items: list) -> list:
        by_code = {}
        for item in items:
            code = item.get("code", "")
            end = item.get("endDate") or ""
            existing_end = by_code.get(code, {}).get("endDate") or ""
            if code not in by_code or end > existing_end:
                by_code[code] = item
        return list(by_code.values())
    
    sps, ocs, ous = dedupe(sps), dedupe(ocs), dedupe(ous)
    
    # Build lookup by id
    oc_by_id = {oc["id"]: oc for oc in ocs}
    ou_by_id = {ou["id"]: ou for ou in ous}
    
    # Build OC -> OU mapping
    ous_by_parent = defaultdict(list)
    for ou in ous:
        if ou.get("parentId"):
            ous_by_parent[ou["parentId"]].append(ou)
    
    # Build SP -> OC mapping  
    ocs_by_parent = defaultdict(list)
    for oc in ocs:
        if oc.get("parentId"):
            ocs_by_parent[oc["parentId"]].append(oc)
    
    def fmt_item(item: dict, children: list = None) -> dict:
        m = extract_metrics(item)
        result = {
            "id": item["id"],
            "code": item.get("code", ""),
            "name": item.get("name", "")[:200],
            **m,
        }
        if item.get("description"):
            result["description"] = item["description"][:300]
        if children:
            result["children"] = children
        return result
    
    # Build tree: SP -> OC -> OU
    tree = []
    for sp in sorted(sps, key=lambda x: x.get("code", "")):
        sp_ocs = ocs_by_parent.get(sp["id"], [])
        oc_items = []
        for oc in sorted(sp_ocs, key=lambda x: x.get("code", "")):
            oc_ous = ous_by_parent.get(oc["id"], [])
            ou_items = [fmt_item(ou) for ou in sorted(oc_ous, key=lambda x: x.get("code", ""))]
            oc_items.append(fmt_item(oc, ou_items if ou_items else None))
        tree.append(fmt_item(sp, oc_items if oc_items else None))
    
    return tree if tree else None

def export_per_country(data: dict) -> dict:
    """Export per-country files with SDG breakdown, projects, and framework."""
    COUNTRIES_DIR.mkdir(exist_ok=True)
    
    # Build projects lookup
    projects_by_country = build_projects_by_country(data)
    
    # Build framework lookup by country name
    frameworks_by_country = {}
    for country, fw in data.get("frameworks", {}).items():
        iso3 = get_iso3(country)
        if iso3:
            frameworks_by_country[iso3] = build_framework_tree(fw)
    
    # Build country data with SDGs, projects, and framework
    countries_index = {}
    workspace_countries = defaultdict(list)
    for name, workspace in data["workspaces"].items():
        workspace_countries[workspace].append(name)
    provenance_path = RAW / "period-provenance.json"
    provenance = json.loads(provenance_path.read_text()) if provenance_path.exists() else {}
    total_projects = 0
    framework_count = 0
    
    for country, info in data["countries_sdgs"].items():
        iso3 = get_iso3(country)
        if not iso3: continue
        
        ws_id = info["workspace_id"]
        sdgs = {}
        totals = {"required": 0, "available": 0, "spent": 0}
        
        for sdg in info.get("sdgs", []):
            if not sdg.get("id"): continue
            m = extract_metrics(sdg)
            sdgs[str(sdg["id"])] = m
            for k in totals: totals[k] += m[k]
        
        projects = projects_by_country.get(iso3, [])
        framework = frameworks_by_country.get(iso3)
        
        # Skip countries with no data
        if totals["required"] <= 0 and not projects:
            continue
        
        scope = {
            "year": 2024 if info.get("has_year_data") else None,
            "period_status": "year_filtered" if info.get("has_year_data") else "unverified",
            "geographic_scope": "workspace" if len(workspace_countries[ws_id]) > 1 else "country",
            "workspace_countries": sorted(workspace_countries[ws_id]),
            "projects_year": provenance.get("projects_year"),
            "framework_year": provenance.get("framework_year"),
        }
        country_data = {
            **scope,
            "workspace_id": ws_id,
            "name": country,
            "totals": {k: round(v, 2) for k, v in totals.items()},
            "sdgs": sdgs,
            "projects": projects,
        }
        if framework:
            country_data["framework"] = framework
            framework_count += 1
        
        # Write per-country file
        (COUNTRIES_DIR / f"{iso3}.json").write_text(json.dumps(country_data))
        
        # Store in index (without projects/framework for smaller index file)
        countries_index[iso3] = {
            **scope,
            "workspace_id": ws_id,
            "name": country,
            "totals": country_data["totals"],
            "project_count": len({p["id"] for p in projects}),
            "has_framework": framework is not None,
        }
        total_projects += len(projects)
    
    # Write index file (for quick lookups without loading full data)
    (OUT / "uninfo-countries-index.json").write_text(json.dumps(countries_index, indent=2))
    
    print(f"uninfo-countries/: {len(countries_index)} country files")
    print(f"uninfo-countries-index.json: index with {len(countries_index)} countries")
    print(f"Total projects: {total_projects:,}")
    print(f"Countries with framework: {framework_count}")
    return countries_index

def export_sdgs(data: dict, countries_index: dict) -> dict:
    """Export per-SDG data with country breakdown."""
    # Need to load SDG data from country files
    result = {}
    for sdg in data["global_sdgs"]:
        if not sdg.get("id"): continue
        sdg_id = str(sdg["id"])
        m = extract_metrics(sdg)
        
        # Build country breakdown by reading from country files
        country_breakdown = {}
        for iso3 in countries_index:
            country_file = COUNTRIES_DIR / f"{iso3}.json"
            if country_file.exists():
                cdata = json.loads(country_file.read_text())
                if cdata.get("year") == 2024 and cdata.get("geographic_scope") == "country" and sdg_id in cdata.get("sdgs", {}):
                    country_breakdown[iso3] = cdata["sdgs"][sdg_id]
        
        # Top underfunded = highest gap (required - available)
        gaps = [(iso3, c["required"] - c["available"]) for iso3, c in country_breakdown.items()]
        top_underfunded = [iso3 for iso3, _ in sorted(gaps, key=lambda x: -x[1])[:10]]
        
        provenance_path = RAW / "period-provenance.json"
        provenance = json.loads(provenance_path.read_text()) if provenance_path.exists() else {}
        result[sdg_id] = {
            "year": provenance.get("global_sdgs_year"),
            "name": sdg.get("short", sdg.get("name", "")),
            "totals": m,
            "countries": country_breakdown,
            "top_underfunded": top_underfunded,
        }
    
    (OUT / "uninfo-sdgs.json").write_text(json.dumps(result, indent=2))
    print(f"uninfo-sdgs.json: {len(result)} SDGs")
    return result

def update_manifest():
    """Update manifest with UNINFO data availability."""
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["uninfoCountries"] = {"years": [2024], "default": 2024, "min": 2024, "max": 2024}
    manifest["uninfoSdgs"] = {"years": [2024], "default": 2024, "min": 2024, "max": 2024}
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print("manifest.json: updated")

def cleanup_old_files():
    """Remove deprecated files."""
    old_files = [OUT / "uninfo-countries.json", OUT / "uninfo-projects.json"]
    for f in old_files:
        if f.exists():
            f.unlink()
            print(f"Removed deprecated: {f.name}")

if __name__ == "__main__":
    print("Loading raw UNINFO data...")
    data = load_raw()
    
    print("\nExporting per-country data...")
    countries_index = export_per_country(data)
    
    print("\nExporting SDGs...")
    export_sdgs(data, countries_index)
    
    print("\nUpdating manifest...")
    update_manifest()
    
    print("\nCleaning up old files...")
    cleanup_old_files()
    
    print("\nDone.")
