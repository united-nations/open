"""Load legacy Secretariat expenses plus non-overlapping ARWO annual extracts."""
from pathlib import Path
import pandas as pd

BASELINE = Path('data/un-secretariat-expenses.csv')
ANNUAL_EXTRACTS = [Path(f'data/un-secretariat-expenses-{year}.csv') for year in (2024, 2025)]


def load_secretariat_expenses() -> pd.DataFrame:
    frames = [pd.read_csv(BASELINE)]
    years = set(frames[0].YEAR)
    for path in ANNUAL_EXTRACTS:
        assert path.is_file(), f"Missing annual ARWO extract: {path}"
        frame = pd.read_csv(path)
        assert list(frame.columns) == list(frames[0].columns), f'{path}: schema mismatch'
        expected_year = int(path.stem.rsplit('-', 1)[1])
        assert set(frame.YEAR) == {expected_year}, f'{path}: unexpected years'
        assert expected_year not in years, f'{path}: overlapping historical year'
        years.add(expected_year)
        frames.append(frame)
    return pd.concat(frames, ignore_index=True)
