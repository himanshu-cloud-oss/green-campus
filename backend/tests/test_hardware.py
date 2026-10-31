"""Tests for the simulated hardware layer (/api/hw) and the buildings endpoints."""
from datetime import date, datetime, time, timedelta


def _next_weekday(wd: int) -> date:
    d = date.today() + timedelta(days=1)
    while d.weekday() != wd:
        d += timedelta(days=1)
    return d


def _at(hh: int, mm: int) -> str:
    return datetime.combine(_next_weekday(1), time(hh, mm)).isoformat()  # next Tuesday


IN_CLASS = lambda: _at(10, 15)   # noqa: E731
LUNCH = lambda: _at(11, 45)      # noqa: E731


def _room_in_state(client, at: str, state: str) -> dict:
    live = client.get("/api/telemetry/live", params={"at": at}).json()
    rooms = [s for s in live["spaces"] if s["state"] == state and s["kind"] == "CLASSROOM"]
    assert rooms, f"no classroom in state {state} at {at}"
    return rooms[0]


def test_overview_consistent_with_channels(client):
    at = IN_CLASS()
    ov = client.get("/api/hw/overview", params={"at": at}).json()
    chans = client.get("/api/hw/channels", params={"at": at}).json()
    assert ov["simulated"] is True
    assert ov["floor"]["name"] and ov["floor"]["building"] == "L Block"
    assert ov["gateway"]["id"] == "GW-L2" and ov["gateway"]["status"] == "ONLINE"
    assert ov["relays"]["total"] == len(chans)
    assert ov["relays"]["mismatch"] == sum(1 for c in chans if c["health"] == "MISMATCH")
    assert ov["relays"]["ok"] + ov["relays"]["mismatch"] == ov["relays"]["total"]
    assert ov["meters"]["total"] == 10  # one CT per space on the pilot floor
    assert ov["sensors"]["total"] >= ov["meters"]["total"]
    alarms = client.get("/api/hw/alarms", params={"at": at}).json()
    assert ov["alarms"]["open"] == len(alarms)
    assert ov["alarms"]["p1"] + ov["alarms"]["p2"] + ov["alarms"]["p3"] == len(alarms)


def test_channel_mapping_and_bank_ids(client):
    at = IN_CLASS()
    spaces = client.get("/api/telemetry/live", params={"at": at}).json()["spaces"]
    by_code = {s["code"]: s["space_id"] for s in spaces}
    expect = {"HVAC": "K1", "LIGHTING": "K2", "FAN": "K3", "AV": "K4"}

    d = client.get(f"/api/hw/spaces/{by_code['LS-08']}", params={"at": at}).json()
    assert d["relay_bank"]["id"] == "RB-08"
    assert d["relay_bank"]["channels"]
    for c in d["relay_bank"]["channels"]:
        assert expect[c["category"]] == c["ch"]
        assert c["command"] in ("ON", "OFF") and c["status"] in ("OK", "OFF", "MISMATCH")
    assert all(s["id"] in ("PIR-08", "CT-08") for s in d["sensors"])
    assert {s["type"] for s in d["sensors"]} == {"OCCUPANCY", "POWER"}
    assert d["interlock"]["active"] in (True, False)

    assert client.get(f"/api/hw/spaces/{by_code['COR-2']}", params={"at": at}).json()["relay_bank"]["id"] == "RB-COR2"
    wr = client.get(f"/api/hw/spaces/{by_code['WR-1']}", params={"at": at}).json()
    assert wr["relay_bank"]["id"] == "RB-WR1"
    assert [s["type"] for s in wr["sensors"]] == ["POWER"]  # no PIR in washrooms
    assert client.get("/api/hw/spaces/999999").status_code == 404


def test_deterministic(client):
    at = LUNCH()
    for path in ("/api/hw/overview", "/api/hw/channels", "/api/hw/alarms"):
        assert client.get(path, params={"at": at}).json() == client.get(path, params={"at": at}).json()
    sid = client.get("/api/telemetry/live", params={"at": at}).json()["spaces"][0]["space_id"]
    p = f"/api/hw/spaces/{sid}"
    assert client.get(p, params={"at": at}).json() == client.get(p, params={"at": at}).json()


def test_switch_blocked_by_interlock_then_forced(client):
    at = IN_CLASS()
    room = _room_in_state(client, at, "OCCUPIED")
    sid = room["space_id"]
    detail = client.get(f"/api/hw/spaces/{sid}", params={"at": at}).json()
    assert detail["interlock"] == {"active": True, "reason": "Class in session — trip blocked"}
    assert detail["timetable_now"]["subject"]

    r = client.post(f"/api/hw/spaces/{sid}/switch", json={"state": "OFF", "at": at})
    assert r.status_code == 409
    assert r.json()["detail"] == "Class in session — trip blocked"

    r = client.post(f"/api/hw/spaces/{sid}/switch", json={"state": "OFF", "force": True, "at": at})
    assert r.status_code == 200
    task = r.json()
    assert task["user"] == "admin" and task["task"] == "Switch off all channels"
    assert task["status"] in ("OK", "WARN")


