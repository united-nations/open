import json
from pathlib import Path

# Feature flag: fuse UN Secretariat sub-entity data into CEB expenses (steps 06 & 99).
# Set to False to temporarily produce CEB-only expenses (keeps the UN/UN-DPO
# aggregates, drops the ~150 Secretariat sub-entities). Re-run python/06, 07, 99.
FUSE_SECRETARIAT = False

# CEB Standard I, March 2024, printed pp.6–7, footnote 6: these units
# report through UN. Use only when that year's source has no standalone control.
CEB_SECRETARIAT_REPORTING_UNITS = {
    "DCO", "DESA", "DGACM", "DGC", "DMSPC", "DOS", "DPPA", "DSS",
    "ECA", "ECE", "ECLAC", "ESCAP", "ESCWA", "OCHA", "OCT", "OHCHR",
    "UNCTAD", "UNDRR", "UNISDR", "UNIDIR", "UNRISD", "Tech Bank",
}

ENTITY_MAPPING = {
    "UN": "UN Secretariat",
    "UN-DPO": "Peacekeeping Operations",
    "UN-HABITAT": "UN-Habitat", "UNHABITAT": "UN-Habitat",
    "UNWOMEN": "UN Women", "UN-Women": "UN Women", "UNWTO": "UN Tourism",
    "DPKO": "Peacekeeping Operations",  # Former CEB peacekeeping aggregate code.
    "OHRLLS": "UN-OHRLLS", "POE-CAR": "PoE-CAR", "POE-HAITI": "PoE-Haiti",
    "POE-LIBYA": "PoE-Libya", "POE-SUDAN": "PoE-Sudan", "POE-YEMEN": "PoE-Yemen",
    "POS-SSUDAN": "PoE-S.Sudan", "SRSG-CAAC": "OSRSG-CAAC", "SRSG-SVC": "OSRSG-SVC",
    "SRSG-VAC": "OSRSG-VAC", "OSESG-MYAN": "OSESG-Myanmar", "SESG-MYAN": "OSESG-Myanmar",
    "SESG-HAFRICA": "OSESG-Horn", "SESG-YEMEN": "OSESG-Yemen", "SC-RES1559": "OSESG-SCRES1559",
    "SASG-CYP": "OSASG-Cyprus", "PESG-WSAHARA": "PESG-WS", "OSESG-BDI": "OSESG-FG",
    "GEXP-DRC": "GoE-DRC", "UNGCO": "UNGC", "OVRA": "VRA", "ETHICS": "EO",
    "AOJ": "OAJ", "IM-MYANMAR": "IIMM", "OSET": "ODET", "RCS": "DCO", "UN-RGID": "UNRGID",
    "UNROD": "UNRoD",
}

# Reported generic donor bucket; distinct from calculated Other Private Sector.
PRIVATE_DONOR_LABEL = "Private Donors / Private Sector"

# UN/CEB terminology, shared by donor identities and geographic labels.
TAIWAN_NAME = "Taiwan Province of China"
TAIWAN_NAME_ALIASES = dict.fromkeys((
    "Taiwan", "Chinese Taipei", "Taiwan (Chinese Taipei)",
    "Taiwan (Province of China)", "Taiwan (Province of China)***",
    "Taiwan, Province of China", "China, Taiwan Province of China",
), TAIWAN_NAME)

# Explicit CEB contributor aliases; classification is preserved independently.
DONOR_MAPPING = {
    "Kosovo**": "Kosovo",
    **TAIWAN_NAME_ALIASES,
    "GAVI The Vaccine Alliance": "GAVI, The Vaccine Alliance",
    "GAVI, The Vaccine Alliance": "GAVI, The Vaccine Alliance",
    "Gavi Alliance": "GAVI, The Vaccine Alliance",
    "The Global Fund": "The Global Fund",
    "Global Fund to Fight": "The Global Fund",
    "The World Bank Group": "World Bank Group",
    "Multi Donor trust funds": "Multi Donor Trust Funds",
    "Private Donors": PRIVATE_DONOR_LABEL,
    "Private donor": PRIVATE_DONOR_LABEL,
    "Private Sector": PRIVATE_DONOR_LABEL,
    "UNDP": "United Nations Development Programme",
    "BLOOMBERG PHILANTHROPIES": "Bloomberg Philanthropies",
}

