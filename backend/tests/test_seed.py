from backend.scripts.seed import build_school_records


def test_seed_builder_writes_exact_planned_school_and_timetable_keys():
    records = build_school_records(
        [
            {
                "id": "delhi",
                "name": "Demo School Delhi",
                "city": "Delhi",
                "lat": 28.6,
                "lon": 77.2,
                "tz": "Asia/Kolkata",
            }
        ]
    )
    assert {(record["PK"], record["SK"]) for record in records} == {
        ("SCHOOL#delhi", "META"),
        ("SCHOOL#delhi", "TT"),
    }
    timetable = next(record for record in records if record["SK"] == "TT")
    assert [slot["id"] for slot in timetable["slots"]] == [
        "assembly",
        "pt",
        "lunch",
        "dispersal",
    ]
