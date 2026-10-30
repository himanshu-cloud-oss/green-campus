"""Tests for inventory, simulated telemetry, auto-booking and the savings model."""
from datetime import date, datetime, timedelta

from app.services.telemetry_service import FloorModel


def _next_weekday(wd: int) -> date:
    d = date.today() + timedelta(days=1)
    while d.weekday() != wd:
        d += timedelta(days=1)
    return d


# --------------------------------------------------------------------------- inventory
def test_pilot_floor_seeded(client):
    floors = client.get("/api/inventory/floors").json()
    assert len(floors) == 1
    floor = floors[0]
    assert floor["is_pilot"] and floor["level"] == 2
    codes = {s["code"] for s in floor["spaces"]}
    assert {"LS-03", "LS-04", "LS-05", "LS-08", "LS-09", "LS-10"} <= codes
    caps = {s["code"]: s["capacity"] for s in floor["spaces"]}
    assert caps["LS-04"] == 40 and caps["LS-08"] == 40 and caps["LS-03"] == 60
    assert all(a["spec_status"] == "ESTIMATED" for s in floor["spaces"] for a in s["assets"])


def test_classrooms_on_second_floor(client):
    rooms = client.get("/api/classrooms").json()
    assert {r["floor"] for r in rooms} == {2}
    assert {r["building"] for r in rooms} == {"L Block"}


def test_asset_crud_updates_classroom_load(client):
    floor = client.get("/api/inventory/floors").json()[0]
    ls03 = next(s for s in floor["spaces"] if s["code"] == "LS-03")
    before = ls03["connected_kw"]

    created = client.post(f"/api/inventory/spaces/{ls03['id']}/assets",
                          json={"device_type": "PROJECTOR", "quantity": 1}).json()
    assert created["rated_power_w"] == 300 and created["category"] == "AV"

    room = next(r for r in client.get("/api/classrooms").json() if r["name"] == "LS-03")
    assert abs(room["connected_load_kw"] - (before + 0.3)) < 0.02

    patched = client.patch(f"/api/inventory/assets/{created['id']}",
                           json={"rated_power_w": 280, "spec_status": "VERIFIED"}).json()
    assert patched["spec_status"] == "VERIFIED" and patched["rated_power_w"] == 280

    assert client.delete(f"/api/inventory/assets/{created['id']}").status_code == 200
    room = next(r for r in client.get("/api/classrooms").json() if r["name"] == "LS-03")
    assert abs(room["connected_load_kw"] - before) < 0.02


def test_new_classroom_space_is_bookable_in_timetable(client):
    floor = client.get("/api/inventory/floors").json()[0]
    r = client.post(f"/api/inventory/floors/{floor['id']}/spaces",
                    json={"code": "LS-11", "name": "Classroom LS-11", "kind": "CLASSROOM", "capacity": 50,
                          "bookable": True})
    assert r.status_code == 201
    assert r.json()["classroom_id"] is not None
    assert any(c["name"] == "LS-11" for c in client.get("/api/classrooms").json())


def test_linked_classroom_cannot_be_deleted(client):
    floor = client.get("/api/inventory/floors").json()[0]
    ls03 = next(s for s in floor["spaces"] if s["code"] == "LS-03")
    assert client.delete(f"/api/inventory/spaces/{ls03['id']}").status_code == 409


def test_invalid_category_rejected(client):
    floor = client.get("/api/inventory/floors").json()[0]
    sid = floor["spaces"][0]["id"]
    r = client.post(f"/api/inventory/spaces/{sid}/assets", json={"device_type": "OTHER", "category": "NOPE"})
    assert r.status_code == 400


# --------------------------------------------------------------------------- telemetry
def test_telemetry_is_deterministic(client):
    at = f"{_next_weekday(1).isoformat()}T10:15:00"
    a = client.get("/api/telemetry/live", params={"at": at}).json()
    b = client.get("/api/telemetry/live", params={"at": at}).json()
    assert a["simulated"] is True
    assert a["total_kw"] == b["total_kw"] and a["waste_kw"] == b["waste_kw"]


