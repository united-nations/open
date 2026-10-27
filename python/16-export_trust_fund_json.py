"""Export trust-fund entity and contributor JSON for the frontend."""

from pathlib import Path

from secretariat_xb_contributors import export_contributors
from trust_fund_frontend_exports import export_all


if __name__ == "__main__":
    xb_stage2 = Path("data/trust-fund-source-candidates/stage2")
    export_all(xb_stage2=xb_stage2)
    export_contributors(xb_stage2, Path("public/data"))
