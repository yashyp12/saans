"""Pure Saans activity decision engine."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any, Mapping, Sequence

from .policy import (
    TIER_ORDER,
    is_sensitive_grade,
    tier_for_aqi,
    worsen_tier,
)
from .safe_window import find_safe_window


def _time(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        raise ValueError("forecast readings require a time")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _aqi(reading: Mapping[str, Any]) -> float:
    for key in ("usAqi", "us_aqi", "aqi"):
        if key in reading:
            return float(reading[key])
    raise ValueError("forecast readings require usAqi")


def _minutes(slot: Mapping[str, Any]) -> int:
    start = datetime.strptime(str(slot["start"]), "%H:%M")
    end = datetime.strptime(str(slot["end"]), "%H:%M")
    result = int((end - start).total_seconds() / 60)
    if result <= 0:
        raise ValueError("slot end must be later than slot start")
    return result


def decide(
    timetable: Mapping[str, Any] | Sequence[Mapping[str, Any]],
    hourlyForecast: Sequence[Mapping[str, Any]],
    policy: Mapping[str, Any] | None,
    now: datetime,
) -> dict[str, Any]:
    """Evaluate timetable activities against an hourly US-AQI forecast."""
    policy = policy or {}
    slots = timetable.get("slots", []) if isinstance(timetable, Mapping) else timetable
    readings = sorted(hourlyForecast, key=_time)
    verdicts = []
    safe_windows = []
    max_tier = "GREEN"
    minutes_avoided = 0
    minutes_exposed = 0

    for slot in slots:
        slot_readings = [
            reading
            for reading in readings
            if str(slot["start"]) <= _time(reading).strftime("%H:%M") < str(slot["end"])
        ]
        measured_aqi = max((_aqi(reading) for reading in slot_readings), default=None)
        measured_tier = tier_for_aqi(measured_aqi, policy) if measured_aqi is not None else "GREEN"
        evaluated_tier = (
            worsen_tier(measured_tier)
            if is_sensitive_grade(slot.get("grades"))
            else measured_tier
        )
        max_tier = max(max_tier, evaluated_tier, key=TIER_ORDER.index)
        outdoor = bool(slot.get("outdoor", False))
        safe_window = None
        if outdoor and evaluated_tier == "ORANGE":
            safe_window = find_safe_window(slot, readings, policy)
        if not outdoor:
            verdict = "GO"
        elif evaluated_tier == "GREEN":
            verdict = "GO"
        elif evaluated_tier == "AMBER":
            verdict = "MODIFY" if is_sensitive_grade(slot.get("grades")) else "GO"
        elif evaluated_tier == "ORANGE":
            verdict = "MOVE" if safe_window else "CANCEL"
        else:
            verdict = "CANCEL"

        duration = _minutes(slot)
        if safe_window:
            safe_windows.append({"slotId": slot["id"], **safe_window})
        if verdict in {"MOVE", "CANCEL"} and measured_tier in {"ORANGE", "RED", "MAROON"}:
            minutes_avoided += duration
        if verdict in {"GO", "MODIFY"} and measured_tier in {"ORANGE", "RED", "MAROON"}:
            minutes_exposed += duration
        verdicts.append(
            {
                "id": slot["id"],
                "label": slot.get("label", slot["id"]),
                "start": slot["start"],
                "end": slot["end"],
                "aqi": measured_aqi,
                "tier": evaluated_tier,
                "verdict": verdict,
            }
        )

    digest = hashlib.sha256(
        json.dumps(verdicts, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    return {
        "verdicts": verdicts,
        "safeWindows": safe_windows,
        "tier": max_tier,
        "generatedAt": now.isoformat(),
        "hash": digest,
        "ledger": {
            "minutesAvoided": minutes_avoided,
            "minutesExposed": minutes_exposed,
        },
    }
