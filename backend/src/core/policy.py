"""AQI policy definitions used by the pure decision engine."""

from __future__ import annotations

from typing import Any, Mapping

DEFAULT_TIERS = {
    "GREEN": (0, 100),
    "AMBER": (101, 150),
    "ORANGE": (151, 200),
    "RED": (201, 300),
    "MAROON": (301, None),
}

TIER_ORDER = ("GREEN", "AMBER", "ORANGE", "RED", "MAROON")


def tier_for_aqi(aqi: float, policy: Mapping[str, Any] | None = None) -> str:
    """Return the configured US-AQI tier for a reading."""
    thresholds = (policy or {}).get("tiers", DEFAULT_TIERS)
    for tier in TIER_ORDER:
        bounds = thresholds.get(tier, DEFAULT_TIERS[tier])
        lower, upper = bounds
        if aqi >= lower and (upper is None or aqi <= upper):
            return tier
    raise ValueError(f"AQI must be non-negative and fit the configured tiers: {aqi!r}")


def worsen_tier(tier: str) -> str:
    """Apply the Nursery-5 one-tier-worse modifier."""
    index = TIER_ORDER.index(tier)
    return TIER_ORDER[min(index + 1, len(TIER_ORDER) - 1)]


def is_sensitive_grade(grades: Any) -> bool:
    """Recognize the Nursery-5 group described by the plan."""
    if isinstance(grades, str):
        values = [grades]
    else:
        values = list(grades or [])
    for value in values:
        normalized = str(value).strip().lower().replace(" ", "")
        if normalized in {"nursery", "kg", "lkg", "ukg"}:
            return True
        if normalized.isdigit() and 1 <= int(normalized) <= 5:
            return True
        if normalized.startswith("grade") and normalized[5:].isdigit():
            if 1 <= int(normalized[5:]) <= 5:
                return True
    return False
