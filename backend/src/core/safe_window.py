"""Safe-window calculation for the pure decision engine."""

from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import Any, Mapping, Sequence

from .policy import tier_for_aqi


def _forecast_time(reading: Mapping[str, Any]) -> datetime:
    value = reading.get("time")
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        raise ValueError("forecast readings require a time")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _aqi(reading: Mapping[str, Any]) -> float:
    """Read Open-Meteo's ``us_aqi`` field; accept normalized compatibility input."""
    for key in ("us_aqi", "usAqi"):
        if key in reading:
            return float(reading[key])
    raise ValueError("forecast readings require us_aqi")


def find_safe_window(
    slot: Mapping[str, Any],
    hourly_forecast: Sequence[Mapping[str, Any]],
    policy: Mapping[str, Any] | None = None,
) -> dict[str, str] | None:
    """Find the nearest contiguous AMBER-or-better span for a slot."""
    start = datetime.strptime(str(slot["start"]), "%H:%M").time()
    end = datetime.strptime(str(slot["end"]), "%H:%M").time()
    duration = datetime.combine(datetime.min, end) - datetime.combine(datetime.min, start)
    if duration <= timedelta(0):
        raise ValueError("slot end must be later than slot start")

    school_day = (policy or {}).get("schoolDay", {})
    day_start = time.fromisoformat(school_day.get("start", "07:00"))
    day_end = time.fromisoformat(school_day.get("end", "17:00"))
    candidates = []
    for reading in hourly_forecast:
        timestamp = _forecast_time(reading)
        wall_time = timestamp.time().replace(second=0, microsecond=0)
        if day_start <= wall_time < day_end and tier_for_aqi(_aqi(reading), policy) in {
            "GREEN",
            "AMBER",
        }:
            candidates.append(timestamp)

    candidates.sort()
    needed_hours = (duration + timedelta(hours=1) - timedelta(microseconds=1)) // timedelta(hours=1)
    windows = []
    for index, candidate in enumerate(candidates):
        contiguous = True
        for offset in range(1, int(needed_hours)):
            if index + offset >= len(candidates):
                contiguous = False
                break
            if candidates[index + offset] - candidates[index + offset - 1] != timedelta(hours=1):
                contiguous = False
                break
        if not contiguous:
            continue
        candidate_end = candidate + duration
        distance = abs(
            datetime.combine(datetime.min, candidate.time())
            - datetime.combine(datetime.min, start)
        )
        windows.append((distance, candidate, candidate_end))

    if not windows:
        return None
    _, window_start, window_end = min(windows, key=lambda item: item[0])
    return {
        "from": window_start.strftime("%H:%M"),
        "to": window_end.strftime("%H:%M"),
    }