# These are source-reported aggregates, distinct from calculated balances.
GENERIC_DONORS = {
    "MISC", PRIVATE_DONOR_LABEL, "Multi Donor Trust Funds",
    "Multi Partner Trust Fund Office", "UNDP Administered Trust Funds",
    "Miscellaneous", "Refunds to donors/Miscellaneous",
}

# Used only to match UN membership metadata, never to relabel CEB contributors.
MEMBERSHIP_NAME_ALIASES = {
    "Côte d'Ivoire": "Côte D'Ivoire",
    "Venezuela (Bolivarian Republic of)": "Venezuela, Bolivarian Republic of",
    "Bolivia (Plurinational State of)": "Bolivia, Plurinational State of",
    "Iran (Islamic Republic of)": "Iran, Islamic Republic of",
    "Micronesia (Federated States of)": "Micronesia, Federated States of",
    "Moldova (Republic of)": "Moldova, Republic of",
    "Tanzania (United Republic of)": "Tanzania, United Republic of",
}

def clean_donor_name(name: str) -> str:
    """Clean and normalize donor name."""
    # Known source footnote markers are handled by explicit aliases above.
    # Preserve unfamiliar markers and meaningful parenthetical wording.
    cleaned = name.strip()
    # Apply mapping
    return DONOR_MAPPING.get(cleaned, cleaned)

def parse_amount(amount_str: str | float) -> float:
    if isinstance(amount_str, (int, float)): return float(amount_str)
    cleaned = str(amount_str).replace(",", "").replace(" ", "").strip()
    return 0.0 if cleaned in ("", "-", "N/A", "n/a") else float(cleaned)

def normalize_entity(entity: str) -> str:
    return ENTITY_MAPPING.get(entity, entity)

# TODO: integrate properly with systemchart

def include_ceb_aggregate_entities(entities: list[dict]) -> list[dict]:
    """Merge reference metadata into the entity export, keyed by canonical name."""
    by_name = {normalize_entity(row["entity"]): row.copy() for row in entities}
    reference_path = (
        Path(__file__).resolve().parents[1]
        / "data/references/ceb-aggregate-entities.json"
    )
    references = json.loads(reference_path.read_text(encoding="utf-8"))
    names = [normalize_entity(row["entity"]) for row in references]
    if len(names) != len(set(names)):
        raise ValueError(f"Duplicate CEB aggregate entities in {reference_path}")
    for reference, name in zip(references, names):
        row = by_name.setdefault(name, {})
        row.update(reference)
        row["entity"] = name
    return list(by_name.values())


# Observed encoding variants and the shared UN terminology aliases.
COUNTRY_NAME_OVERRIDES = {"Cura├ºao": "Curaçao", **TAIWAN_NAME_ALIASES}

def normalize_country_name(name: str) -> str:
    return COUNTRY_NAME_OVERRIDES.get(name, name)


# Reviewed geography names: REG = M49 macroregions; SUB = named subregions
# (including intermediate regions used by CEB). The pre-refresh CEB snapshot
# also reports the diagnosed names as SUB. Never infer a level from the parent
# column or fuzzy-match a country: South Africa and Türkiye remain countries.
GEOGRAPHIC_AREA_TYPES = {
    **dict.fromkeys(("Africa", "Americas", "Asia", "Europe", "Oceania"), "REG"),
    **dict.fromkeys((
        "Australia and New Zealand", "Caribbean", "Central America", "Central Asia",
        "Eastern Africa", "Eastern Asia", "Eastern Europe",
        "Latin America and the Caribbean", "Melanesia", "Micronesia", "Middle Africa",
        "Northern Africa", "Northern America", "Northern Europe", "Polynesia",
        "South America", "South-eastern Asia", "Southern Africa", "Southern Asia",
        "Southern Europe", "Sub-Saharan Africa", "Western Africa", "Western Asia",
        "Western Europe",
    ), "SUB"),
}
_GEOGRAPHIC_AREA_NAMES = {name.casefold(): name for name in GEOGRAPHIC_AREA_TYPES}


def canonical_geographic_area(name: str) -> str | None:
    """Conservative whitelist lookup; whitespace/case variants only."""
    return _GEOGRAPHIC_AREA_NAMES.get(" ".join(name.split()).casefold())