def test_switch_off_empty_room_arms_cut(client):
    at = LUNCH()
    room = _room_in_state(client, at, "LUNCH")
    sid = room["space_id"]
    r = client.post(f"/api/hw/spaces/{sid}/switch", json={"state": "OFF", "at": at})
    assert r.status_code == 200
    task = r.json()
    assert task["target"].startswith(f"{room['code']} / RB-")
    assert task["task"] == "Switch off all channels"
    assert task["result"].startswith(("OK", "No feedback"))

    d = client.get(f"/api/hw/spaces/{sid}", params={"at": at}).json()
    assert d["cut_armed"] is True
    assert d["relay_bank"]["channels"] and all(c["command"] == "OFF" for c in d["relay_bank"]["channels"])
    rows = [c for c in client.get("/api/hw/channels", params={"at": at}).json() if c["space_id"] == sid]
    assert rows and all(c["command"] == "OFF" for c in rows)
    assert all(c["rule"] == "Lunch eco" for c in rows)

    # Restore releases the cut and returns the room to the schedule (no forced-on override).
    r = client.post(f"/api/hw/spaces/{sid}/switch", json={"state": "ON", "at": at})
    assert r.status_code == 200
    assert r.json()["task"] == "Restore automatic control"
    assert r.json()["result"] == "OK · returned to schedule"
    d = client.get(f"/api/hw/spaces/{sid}", params={"at": at}).json()
    assert d["cut_armed"] is False
    assert all(c["command"] == "ON" for c in d["relay_bank"]["channels"])


def test_switch_rejects_unknown_channel(client):
    sid = client.get("/api/telemetry/live", params={"at": LUNCH()}).json()["spaces"][0]["space_id"]
    r = client.post(f"/api/hw/spaces/{sid}/switch", json={"state": "OFF", "channels": ["K9"]})
    assert r.status_code == 400


def test_alarm_ack_persists(client):
    # Late afternoon after lunch: rooms vacant/unoccupied for a while, so P2/P3 alarms exist.
    at = _at(13, 0)
    alarms = client.get("/api/hw/alarms", params={"at": at}).json()
    assert alarms, "expected at least one derived alarm"
    assert all(a["priority"] in ("P1", "P2", "P3") and not a["acked"] for a in alarms)
    key = alarms[0]["key"]
    r = client.post("/api/hw/alarms/ack", json={"key": key})
    assert r.status_code == 200 and r.json()["acked"] is True

    again = {a["key"]: a for a in client.get("/api/hw/alarms", params={"at": at}).json()}
    assert again[key]["acked"] is True and again[key]["acked_by"] == "admin" and again[key]["acked_at"]
    ov = client.get("/api/hw/overview", params={"at": at}).json()
    assert ov["alarms"]["unacked"] == ov["alarms"]["open"] - 1


def test_tasks_include_switch(client):
    at = LUNCH()
    sid = _room_in_state(client, at, "LUNCH")["space_id"]
    task = client.post(f"/api/hw/spaces/{sid}/switch", json={"state": "OFF", "at": at}).json()
    tasks = client.get("/api/hw/tasks", params={"limit": 10}).json()
    assert tasks[0]["task"] == task["task"] and tasks[0]["target"] == task["target"]
    assert tasks[0]["result"] == task["result"] and tasks[0]["user"] == "admin"
    assert {"time", "target", "task", "user", "result", "status"} <= set(tasks[0])


def test_buildings_endpoint(client):
    buildings = client.get("/api/inventory/buildings").json()
    lb = next(b for b in buildings if b["name"] == "L Block")
    f2 = next(f for f in lb["floors"] if f["level"] == 2)
    assert f2["is_pilot"] and f2["spaces_count"] == 10 and f2["connected_kw"] > 0

    created = client.post("/api/inventory/buildings", json={"code": "T", "name": "T Block"})
    assert created.status_code == 201 and created.json()["floors"] == []
    assert client.post("/api/inventory/buildings", json={"code": "T", "name": "Dup"}).status_code == 409
    fl = client.post("/api/inventory/floors", json={"level": 1, "name": "T ground", "building_id": created.json()["id"]})
    assert fl.status_code == 201 and fl.json()["building_id"] == created.json()["id"]


def test_restore_clears_override_and_force_on_sets_it(client, db):
    from app.models.models import DeviceState, Space

    at = LUNCH()
    sid = _room_in_state(client, at, "LUNCH")["space_id"]
    cid = db.get(Space, sid).classroom_id
    url = f"/api/hw/spaces/{sid}/switch"

    # Channel-level OFF creates an OVERRIDE; restoring that channel returns control to the timetable.
    assert client.post(url, json={"state": "OFF", "channels": ["K2"], "at": at}).status_code == 200
    st = db.query(DeviceState).filter(DeviceState.classroom_id == cid).one()
    assert st.source == "OVERRIDE" and st.lights_on is False
    r = client.post(url, json={"state": "ON", "channels": ["K2"], "at": at}).json()
    assert r["task"] == "Restore automatic control K2"
    db.refresh(st)
    assert st.source == "TIMETABLE" and st.lights_on and st.ac_on and st.fan_on

    # Full restore after a full cut.
    client.post(url, json={"state": "OFF", "at": at})
    assert client.post(url, json={"state": "ON", "at": at}).status_code == 200
    d = client.get(f"/api/hw/spaces/{sid}", params={"at": at}).json()
    assert d["cut_armed"] is False and all(c["command"] == "ON" for c in d["relay_bank"]["channels"])
    db.refresh(st)
    assert st.source == "TIMETABLE"

    # Explicit force_on keeps the old behaviour.
    r = client.post(url, json={"state": "ON", "mode": "force_on", "at": at}).json()
    assert r["task"] == "Force on all channels"
    db.refresh(st)
    assert st.source == "OVERRIDE" and st.ac_on and st.fan_on and st.lights_on
