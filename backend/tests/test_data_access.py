from backend.src.data_access import (
    DynamoDataStore,
    InMemoryDataStore,
    forecast_from_readings,
    reading_to_forecast,
)


def test_stored_reading_maps_to_core_forecast_shape():
    reading = {
        "PK": "SCHOOL#delhi",
        "SK": "AQ#2026-10-10T11:00",
        "pm25": 80.0,
        "pm10": 120.0,
        "usAqi": 201,
        "ttl": 1792195200,
    }
    assert reading_to_forecast(reading) == {
        "time": "2026-10-10T11:00",
        "us_aqi": 201.0,
        "pm2_5": 80.0,
        "pm10": 120.0,
    }


def test_in_memory_adapter_uses_planned_entity_keys():
    store = InMemoryDataStore(
        [
            {
                "PK": "SCHOOL#delhi",
                "SK": "META",
                "name": "Demo School Delhi",
                "city": "Delhi",
            },
            {"PK": "SCHOOL#delhi", "SK": "TT", "slots": []},
            {
                "PK": "SCHOOL#delhi",
                "SK": "AQ#2026-10-10T00:00",
                "usAqi": 0,
            },
        ]
    )
    assert store.get_school("delhi")["SK"] == "META"
    assert store.get_timetable("delhi")["SK"] == "TT"
    assert forecast_from_readings(store.get_readings("delhi"))[0]["us_aqi"] == 0
    assert store.get_school("missing") is None


def test_dynamo_adapter_excludes_expired_readings(monkeypatch):
    class Table:
        def query(self, **kwargs):
            return {
                "Items": [
                    {
                        "PK": "SCHOOL#delhi",
                        "SK": "AQ#old",
                        "usAqi": 1,
                        "ttl": 99,
                    },
                    {
                        "PK": "SCHOOL#delhi",
                        "SK": "AQ#current",
                        "usAqi": 0,
                        "ttl": 9999999999,
                    },
                ]
            }

    monkeypatch.setattr("backend.src.data_access.time.time", lambda: 100)
    readings = DynamoDataStore(Table()).get_readings("delhi")
    assert [item["SK"] for item in readings] == ["AQ#current"]
