"""Regenerate supplementary contributor sources offline, then export their views."""
from pathlib import Path
import runpy
from secretariat_xb_contributors import export_contributors

if __name__ == '__main__':
    root=Path('data/trust-fund-source-candidates')
    for script in [root/'unodc-contributors/extract.py']:
        runpy.run_path(str(script))['extract']()
    payload=export_contributors(root/'stage2',Path('public/data'))
    print(f'Exported {len(payload["series"])} distinct entity/year/measure scopes')
