from datetime import datetime

from backend.src.core.engine import decide


NOW = datetime(2026, 10, 9, 5, 30)


def slot(slot_id="pt", start="11:00", end="11:45", grades=None, outdoor=True):
    return {
        "id": slot_id,
        "label": slot_id.upper(),
        "start": start,
        "end": end,
        "outdoor": outdoor,
        "grades": grades or ["6"],
    }


def forecast(aqi, hours=("11:00",)):
    return [{"time": f"2026-10-09T{hour}:00", "usAqi": aqi} for hour in hours]


def result(aqi, **kwargs):
    return decide([slot(**kwargs)], forecast(aqi), {}, NOW)["verdicts"][0]


def test_all_four_verdicts():
    assert result(100)["verdict"] == "GO"
    assert result(100, grades=["Nursery"])["verdict"] == "MODIFY"
    assert (
        decide([slot()], forecast(180, ("11:00", "16:00")), {}, NOW)["verdicts"][0]["verdict"]
        == "MOVE"
    )
    assert result(220)["verdict"] == "CANCEL"


def test_aqi_boundaries():
    assert result(100)["tier"] == "GREEN"
    assert result(101, grades=["6"])["tier"] == "AMBER"
    assert result(150, grades=["6"])["tier"] == "AMBER"
    assert result(151, grades=["6"])["tier"] == "ORANGE"
    assert result(200, grades=["6"])["tier"] == "ORANGE"
    assert result(201, grades=["6"])["tier"] == "RED"
    assert result(300, grades=["6"])["tier"] == "RED"
    assert result(301, grades=["6"])["tier"] == "MAROON"


def test_nursery_to_grade_five_are_evaluated_one_tier_worse():
    assert result(100, grades=["Nursery"])["tier"] == "AMBER"
    assert result(150, grades=["5"])["tier"] == "ORANGE"
    assert result(200, grades=["Grade 5"])["tier"] == "RED"
    assert result(100, grades=["6"])["tier"] == "GREEN"


def test_safe_window_is_recommended_for_orange_activity():
    readings = forecast(180, ("11:00", "16:00"))
    decision = decide([slot()], readings, {}, NOW)
    assert decision["verdicts"][0]["verdict"] == "MOVE"
    assert decision["safeWindows"] == [{"slotId": "pt", "from": "16:00", "to": "16:45"}]


def test_orange_activity_is_cancelled_without_safe_window():
    decision = decide([slot()], forecast(180), {}, NOW)
    assert decision["verdicts"][0]["verdict"] == "CANCEL"
    assert decision["safeWindows"] == []


def test_slot_aqi_is_maximum_reading_in_slot():
    readings = forecast(100, ("11:00",)) + forecast(201, ("11:30",))
    assert decide([slot()], readings, {}, NOW)["verdicts"][0]["aqi"] == 201


def test_indoor_slot_is_not_evaluated_by_outdoor_rules():
    assert result(220, outdoor=False)["verdict"] == "GO"


def test_empty_forecast_defaults_to_green_without_side_effects():
    decision = decide([slot()], [], {}, NOW)
    assert decision["verdicts"][0]["verdict"] == "GO"
    assert decision["verdicts"][0]["aqi"] is None
    assert decision["ledger"] == {"minutesAvoided": 0, "minutesExposed": 0}
