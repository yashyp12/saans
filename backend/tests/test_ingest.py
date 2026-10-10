from datetime import datetime, timezone
from json import JSONDecodeError

import pytest

from backend.src.ingest import handler as ingest


def open_meteo_response():
    return {
        "hourly": {
            "time": ["2026-10-10T00:00", "2026-10-10T01:00"],
            "pm2_5": [12.5, 13.0],
            "pm10": [20.0, 21.0],
            "us_aqi": [42, 45],
        }
    }


def test_map_readings_preserves_open_meteo_fields_in_reading_model():
    readings = ingest.map_readings(
        "delhi",
        open_meteo_response(),
        datetime(2026, 10, 10, tzinfo=timezone.utc),
    )

    assert readings == [
        {
            "PK": "SCHOOL#delhi",
            "SK": "AQ#2026-10-10T00:00",
            "pm25": 12.5,
            "pm10": 20.0,
            "usAqi": 42.0,
            "ttl": 1792195200,
        },
        {
            "PK": "SCHOOL#delhi",
            "SK": "AQ#2026-10-10T01:00",
            "pm25": 13.0,
            "pm10": 21.0,
            "usAqi": 45.0,
            "ttl": 1792195200,
        },
    ]


@pytest.mark.parametrize(
    "response",
    [
        {},
        {"hourly": {"time": [], "pm2_5": [], "pm10": [], "us_aqi": []}},
        {
            "hourly": {
                "time": ["2026-10-10T00:00"],
                "pm2_5": [1],
                "pm10": [],
                "us_aqi": [1],
            }
        },
    ],
)
def test_map_readings_rejects_missing_or_invalid_hourly_data(response):
    with pytest.raises(ingest.IngestionError):
        ingest.map_readings("delhi", response)


def test_fetch_forecast_reports_source_failure_without_silent_fallback(monkeypatch):
    def fail(*args, **kwargs):
        raise JSONDecodeError("invalid", "", 0)

    monkeypatch.setattr(ingest, "urlopen", fail)

    with pytest.raises(ingest.IngestionError, match="OpenAQ fallback is not configured"):
        ingest.fetch_forecast(28.6, 77.2)


class FakeBatchWriter:
    def __init__(self, table):
        self.table = table

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def put_item(self, Item):
        self.table.writes.append(Item)


class FakeTable:
    def __init__(self):
        self.writes = []

    def scan(self, **kwargs):
        return {
            "Items": [
                {
                    "PK": "SCHOOL#delhi",
                    "SK": "META",
                    "name": "Demo School Delhi",
                    "city": "Delhi",
                    "lat": 28.6,
                    "lon": 77.2,
                }
            ]
        }

    def batch_writer(self):
        return FakeBatchWriter(self)


def test_handler_resolves_seeded_schools_when_scheduler_event_has_no_list(monkeypatch):
    table = FakeTable()
    monkeypatch.setattr(ingest, "_dynamodb_table", lambda: table)
    monkeypatch.setattr(ingest, "fetch_forecast", lambda lat, lon: open_meteo_response())

    result = ingest.handler({}, None)

    assert result == {"source": "open-meteo", "readingsWritten": 2}
    assert len(table.writes) == 2
    assert table.writes[0]["PK"] == "SCHOOL#delhi"


def test_map_readings_rejects_invalid_numeric_source_values():
    response = open_meteo_response()
    response["hourly"]["us_aqi"][0] = "not-a-number"
    with pytest.raises(ingest.IngestionError, match="invalid values"):
        ingest.map_readings("delhi", response)
