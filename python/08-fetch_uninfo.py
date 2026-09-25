"""Fetch and cache UNINFO Cooperation Framework data."""
import json
from pathlib import Path
import requests
from joblib.memory import Memory
from tqdm import tqdm

memory = Memory(location=".cache", verbose=0)
BASE = "https://api.uninfo.org/v1.0"
OUT = Path("data/uninfo/raw")
OUT.mkdir(parents=True, exist_ok=True)

@memory.cache
def get(url: str, params: dict = None) -> dict:
    res = requests.get(url, params=params, timeout=60)
    res.raise_for_status()
    return res.json() if res.text else {}

def fetch_workspaces() -> dict[str, int]:
    """Fetch all workspaces and return country name -> workspace_id mapping."""
    data = requests.post(f"{BASE}/workspace/search", json={"limit": 300}, timeout=30).json()
    mapping = {}
    for ws in data.get("results", []):
        for country in ws.get("countries", []):
            mapping[country["name"]] = ws["id"]
    return mapping

def fetch_finance_by_sdg(workspace_id: int = None, year: int = 2024) -> tuple[list[dict], bool]:
    """Fetch finance overview grouped by SDG. Returns (data, has_year_data)."""
    params = {"grouping": "sdg"}
    if workspace_id:
        params["workspaceIds"] = workspace_id
    # Try with year first
    data = get(f"{BASE}/planEntity/finance/overview", {**params, "financeYears": year})
    if data:
        return data, True
    return [], False

def fetch_projects_for_workspace(workspace_id: int, year: int = 2024) -> list[dict]:
    """Fetch projects for a workspace with agency info."""
    # Try with year first
    res = requests.get(f"{BASE}/planEntity/finance/overview", 
                       params=[("workspaceIds", workspace_id), ("financeYears", year), 
                               ("grouping", "agency"), ("grouping", "planEntity:SOU")],
                       timeout=60)
    res.raise_for_status()
    data = res.json() if res.text and res.text != '[]' else []
    if data:
        return data
    return []

def fetch_framework_level(workspace_id: int, level: str, year: int = 2024) -> list[dict]:
    """Fetch SP/OC/OU for a workspace. Level is 'SP', 'OC', or 'OU'."""
    params = {"workspaceIds": workspace_id, "grouping": f"planEntity:{level}", "financeYears": year}
    data = get(f"{BASE}/planEntity/finance/overview", params)
    if data:
        return data
    return []

def fetch_framework_for_workspace(workspace_id: int, year: int = 2024) -> dict:
    """Fetch full results framework (SP/OC/OU) for a workspace."""
    return {
        "sp": fetch_framework_level(workspace_id, "SP", year),
        "oc": fetch_framework_level(workspace_id, "OC", year),
        "ou": fetch_framework_level(workspace_id, "OU", year),
    }

def extract_metrics(item: dict) -> dict:
    """Extract required/available/spent from metrics list."""
    metrics = {m["metricName"]: m["total"] for m in item.get("metrics", [])}
    return {
        "required": metrics.get("Total Required Resources", 0),
        "available": metrics.get("Total Available Resources", 0),
        "spent": metrics.get("Total Expenditure", 0),
    }

if __name__ == "__main__":
    print("Fetching workspace mapping...")
    workspaces = fetch_workspaces()
    (OUT / "workspaces.json").write_text(json.dumps(workspaces, indent=2, ensure_ascii=False))
    print(f"  {len(workspaces)} countries")

    print("Fetching global SDG totals...")
    global_sdgs, _ = fetch_finance_by_sdg()
    (OUT / "global_sdgs.json").write_text(json.dumps(global_sdgs, indent=2))
    print(f"  {len(global_sdgs)} SDGs")

    print("Fetching per-country SDG data...")
    country_data = {}
    yearly_count, alltime_count = 0, 0
    for country, ws_id in tqdm(list(workspaces.items())):
        sdgs, has_year = fetch_finance_by_sdg(ws_id)
        country_data[country] = {"workspace_id": ws_id, "sdgs": sdgs, "has_year_data": has_year}
        if has_year: yearly_count += 1
        elif sdgs: alltime_count += 1
    (OUT / "countries_sdgs.json").write_text(json.dumps(country_data, indent=2, ensure_ascii=False))
    print(f"  {len(country_data)} countries ({yearly_count} with 2024 data, {alltime_count} with all-time data)")

    print("Fetching projects per country...")
    all_projects = {}
    for country, ws_id in tqdm(list(workspaces.items())):
        projects = fetch_projects_for_workspace(ws_id)
        if projects and isinstance(projects, list):
            all_projects[country] = projects
    (OUT / "projects_by_country.json").write_text(json.dumps(all_projects, indent=2, ensure_ascii=False))
    total = sum(sum(len(a.get("planEntities", [])) for a in agencies) for agencies in all_projects.values())
    print(f"  {total} projects across {len(all_projects)} countries")

    print("Fetching results framework per country...")
    all_frameworks = {}
    for country, ws_id in tqdm(list(workspaces.items())):
        fw = fetch_framework_for_workspace(ws_id)
        if any(fw.values()):
            all_frameworks[country] = fw
    (OUT / "frameworks_by_country.json").write_text(json.dumps(all_frameworks, indent=2, ensure_ascii=False))
    print(f"  {len(all_frameworks)} countries with framework data")

    (OUT / "period-provenance.json").write_text(json.dumps({"projects_year": 2024, "framework_year": 2024, "global_sdgs_year": 2024}))
    print("Done.")
