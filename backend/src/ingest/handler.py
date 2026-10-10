"""Open-Meteo forecast ingestion Lambda."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Mapping, Sequence
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from backend.src.data_access import DataUnavailableError, DynamoDataStore

OPEN_METEO_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"


class IngestionError(RuntimeError):
    """Raised when the configured forecast source cannot be ingested."""


def build_open_meteo_url(latitude: float, longitude: float) -> str:
    query = urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": "pm2_5,pm10,us_aqi",
            "forecast_days": 2,
            "timezone": "auto",
        }
    )
    return f"{OPEN_METEO_URL}?{query}"


def map_readings(
    school_id: str,
    response: Mapping[str, Any],
    now: datetime | None = None,
) -> list[dict[str, Any]]:
    """Map Open-Meteo hourly arrays to the DynamoDB Reading entity."""
    hourly = response.get("hourly")
    if not isinstance(hourly, Mapping):
        raise IngestionError("Open-Meteo response is missing hourly data")

    times = hourly.get("time")
    pm25 = hourly.get("pm2_5")
    pm10 = hourly.get("pm10")
    us_aqi = hourly.get("us_aqi")
    arrays = (times, pm25, pm10, us_aqi)
    if not all(isinstance(values, Sequence) and not isinstance(values, (str, bytes)) for values in arrays):
        raise IngestionError("Open-Meteo response is missing required hourly fields")
    if any(len(values) == 0 for values in arrays):
        raise IngestionError("Open-Meteo hourly fields are empty")
    if len({len(values) for values in arrays}) != 1:
        raise IngestionError("Open-Meteo hourly fields have different lengths")

    generated_at = int((now or datetime.now(timezone.utc)).timestamp())
    readings = []
    try:
        for index, timestamp in enumerate(times):
            readings.append(
                {
                    "PK": f"SCHOOL#{school_id}",
                    "SK": f"AQ#{timestamp}",
                    "pm25": float(pm25[index]),
                    "pm10": float(pm10[index]),
                    "usAqi": float(us_aqi[index]),
                    "ttl": generated_at + 7 * 24 * 60 * 60,
                }
            )
    except (TypeError, ValueError) as exc:
        raise IngestionError("Open-Meteo hourly fields contain invalid values") from exc
    return readings


def fetch_forecast(latitude: float, longitude: float) -> Mapping[str, Any]:
    """Fetch one forecast response from the keyless Open-Meteo source."""
    try:
        with urlopen(build_open_meteo_url(latitude, longitude), timeout=15) as response:
            return json.load(response)
    except (OSError, URLError, ValueError, json.JSONDecodeError) as exc:
        raise IngestionError(
            "Open-Meteo forecast ingestion failed; OpenAQ fallback is not configured"
        ) from exc


def _schools(
    event: Mapping[str, Any], table: Any
) -> Sequence[Mapping[str, Any]]:
    schools = event.get("schools")
    if schools is not None:
        if not isinstance(schools, Sequence) or isinstance(schools, (str, bytes)):
            raise IngestionError('event "schools" must be a list')
        return schools
    try:
        records = DynamoDataStore(table).list_schools()
    except DataUnavailableError as exc:
        raise IngestionError("cannot resolve schools from DynamoDB") from exc
    resolved = []
    for record in records:
        try:
            school_id = str(record["PK"]).removeprefix("SCHOOL#")
            resolved.append(
                {
                    "id": school_id,
                    "lat": float(record["lat"]),
                    "lon": float(record["lon"]),
                }
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise IngestionError(
                "school metadata requires PK, lat, and lon"
            ) from exc
    if not resolved:
        raise IngestionError("no seeded schools were found")
    return resolved


def _dynamodb_table() -> Any:
    """Create the DynamoDB table handle only when the Lambda writes readings."""
    try:
        import boto3
    except ModuleNotFoundError as exc:
        raise IngestionError(
            "boto3 is required to persist ingestion results"
        ) from exc
    return boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])


def handler(event: Mapping[str, Any], context: Any) -> dict[str, Any]:
    """Fetch and persist forecasts for the schools supplied by the event."""
    table = _dynamodb_table()
    written = 0
    for school in _schools(event, table):
        try:
            school_id = str(school["id"])
            latitude = float(school["lat"])
            longitude = float(school["lon"])
        except (KeyError, TypeError, ValueError) as exc:
            raise IngestionError("each school requires id, lat, and lon") from exc
        readings = map_readings(school_id, fetch_forecast(latitude, longitude))
        try:
            written += DynamoDataStore(table).put_readings(readings)
        except DataUnavailableError as exc:
            raise IngestionError("failed to persist forecast readings") from exc
    return {"source": "open-meteo", "readingsWritten": written}
