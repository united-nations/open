"""Validate and publish Secretariat entity groups and mission locations."""

import json
from pathlib import Path

from secretariat_entities import load_secretariat_entities


OUT = Path("public/data/secretariat-entities.json")


def export() -> None:
    data = load_secretariat_entities()
    OUT.write_text(json.dumps(data, indent=2) + "\n")
    print(
        f"Exported {len(data['entities'])} entity classifications, "
        f"{len(data['locations'])} mission locations and "
        f"{len(data['excluded_from_map'])} map exclusions"
    )


if __name__ == "__main__":
    export()
