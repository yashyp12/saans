"""Initialize School and Timetable entities in the planned single table.

The plan specifies the entity schema and three school names/cities, but it
does not specify canonical coordinates.  Therefore this script requires the
operator to provide the exact coordinates in a JSON input rather than
silently inventing them.

Example:
    python backend/scripts/seed.py --table-name saans-main --schools-file schools.json

The JSON file must contain a list of records with id, name, city, lat, lon,
tz, and optional policy.  Each record may also provide slots; otherwise the
plan's default timetable is written.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable, Mapping

DEFAULT_SLOTS = [
    {"id": "assembly", "label": "Assembly", "start": "08:00", "end": "08:20", "outdoor": True},
    {"id": "pt", "label": "PT", "start": "11:00", "end": "11:45", "outdoor": True},
    {"id": "lunch", "label": "Lunch", "start": "13:00", "end": "13:40", "outdoor": True},
    {"id": "dispersal", "label": "Dispersal", "start": "14:30", "end": "15:00", "outdoor": True},
]


def build_school_records(schools: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for school in schools:
        try:
            school_id = str(school["id"])
            name = str(school["name"])
            city = str(school["city"])
            lat = float(school["lat"])
            lon = float(school["lon"])
            tz = str(school["tz"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError("each school requires id, name, city, lat, lon, and tz") from exc
        if not school_id or not name or not city or not tz:
            raise ValueError("school metadata fields cannot be empty")
        policy = school.get("policy", {})
        slots = school.get("slots", DEFAULT_SLOTS)
        if not isinstance(policy, Mapping) or not isinstance(slots, list):
            raise ValueError("policy must be an object and slots must be a list")
        records.extend(
            [
                {
                    "PK": f"SCHOOL#{school_id}",
                    "SK": "META",
                    "name": name,
                    "city": city,
                    "lat": lat,
                    "lon": lon,
                    "tz": tz,
                    "policy": dict(policy),
                },
                {
                    "PK": f"SCHOOL#{school_id}",
                    "SK": "TT",
                    "slots": [dict(slot) for slot in slots],
                },
            ]
        )
    return records


def seed_table(table: Any, schools: Iterable[Mapping[str, Any]]) -> int:
    records = build_school_records(schools)
    with table.batch_writer() as batch:
        for record in records:
            batch.put_item(Item=record)
    return len(records)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--table-name", required=True)
    parser.add_argument("--schools-file", required=True, type=Path)
    args = parser.parse_args()
    try:
        import boto3
    except ModuleNotFoundError as exc:
        raise SystemExit("boto3 is required to seed DynamoDB") from exc
    schools = json.loads(args.schools_file.read_text(encoding="utf-8"))
    if not isinstance(schools, list):
        raise SystemExit("schools file must contain a JSON list")
    table = boto3.resource("dynamodb").Table(args.table_name)
    print(f"wrote {seed_table(table, schools)} records")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
