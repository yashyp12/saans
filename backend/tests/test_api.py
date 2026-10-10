import json

import pytest

from backend.src.api import handler as api_handler
from backend.src.data_access import InMemoryDataStore


def fixture_store() -> InMemoryDataStore:
    items = []
    for school_id, name, city in (
        ("delhi", "Demo School Delhi", "Delhi"),
        ("lucknow", "Demo School Lucknow", "Lucknow"),
        ("bengaluru", "Demo School Bengaluru", "Bengaluru"),
    ):
        items.extend(
            [
                {
                    "PK": f"SCHOOL#{school_id}",
                    "SK": "META",
                    "name": name,
                    "city": city,
                    "lat": 28.6,
                    "lon": 77.2,
                    "tz": "Asia/Kolkata",
                    "policy": {},
                },
                {
                    "PK": f"SCHOOL#{school_id}",
                    "SK": "TT",
                    "slots": [
                        {
                            "id": "assembly",
                            "label": "Assembly",
                            "start": "08:00",
                            "end": "08:20",
                            "outdoor": True,
                            "grades": ["6"],
                        },
                        {
                            "id": "pt",
                            "label": "PT",
                            "start": "11:00",
                            "end": "11:45",
                            "outdoor": True,
                            "grades": ["6"],
                        },
                        {
                            "id": "lunch",
                            "label": "Lunch",
                            "start": "13:00",
                            "end": "13:40",
                            "outdoor": True,
                            "grades": ["6"],
                        },
                        {
                            "id": "dispersal",
                            "label": "Dispersal",
                            "start": "14:30",
                            "end": "15:00",
                            "outdoor": True,
                            "grades": ["6"],
                        },
                    ],
                },
            ]
        )
        values = {8: 142, 11: 231, 13: 178, 14: 96, 15: 92, 16: 100}
        for hour in range(48):
            day = 9 + hour // 24
            clock = hour % 24
            items.append(
                {
                    "PK": f"SCHOOL#{school_id}",
                    "SK": f"AQ#2026-10-{day:02d}T{clock:02d}:00",
                    "pm25": 20.0,
                    "pm10": 30.0,
                    "usAqi": float(values.get(clock, 90)),
                    "ttl": 1792195200,
                }
            )
    return InMemoryDataStore(items)


def test_get_schools_returns_seed_data_contract():
    schools = api_handler.list_schools(fixture_store())
    assert schools == [
        {"id": "delhi", "name": "Demo School Delhi", "city": "Delhi"},
        {"id": "lucknow", "name": "Demo School Lucknow", "city": "Lucknow"},
        {"id": "bengaluru", "name": "Demo School Bengaluru", "city": "Bengaluru"},
    ]


def test_handler_exposes_all_four_frozen_routes():
    store = fixture_store()
    schools = api_handler.handler(
        {"httpMethod": "GET", "path": "/schools"}, store=store
    )
    forecast = api_handler.handler(
        {"httpMethod": "GET", "path": "/schools/delhi/forecast"}, store=store
    )
    brief = api_handler.handler(
        {"httpMethod": "GET", "path": "/schools/delhi/brief"}, store=store
    )
    simulation = api_handler.handler(
        {
            "httpMethod": "POST",
            "path": "/schools/delhi/simulate",
            "body": json.dumps({"scenario": "normal"}),
        },
        store=store,
    )
    assert schools["statusCode"] == 200
    assert len(json.loads(schools["body"])) == 3
    assert forecast["statusCode"] == 200
    assert len(json.loads(forecast["body"])) == 48
    assert brief["statusCode"] == 200
    assert json.loads(brief["body"])["simulated"] is False
    assert simulation["statusCode"] == 200
    assert json.loads(simulation["body"])["simulated"] is True


def test_get_brief_returns_documented_response_shape():
    result = api_handler.get_school_brief("delhi", store=fixture_store())

    assert result["school"] == {"id": "delhi", "name": "Demo School Delhi", "city": "Delhi"}
    assert result["source"] == "open-meteo"
    assert result["simulated"] is False
    assert len(result["safeWindows"]) >= 1
    assert {"slotId", "from", "to"}.issubset(result["safeWindows"][0].keys())
    assert result["ledger"]["weekMinutesAvoided"] >= 0
    assert result["headline"]["text"]
    assert result["slots"][1]["aqi"] == 231
    assert result["slots"][1]["verdict"] == "CANCEL"
    assert result["slots"][0]["id"] == "assembly"
    assert result["slots"][0]["reason"].startswith("AQI ")


