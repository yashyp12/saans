"""AWS Lambda/API adapter for the Saans P0 routes."""

from __future__ import annotations

import json
import math
import os
from datetime import datetime, timezone
from typing import Any, Mapping, Sequence

from backend.src.core.engine import decide
from backend.src.core.policy import tier_for_aqi
from backend.src.data_access import (
    DataStore,
    DataUnavailableError,
    DynamoDataStore,
    forecast_from_readings,
)

SCENARIO_FACTORS = {"normal": 1.0, "stubble": 1.28, "severe": 1.55}


class ApiError(RuntimeError):
    """API-level error returned to callers as an error envelope."""

    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _error_payload(error: ApiError) -> dict[str, Any]:
    return {"error": {"code": error.code, "message": error.message}}


def _response(status_code: int, payload: Any) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    allowed_origin = os.environ.get("CORS_ALLOWED_ORIGIN")
    if allowed_origin:
        headers["Access-Control-Allow-Origin"] = allowed_origin
        headers["Vary"] = "Origin"
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(payload),
    }


def _production_store() -> DataStore:
    try:
        return DynamoDataStore.from_environment()
    except DataUnavailableError as exc:
        raise ApiError("DATA_UNAVAILABLE", str(exc), 503) from exc


def _get_store(store: DataStore | None) -> DataStore:
    return store if store is not None else _production_store()


def _school_id(item: Mapping[str, Any]) -> str:
    pk = item.get("PK")
    if not isinstance(pk, str) or not pk.startswith("SCHOOL#"):
        raise DataUnavailableError("school record has an invalid PK")
    return pk[7:]


def _public_school(item: Mapping[str, Any]) -> dict[str, Any]:
    school_id = _school_id(item)
    try:
        return {
            "id": school_id,
            "name": str(item["name"]),
            "city": str(item["city"]),
        }
    except (KeyError, TypeError, ValueError) as exc:
        raise DataUnavailableError("school record is missing name or city") from exc


def list_schools(store: DataStore | None = None) -> list[dict[str, Any]]:
    try:
        return [_public_school(item) for item in _get_store(store).list_schools()]
    except DataUnavailableError as exc:
        raise ApiError("DATA_UNAVAILABLE", str(exc), 503) from exc


def _load_inputs(
    school_id: str, store: DataStore
) -> tuple[dict[str, Any], dict[str, Any], list[dict[str, Any]]]:
    try:
        school = store.get_school(school_id)
        timetable = store.get_timetable(school_id)
        readings = store.get_readings(school_id)
    except DataUnavailableError:
        raise
    if school is None:
        raise ApiError(
            "SCHOOL_NOT_FOUND", f"No school found for id '{school_id}'", 404
        )
    if timetable is None:
        raise ApiError("DATA_UNAVAILABLE", "School timetable is unavailable", 503)
    if not readings:
        raise ApiError("DATA_UNAVAILABLE", "School forecast is unavailable", 503)
    try:
        forecast = forecast_from_readings(readings)
    except DataUnavailableError as exc:
        raise ApiError("DATA_UNAVAILABLE", str(exc), 503) from exc
    if not forecast:
        raise ApiError("DATA_UNAVAILABLE", "School forecast is unavailable", 503)
    return school, timetable, forecast


def _load_or_translate_error(
    school_id: str, store: DataStore
) -> tuple[dict[str, Any], dict[str, Any], list[dict[str, Any]]]:
    try:
        return _load_inputs(school_id, store)
    except DataUnavailableError as exc:
        raise ApiError("DATA_UNAVAILABLE", str(exc), 503) from exc


