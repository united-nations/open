# Feature flag: fuse UN Secretariat sub-entity data into CEB expenses (steps 06 & 99).
# Set to False to temporarily produce CEB-only expenses (keeps the UN/UN-DPO
# aggregates, drops the ~150 Secretariat sub-entities). Re-run python/06, 07, 99.
FUSE_SECRETARIAT = False

ENTITY_MAPPING = {
    "UN-HABITAT": "UN-Habitat", "UNHABITAT": "UN-Habitat",
    "UNWOMEN": "UN Women", "UN-Women": "UN Women", "UNWTO": "UN Tourism",
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

# Donor name normalization - map variants to canonical names
DONOR_MAPPING = {
    # Country accent/case/format variations
    "Côte d'Ivoire": "Côte D'Ivoire",
    "Cote D'Ivoire": "Côte D'Ivoire",
    "Cote d'Ivoire": "Côte D'Ivoire",
    "Venezuela (Bolivarian Republic of)": "Venezuela, Bolivarian Republic of",
    "Bolivia (Plurinational State of)": "Bolivia, Plurinational State of",
    "Iran (Islamic Republic of)": "Iran, Islamic Republic of",
    "Micronesia (Federated States of)": "Micronesia, Federated States of",
    "Moldova (Republic of)": "Moldova, Republic of",
    "Tanzania (United Republic of)": "Tanzania, United Republic of",
    "Kosovo**": "Kosovo",
    "Taiwan (Province of China)***": "Taiwan, Province of China",
    "Taiwan (Chinese Taipei)": "Taiwan, Province of China",
    "Turkiye": "Türkiye",
    "Turkey": "Türkiye",
    "China, Hong Kong Special Administrative Region": "Hong Kong SAR",
    "China, Macao Special Administrative Region": "Macao SAR",
    # Non-gov donor consolidation
    "GAVI The Vaccine Alliance": "GAVI Alliance",
    "GAVI, The Vaccine Alliance": "GAVI Alliance",
    "Gavi Alliance": "GAVI Alliance",
    "The Global Fund": "The Global Fund to Fight AIDS, Tuberculosis and Malaria",
    "The Global Fund to Fight AIDS Tuberculosis and Malaria - The Global  Fund": "The Global Fund to Fight AIDS, Tuberculosis and Malaria",
    "The Global Fund to Fight AIDS, Tuberculosis and Malaria - The Global  Fund": "The Global Fund to Fight AIDS, Tuberculosis and Malaria",
    "Global Fund to Fight": "The Global Fund to Fight AIDS, Tuberculosis and Malaria",
    "Global Fund": "The Global Fund to Fight AIDS, Tuberculosis and Malaria",
    "The Green Climate Fund": "Green Climate Fund",
    "The World Bank Group": "World Bank",
    "World Bank Group": "World Bank",
    "Multi Donor trust funds": "Multi Donor Trust Funds",
    "Private Donors": "Other Private",
    "Private donor": "Other Private",
    "Private Sector": "Other Private",
    "United Nations Development Programme": "UNDP (as donor)",
    "United Nations Secretariat Office for the Coordination of Humanitarian Affairs": "UN OCHA",
}

# Generic bucket donors - mark as is_other=True (aggregated, not specific donors)
GENERIC_DONORS = {
    "Other Private",  # Consolidated from Private Donors/donor/Sector
    "Multi Donor Trust Funds",
    "Multi Partner Trust Fund Office",
    "UNDP Administered Trust Funds",
}

# Category overrides for known misclassifications (donor -> C-code)
DONOR_CATEGORY_OVERRIDES = {
    "Bill & Melinda Gates Foundation": "C05",  # Foundations
    "European Union": "C08A",  # EU
    "GAVI Alliance": "C04B",  # Multilateral - Global Funds
    "Global Fund": "C04B",  # Multilateral - Global Funds
    "Green Climate Fund": "C04B",  # Multilateral - Global Funds
    "Global Environment Facility": "C04B",  # Multilateral - Global Funds
    "Global Environment Facility (thru UNDP or UNEP)": "C04B",
    "Global Partnership for Education": "C04B",  # Multilateral - Global Funds
    "World Bank": "C04A",  # Multilateral - IFIs
    "Asian Development Bank": "C04A",  # Multilateral - IFIs
    "UN Foundation": "C05",  # Foundations
    "USA National Committee": "C02",  # NGOs (national committees)
    "United States Fund for UNICEF": "C02",  # NGOs
    "United States of America National commission": "C02",  # NGOs
    "The Joint United Nations Programme on HIV/AIDS": "C04C",  # UN Orgs
    "UNDP (as donor)": "C04C",  # UN Orgs
    "UN OCHA": "C04C",  # UN Orgs
    "United Nations": "C04C",  # UN Orgs
}

# Entries incorrectly classified as Government in CEB data
NON_GOVERNMENT_DONORS = {
    "JUNIOR PROFESSIONAL OFFICERS PROGRAMME",
    "Miscellaneous",
    "Refunds to donors/Miscellaneous", 
    "Planethood Foundation",
}

def clean_donor_name(name: str) -> str:
    """Clean and normalize donor name."""
    # Remove asterisks
    cleaned = name.replace("*", "").strip()
    # Apply mapping
    return DONOR_MAPPING.get(cleaned, cleaned)

def parse_amount(amount_str: str | float) -> float:
    if isinstance(amount_str, (int, float)): return float(amount_str)
    cleaned = str(amount_str).replace(",", "").replace(" ", "").strip()
    return 0.0 if cleaned in ("", "-", "N/A", "n/a") else float(cleaned)

def normalize_entity(entity: str) -> str:
    return ENTITY_MAPPING.get(entity, entity)
