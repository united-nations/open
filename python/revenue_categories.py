"""Canonical CEB financing classification; unknown codes fail closed."""
# R-code to display category mapping
REV_CATEGORY = {
    "R01": "Assessed", "R02": "Voluntary un-earmarked", "R02A": "Voluntary un-earmarked", "R02B": "Voluntary un-earmarked",
    "R03": "Voluntary earmarked", "R04": "Other", "R03A": "Voluntary earmarked", "R03B": "Voluntary earmarked", "R03C": "Voluntary earmarked",
    "R03D": "Voluntary earmarked", "R03E": "Voluntary earmarked", "R03F": "Voluntary earmarked",
    "R04A": "Other", "R04B": "Other", "R04C": "Other",
}

# These historical donor-export codes have no recovered authoritative crosswalk.
# Preserve their observations separately; they must not enter four-type totals.
UNRESOLVED_FINANCING_CODES = {"R05", "R07", "R08", "R08B", "R09", "R10", "R11", "R12"}

def rev_category(code: str) -> str:
    return REV_CATEGORY[code]