def test_get_forecast_returns_hourly_points_with_tiers():
    forecast = api_handler.get_school_forecast("delhi", fixture_store())
    assert len(forecast) == 48
    assert forecast[0]["time"].endswith("Z") is False
    assert forecast[0]["tier"] in {"GREEN", "AMBER", "ORANGE", "RED", "MAROON"}
    assert forecast[0]["aqi"] >= 0


def test_missing_school_returns_error_envelope():
    response = api_handler.handler(
        {
            "httpMethod": "GET",
            "path": "/schools/unknown/brief",
            "pathParameters": {"id": "unknown"},
        },
        store=fixture_store(),
    )

    assert response["statusCode"] == 404
    assert json.loads(response["body"]) == {
        "error": {"code": "SCHOOL_NOT_FOUND", "message": "No school found for id 'unknown'"}
    }


def test_missing_forecast_returns_data_unavailable():
    store = fixture_store()
    store.items = {
        key: value
        for key, value in store.items.items()
        if not key[1].startswith("AQ#")
    }
    response = api_handler.handler(
        {"httpMethod": "GET", "path": "/schools/delhi/brief"},
        store=store,
    )
    assert response["statusCode"] == 503
    assert json.loads(response["body"])["error"]["code"] == "DATA_UNAVAILABLE"


def test_forecast_does_not_require_timetable():
    store = fixture_store()
    store.items.pop(("SCHOOL#delhi", "TT"))
    response = api_handler.handler(
        {"httpMethod": "GET", "path": "/schools/delhi/forecast"},
        store=store,
    )
    assert response["statusCode"] == 200
    assert len(json.loads(response["body"])) == 48


def test_brief_requires_timetable():
    store = fixture_store()
    store.items.pop(("SCHOOL#delhi", "TT"))
    response = api_handler.handler(
        {"httpMethod": "GET", "path": "/schools/delhi/brief"},
        store=store,
    )
    assert response["statusCode"] == 503
    assert json.loads(response["body"])["error"]["code"] == "DATA_UNAVAILABLE"


def test_simulate_accepts_scenario_and_override_inputs():
    store = fixture_store()
    scenario_response = api_handler.handler(
        {
            "httpMethod": "POST",
            "path": "/schools/delhi/simulate",
            "body": json.dumps({"scenario": "severe"}),
        },
        store=store,
    )
    scenario_payload = json.loads(scenario_response["body"])
    assert scenario_response["statusCode"] == 200
    assert scenario_payload["simulated"] is True
    assert scenario_payload["headline"]["tier"] in {"GREEN", "AMBER", "ORANGE", "RED", "MAROON"}

    override_response = api_handler.handler(
        {
            "httpMethod": "POST",
            "path": "/schools/delhi/simulate",
            "body": json.dumps({"aqiOverride": 260}),
        },
        store=store,
    )
    override_payload = json.loads(override_response["body"])
    assert override_response["statusCode"] == 200
    assert override_payload["headline"]["maxAqi"] == 260


def test_simulation_does_not_write_to_store():
    store = fixture_store()
    before = dict(store.items)
    api_handler.simulate_school("delhi", {"scenario": "stubble"}, store)
    assert store.items == before
    assert store.read_writes == 0


def test_invalid_scenario_rejected_with_error_envelope():
    response = api_handler.handler(
        {
            "httpMethod": "POST",
            "path": "/schools/delhi/simulate",
            "body": json.dumps({"scenario": "firestorm"}),
        },
        store=fixture_store(),
    )

    assert response["statusCode"] == 400
    assert json.loads(response["body"]) == {
        "error": {"code": "INVALID_SCENARIO", "message": "scenario must be one of normal, stubble, severe"}
    }


def test_invalid_aqi_override_rejected():
    with pytest.raises(api_handler.ApiError, match="non-negative"):
        api_handler.simulate_school(
            "delhi", {"aqiOverride": -1}, fixture_store()
        )
