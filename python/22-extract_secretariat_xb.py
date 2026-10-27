"""Extract separately reported XB facts without changing portal scope or totals."""
import json

from secretariat_xb_sources import extract
from secretariat_xb_fund_positions import extract as extract_fund_positions, extract_itc_reserves

if __name__ == '__main__':
    report = extract()
    _, fund_quality = extract_fund_positions()
    extract_itc_reserves()
    print(f"Passed {len(fund_quality['checks'])} fund-position checks")
    print(json.dumps({
        key: value for key, value in report.items() if key not in ['checks', 'warnings']
    }, indent=2))
    print(f"Passed {len(report['checks'])} checks; see quality-profile.json for source gaps.")