def _load_school_forecast(
    school_id: str, store: DataStore
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    try:
        school = store.get_school(school_id)
        readings = store.get_readings(school_id)
    except DataUnavailableError as exc:
        raise ApiError("DATA_UNAVAILABLE", str(exc), 503) from exc
    if school is None:
        raise ApiError(
            "SCHOOL_NOT_FOUND", f"No school found for id '{school_id}'", 404
        )
    if not readings:
        raise ApiError("DATA_UNAVAILABLE", "School forecast is unavailable", 503)
    try:
        forecast = forecast_from_readings(readings)
    except DataUnavailableError as exc:
        raise ApiError("DATA_UNAVAILABLE", str(exc), 503) from exc
    return school, forecast


def get_school_forecast(
    school_id: str, store: DataStore | None = None
) -> list[dict[str, Any]]:
    _, forecast = _load_school_forecast(school_id, _get_store(store))
    return [
        {
            "time": reading["time"],
            "aqi": int(reading["us_aqi"]),
            "tier": tier_for_aqi(float(reading["us_aqi"]), {}),
        }
        for reading in forecast[:48]
    ]


def _headline_from_tier(tier: str) -> str:
    if tier == "GREEN":
        return "Outdoor activities remain safe today"
    if tier == "AMBER":
        return "Keep some activities modified"
    if tier == "ORANGE":
        return "Move the riskiest activities"
    return "Cancel outdoor activity today"


def _slot_reason(slot: Mapping[str, Any]) -> str:
    aqi = slot.get("aqi")
    if aqi is None:
        return "No AQI data available"
    display_aqi = int(aqi) if float(aqi).is_integer() else aqi
    return f"AQI {display_aqi} during {slot['start']}-{slot['end']}"


def _slot_alternative(slot: Mapping[str, Any]) -> str:
    verdict = slot.get("verdict")
    if verdict == "MOVE":
        return f"Shift {slot.get('label', slot.get('id', 'activity'))} to the nearest safe window"
    if verdict == "CANCEL":
        return "Move the activity indoors or to a low-exposure alternative"
    if verdict == "MODIFY":
        return "Shorten the activity and keep it indoors if possible"
    return "No special restriction needed"


def _brief_from_decision(
    school: Mapping[str, Any],
    decision: Mapping[str, Any],
    simulated: bool,
) -> dict[str, Any]:
    slots = []
    for item in decision["verdicts"]:
        slots.append(
            {
                "id": item["id"],
                "label": item["label"],
                "start": item["start"],
                "end": item["end"],
                "aqi": item["aqi"],
                "tier": item["tier"],
                "verdict": item["verdict"],
                "reason": _slot_reason(item),
                "alternative": _slot_alternative(item),
            }
        )
    measured_aqis = [slot["aqi"] for slot in slots if slot["aqi"] is not None]
    max_aqi = max(measured_aqis, default=0)
    headline_tier = decision["tier"] if measured_aqis else "GREEN"
    return {
        "school": _public_school(school),
        "generatedAt": decision["generatedAt"],
        "headline": {
            "tier": headline_tier,
            "maxAqi": int(max_aqi) if float(max_aqi).is_integer() else max_aqi,
            "text": _headline_from_tier(headline_tier),
        },
        "slots": slots,
        "safeWindows": decision["safeWindows"],
        "ledger": {
            "weekMinutesAvoided": decision["ledger"]["minutesAvoided"],
            "weekMinutesExposed": decision["ledger"]["minutesExposed"],
        },
        "source": "open-meteo",
        "simulated": simulated,
    }


def get_school_brief(
    school_id: str,
    now: datetime | None = None,
    store: DataStore | None = None,
) -> dict[str, Any]:
    school, timetable, forecast = _load_or_translate_error(
        school_id, _get_store(store)
    )
    generated_at = now or datetime.now(timezone.utc)
    policy = school.get("policy") if isinstance(school.get("policy"), Mapping) else {}
    decision = decide(timetable, forecast, policy, generated_at)
    return _brief_from_decision(school, decision, simulated=False)


def _apply_scenario(
    base_readings: Sequence[Mapping[str, Any]],
    scenario: str | None,
    aqi_override: float | None,
) -> list[dict[str, Any]]:
    scenario_name = scenario or "normal"
    if not isinstance(scenario_name, str) or scenario_name not in SCENARIO_FACTORS:
        raise ApiError(
            "INVALID_SCENARIO",
            "scenario must be one of normal, stubble, severe",
            400,
        )
    factor = SCENARIO_FACTORS[scenario_name]
    adjusted = []
    for reading in base_readings:
        value = float(reading["us_aqi"])
        next_value = aqi_override if aqi_override is not None else value * factor
        adjusted.append(
            {"time": reading["time"], "us_aqi": max(0, round(next_value))}
        )
    return adjusted


def simulate_school(
    school_id: str,
    payload: Mapping[str, Any] | None = None,
    store: DataStore | None = None,
) -> dict[str, Any]:
    raw_payload = payload or {}
    if not isinstance(raw_payload, Mapping):
        raise ApiError("INVALID_JSON", "Request body must be a JSON object", 400)
    scenario = raw_payload.get("scenario")
    override = raw_payload.get("aqiOverride")
    if override is not None:
        try:
            override = float(override)
        except (TypeError, ValueError) as exc:
            raise ApiError(
                "INVALID_AQI_OVERRIDE",
                "aqiOverride must be a non-negative number",
                400,
            ) from exc
        if not math.isfinite(override) or override < 0:
            raise ApiError(
                "INVALID_AQI_OVERRIDE",
                "aqiOverride must be a non-negative number",
                400,
            )
    school, timetable, forecast = _load_or_translate_error(
        school_id, _get_store(store)
    )
    adjusted = _apply_scenario(forecast, scenario, override)
    policy = school.get("policy") if isinstance(school.get("policy"), Mapping) else {}
    decision = decide(timetable, adjusted, policy, datetime.now(timezone.utc))
    return _brief_from_decision(school, decision, simulated=True)


def handler(
    event: Mapping[str, Any],
    context: Any | None = None,
    store: DataStore | None = None,
) -> dict[str, Any]:
    """Lambda entry point: ``backend.src.api.handler.handler``."""
    try:
        method = (event or {}).get("httpMethod") or (event or {}).get("requestContext", {}).get("http", {}).get("method", "GET")
        path = (event or {}).get("path") or (event or {}).get("rawPath") or "/"
        path_parameters = (event or {}).get("pathParameters") or {}
        raw_body = (event or {}).get("body") or ""
        if raw_body and isinstance(raw_body, str):
            try:
                body = json.loads(raw_body)
            except json.JSONDecodeError as exc:
                raise ApiError("INVALID_JSON", "Request body is not valid JSON", 400) from exc
        else:
            body = raw_body or {}

        parts = [part for part in path.strip("/").split("/") if part]
        if parts == ["schools"]:
            if method.upper() != "GET":
                raise ApiError("METHOD_NOT_ALLOWED", "Only GET is allowed on /schools", 405)
            return _response(200, list_schools(store))
        if len(parts) >= 3 and parts[0] == "schools":
            school_id = path_parameters.get("id") or parts[1]
            route = parts[2]
            if route == "brief" and method.upper() == "GET":
                return _response(200, get_school_brief(school_id, store=store))
            if route == "forecast" and method.upper() == "GET":
                return _response(200, get_school_forecast(school_id, store))
            if route == "simulate" and method.upper() == "POST":
                return _response(200, simulate_school(school_id, body, store))
            raise ApiError("METHOD_NOT_ALLOWED", "Method is not allowed for this route", 405)
        raise ApiError("NOT_FOUND", "Route not found", 404)
    except ApiError as exc:
        return _response(exc.status_code, _error_payload(exc))
    except DataUnavailableError as exc:
        return _response(503, _error_payload(ApiError("DATA_UNAVAILABLE", str(exc), 503)))
