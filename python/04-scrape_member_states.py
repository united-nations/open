"""Scrape UN member states and observer states for CEB donor classification.

Regular-budget assessments and payment status are a separate Secretariat
dataset. They are exported by ``13-export_regular_budget_contributors.py`` and
must not be attached to CEB revenue years.
"""
import pandas as pd
import requests
from bs4 import BeautifulSoup
from pathlib import Path

UA = {"User-Agent": "Mozilla/5.0"}
OUTPUT = Path("data/ceb/member_states.csv")

def scrape_members() -> list[str]:
    resp = requests.get("https://www.un.org/en/about-us/member-states", headers=UA)
    soup = BeautifulSoup(resp.text, "html.parser")
    return [h2.get_text().strip().replace("\u2019", "'") for h2 in soup.find_all("h2")
            if h2.get_text().strip() and "MEMBER STATES" not in h2.get_text().upper()
            and "Search" not in h2.get_text()]

def scrape_observers() -> list[str]:
    resp = requests.get("https://www.un.org/en/about-us/non-member-states", headers=UA)
    soup = BeautifulSoup(resp.text, "html.parser")
    return [h3.get_text().strip().replace("\u2019", "'") for h3 in soup.find_all("h3")
            if h3.get_text().strip() and "MEMBER" not in h3.get_text().upper()
            and "Quick links" not in h3.get_text()]

# Name normalization for matching
NAME_MAP = {
    "Bahamas (The)": "Bahamas", "Gambia (Republic of The)": "Gambia",
    "Guinea Bissau": "Guinea-Bissau", "Netherlands (Kingdom of the)": "Netherlands",
    "China (the People's Republic of)": "China",
    "Cote d'Ivoire": "Côte D'Ivoire", "United Kingdom": "United Kingdom of Great Britain and Northern Ireland",
    "United States": "United States of America", "Naoero": "Nauru",
}

def normalize(name: str) -> str:
    return NAME_MAP.get(name, name)

if __name__ == "__main__":
    print("Scraping UN member states...")
    members = [normalize(m) for m in scrape_members()]
    observers = [normalize(o) for o in scrape_observers()]

    rows = []
    for m in members:
        rows.append({"country": m, "status": "member"})
    for o in observers:
        rows.append({"country": o, "status": "observer"})

    df = pd.DataFrame(rows)
    df.to_csv(OUTPUT, index=False)

    print(f"Wrote {OUTPUT}: {len(members)} members, {len(observers)} observers")