def test_telemetry_night_is_lower_than_class_time(client):
    d = _next_weekday(2).isoformat()
    day = client.get("/api/telemetry/live", params={"at": f"{d}T10:15:00"}).json()
    night = client.get("/api/telemetry/live", params={"at": f"{d}T02:00:00"}).json()
    assert night["total_kw"] < day["total_kw"]
    assert all(s["state"] in ("AFTER_HOURS", "CLOSED") for s in night["spaces"])


def test_summer_draws_more_than_winter(db):
    model = FloorModel(db)
    summer = model.snapshot(datetime(2026, 6, 10, 10, 15), detail=False)["total_kw"]
    winter = model.snapshot(datetime(2026, 1, 13, 10, 15), detail=False)["total_kw"]
    assert summer > winter * 2


def test_category_totals_match_floor_total(client):
    live = client.get("/api/telemetry/live", params={"at": f"{_next_weekday(3).isoformat()}T14:20:00"}).json()
    assert abs(sum(live["by_category"].values()) - live["total_kw"]) < 0.01
    assert abs(sum(s["kw"] for s in live["spaces"]) - live["total_kw"]) < 0.01


# --------------------------------------------------------------------------- auto booking
def test_auto_booking_respects_capacity_and_needs(client):
    r = client.post("/api/bookings/auto", json={
        "subject": "Guest lecture", "expected_students": 55, "date": _next_weekday(0).isoformat(),
        "needs": ["SMARTBOARD"], "auto_book": False,
    }).json()
    assert r["chosen"] is not None
    assert r["chosen"]["capacity"] >= 55
    assert {x["room"] for x in r["rejected_rooms"]} == {"LS-04", "LS-08"}
    scores = [r["chosen"]["score"]] + [a["score"] for a in r["alternatives"]]
    assert scores == sorted(scores)


def test_auto_booking_books_and_blocks_slot(client):
    d = _next_weekday(1).isoformat()
    payload = {"subject": "Remedial DSA", "expected_students": 30, "date": d, "auto_book": True,
               "requested_by": "Dr. Test"}
    first = client.post("/api/bookings/auto", json=payload).json()
    assert first["booked"]["source"] == "AUTO"
    assert first["booked"]["requested_by"] == "Dr. Test"
    second = client.post("/api/bookings/auto", json=payload).json()
    assert (second["booked"]["classroom_id"], second["booked"]["start_time"]) != \
           (first["booked"]["classroom_id"], first["booked"]["start_time"])


def test_auto_booking_reports_no_fit(client):
    r = client.post("/api/bookings/auto", json={
        "subject": "Convocation", "expected_students": 400, "date": _next_weekday(2).isoformat(),
    }).json()
    assert r["booked"] is None and r["chosen"] is None
    assert "No free room" in r["message"]


# --------------------------------------------------------------------------- savings model
def test_savings_model_reconciles(client):
    r = client.post("/api/savings/model", json={}).json()
    a = r["annual"]
    assert a["baseline_kwh"] > a["saved_kwh"] > 0
    assert abs(sum(r["by_strategy"].values()) - a["saved_kwh"]) <= 3
    assert abs(sum(r["by_category"].values()) - a["saved_kwh"]) <= 3
    assert len(r["by_month"]) == 12


def test_savings_upgrades_add_savings(client):
    base = client.post("/api/savings/model", json={}).json()["annual"]["saved_kwh"]
    more = client.post("/api/savings/model", json={"ac_setpoint_raise_c": 2, "bldc_fan_retrofit": True}).json()
    assert more["annual"]["saved_kwh"] > base
    assert more["by_strategy"]["ac_setpoint"] > 0 and more["by_strategy"]["bldc_fans"] > 0


def test_savings_strategies_can_be_disabled(client):
    r = client.post("/api/savings/model", json={"vacant_periods": False, "lunch": False, "no_show": False,
                                                 "after_hours": False}).json()
    assert r["annual"]["saved_kwh"] == 0
