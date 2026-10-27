"""Run the maintained fund-position scope checks from the repository root."""
from pathlib import Path
import runpy

if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).resolve().parents[3]/'python/tests/test_secretariat_xb_fund_positions.py'),run_name='__main__')
