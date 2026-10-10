"""Storage adapters for the planned DynamoDB single-table model.

The core decision engine deliberately does not depend on this module.  API
handlers receive a store through this boundary so tests can use an in-memory
implementation without AWS credentials.
"""

from __future__ import annotations

import os
import time
from typing import Any, Iterable, Mapping, Protocol


class DataUnavailableError(RuntimeError):
    """Raised when the configured store cannot provide required data."""


class DataStore(Protocol):
    def list_schools(self) -> list[dict[str, Any]]: ...

    def get_school(self, school_id: str) -> dict[str, Any] | None: ...

    def get_timetable(self, school_id: str) -> dict[str, Any] | None: ...

    def get_readings(self, school_id: str) -> list[dict[str, Any]]: ...


def _school_pk(school_id: str) -> str:
    return f"SCHOOL#{school_id}"


class DynamoDataStore:
    """DynamoDB adapter for ``saans-main`` using only PK/SK access."""

    def __init__(self, table: Any):
        self.table = table

    @classmethod
    def from_environment(cls) -> "DynamoDataStore":
        table_name = os.environ.get("TABLE_NAME")
        if not table_name:
            raise DataUnavailableError("TABLE_NAME is not configured")
        try:
            import boto3
        except ModuleNotFoundError as exc:
            raise DataUnavailableError("boto3 is required for DynamoDB access") from exc
        return cls(boto3.resource("dynamodb").Table(table_name))

    def _get(self, school_id: str, sort_key: str) -> dict[str, Any] | None:
        try:
            response = self.table.get_item(
                Key={"PK": _school_pk(school_id), "SK": sort_key}
            )
        except Exception as exc:
            raise DataUnavailableError("DynamoDB read failed") from exc
        item = response.get("Item")
        return dict(item) if isinstance(item, Mapping) else None

    def list_schools(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        scan_kwargs: dict[str, Any] = {}
        try:
            while True:
                response = self.table.scan(**scan_kwargs)
                for item in response.get("Items", []):
                    if (
                        isinstance(item, Mapping)
                        and item.get("SK") == "META"
                        and isinstance(item.get("PK"), str)
                        and item["PK"].startswith("SCHOOL#")
                    ):
                        items.append(dict(item))
                last_key = response.get("LastEvaluatedKey")
                if not last_key:
                    break
                scan_kwargs["ExclusiveStartKey"] = last_key
        except Exception as exc:
            raise DataUnavailableError("DynamoDB school listing failed") from exc
        return items

    def get_school(self, school_id: str) -> dict[str, Any] | None:
        return self._get(school_id, "META")

    def get_timetable(self, school_id: str) -> dict[str, Any] | None:
        return self._get(school_id, "TT")

    def get_readings(self, school_id: str) -> list[dict[str, Any]]:
        try:
            response = self.table.query(
                KeyConditionExpression="#pk = :pk AND begins_with(#sk, :prefix)",
                ExpressionAttributeNames={"#pk": "PK", "#sk": "SK"},
                ExpressionAttributeValues={
                    ":pk": _school_pk(school_id),
                    ":prefix": "AQ#",
                },
            )
        except Exception as exc:
            raise DataUnavailableError("DynamoDB reading query failed") from exc
        now = int(time.time())
        def is_current(item: Mapping[str, Any]) -> bool:
            ttl = item.get("ttl")
            if ttl is None:
                return True
            try:
                return int(ttl) >= now
            except (TypeError, ValueError):
                return False

        return [
            dict(item)
            for item in response.get("Items", [])
            if isinstance(item, Mapping)
            and is_current(item)
        ]

    def put_readings(self, readings: Iterable[Mapping[str, Any]]) -> int:
        count = 0
        try:
            with self.table.batch_writer() as batch:
                for reading in readings:
                    batch.put_item(Item=dict(reading))
                    count += 1
        except Exception as exc:
            raise DataUnavailableError("DynamoDB reading write failed") from exc
        return count


class InMemoryDataStore:
    """Explicit test adapter using the same entity keys as DynamoDB."""

    def __init__(self, items: Iterable[Mapping[str, Any]] = ()):
        self.items = {
            (str(item["PK"]), str(item["SK"])): dict(item)
            for item in items
            if "PK" in item and "SK" in item
        }
        self.read_writes = 0

    def list_schools(self) -> list[dict[str, Any]]:
        return [
            dict(item)
            for (pk, sk), item in self.items.items()
            if sk == "META" and pk.startswith("SCHOOL#")
        ]

    def get_school(self, school_id: str) -> dict[str, Any] | None:
        item = self.items.get((_school_pk(school_id), "META"))
        return dict(item) if item else None

    def get_timetable(self, school_id: str) -> dict[str, Any] | None:
        item = self.items.get((_school_pk(school_id), "TT"))
        return dict(item) if item else None

    def get_readings(self, school_id: str) -> list[dict[str, Any]]:
        prefix = _school_pk(school_id)
        return [
            dict(item)
            for (pk, sk), item in sorted(self.items.items())
            if pk == prefix and sk.startswith("AQ#")
        ]

    def put_readings(self, readings: Iterable[Mapping[str, Any]]) -> int:
        count = 0
        for reading in readings:
            item = dict(reading)
            self.items[(str(item["PK"]), str(item["SK"]))] = item
            count += 1
        self.read_writes += count
        return count


def reading_to_forecast(reading: Mapping[str, Any]) -> dict[str, Any]:
    """Map the stored Reading entity to the core engine's forecast shape."""
    sort_key = reading.get("SK")
    if not isinstance(sort_key, str) or not sort_key.startswith("AQ#"):
        raise DataUnavailableError("stored reading has an invalid SK")
    timestamp = sort_key[3:]
    if not timestamp:
        raise DataUnavailableError("stored reading has no timestamp")
    if "usAqi" not in reading:
        raise DataUnavailableError("stored reading has no usAqi")
    try:
        aqi = float(reading["usAqi"])
    except (TypeError, ValueError) as exc:
        raise DataUnavailableError("stored reading has an invalid usAqi") from exc
    return {
        "time": timestamp,
        "us_aqi": aqi,
        "pm2_5": reading.get("pm25"),
        "pm10": reading.get("pm10"),
    }


def forecast_from_readings(
    readings: Iterable[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    forecast = [reading_to_forecast(reading) for reading in readings]
    forecast.sort(key=lambda reading: reading["time"])
    return forecast


def build_store_from_items(items: Iterable[Mapping[str, Any]]) -> InMemoryDataStore:
    """Convenience factory for unit tests; not used as a production fallback."""
    return InMemoryDataStore(items)
