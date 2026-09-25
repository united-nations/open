"""Canonical CEB financing classification; unknown codes fail closed."""
# R-code to display category mapping
REV_CATEGORY = {
    "R01": "Assessed", "R02": "Voluntary un-earmarked", "R02A": "Voluntary un-earmarked", "R02B": "Voluntary un-earmarked",
    "R03": "Voluntary earmarked", "R04": "Other", "R03A": "Voluntary earmarked", "R03B": "Voluntary earmarked", "R03C": "Voluntary earmarked",
    "R03D": "Voluntary earmarked", "R03E": "Voluntary earmarked", "R03F": "Voluntary earmarked",
    "R04A": "Other", "R04B": "Other", "R04C": "Other", "R05": "Other",
    "R07": "Voluntary earmarked", "R08": "Voluntary un-earmarked", "R08B": "Voluntary un-earmarked",
    "R09": "Voluntary earmarked", "R10": "Voluntary earmarked", "R11": "Voluntary earmarked", "R12": "Voluntary earmarked",
}

def rev_category(code: str) -> str:
    return REV_CATEGORY[code]

