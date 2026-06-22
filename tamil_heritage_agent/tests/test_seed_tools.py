import json
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "heritage_seed.json"


def test_seed_data_has_required_collections() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    assert data["monuments"]
    assert data["dynasties"]
    assert data["styles"]


def test_brihadeeswarar_seed_contains_core_metadata() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    names = {item["name_en"] for item in data["monuments"]}
    assert "Brihadeeswarar Temple" in names
