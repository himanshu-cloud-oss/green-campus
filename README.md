# Green Campus AI

An energy console for **L Block, Manav Rachna University (Faridabad)**. It shows where the building spends electricity when nobody needs it, lets the admin switch that load off, books extra classes into the room that costs the least to run, and models what automating all of this would save each year.

The pilot runs on **L Block's 2nd floor**. The console is the admin server room's daily screen.

> **Prototype status.** There is no metering or relay hardware yet. Live power, device states and "trips" are **simulated** and labelled as such everywhere in the app. Device ratings are typical values marked **ESTIMATED** until real specs are entered. The only real data is the campus electricity bill (Jul 2024 – Jun 2025), which is campus-wide and is never shown as floor or room measurement.

---

## The pilot floor

| Space | Type | Seats | Bookable |
|---|---|---:|:---:|
| LS-03 | Classroom | 60 | ✓ |
| LS-04 | Classroom | 40 | ✓ |
| LS-08 | Classroom | 40 | ✓ |
| LS-09 | Classroom | 60 | ✓ |
| LS-10 | Classroom | 60 | ✓ |
| LS-05 | Staff room | 12 | |
| COR-2, WR-1, WR-2, STR-2 | Corridor, washrooms, stairs | — | |

"LS" = **L** block, **S**econd floor. Seat counts are estimates. Rooms, devices and the floor layout are all editable in **Floor maps**.

---

## What the console does

| Page | Key | What it's for |
|---|:---:|---|
| **Floor panel** `/` | `1` | The floor drawn as a live **single-line diagram**: transformer → meter → main breaker → busbar → one feeder per room. Line weight follows kW. **Amber** feeders are powering an empty room, and **TRIP** switches that room's controllable loads off while it stays empty today. Panel lamps follow the Indian convention: red = energised, green = tripped. Shows the next period changes and extra classes. Click the 24 h chart to replay any moment. |
| **Classrooms** `/classrooms` | `2` | Per-room status from the timetable and bookings, with simulated device states and room switches. |
| **Book extra class** `/book` | `3` | Describe the class (students, date window, duration, needs such as a smartboard or AC). The system finds every free room and slot, **books the lowest-energy one** and shows ranked alternatives on a rooms × time strip. |
| **Timetable** `/timetable` | `4` | Weekly period grid per room. |
| **Floor maps** `/floors` | `5` | Inventory editor: floors → rooms and common areas → devices (quantity, rated W, standby W, switchable, ESTIMATED/VERIFIED). Includes a queue of ratings still to verify, largest load first. **Every load figure in the app comes from here.** |
| **Savings model** `/savings` | `6` | A year of baseline vs automated energy, built from the real timetable, the inventory and each month's real grid/diesel mix. Settings cover the automation rules, AC setpoint and BLDC fan upgrades, the academic calendar, DHBVN commercial tariff, emissions and hardware cost, with payback. |
| **Alerts**, **Reports**, **Settings** | `7` `8` `9` | Events, CSV/PDF exports, tariff and model settings. |

`Ctrl K` opens a command palette: jump to a room (`LS-08`), a page, or "trip" a wasting feeder.

### How the simulated data is made

Nothing is hardcoded. `backend/app/services/telemetry_service.py` works out each device's state from:

- **the inventory:** what is installed in each space and its rating;
- **the timetable and bookings:** who should be in the room, including about 7% of scheduled periods where the class doesn't happen;
- **Faridabad's temperature by month and hour:** AC only runs when it's hot, fans when it's warm;
- **behaviour:** lights, fans and AC sometimes left on in empty rooms, at lunch and after hours;
- **admin trips and switch overrides.**

Randomness is seeded by device and time slot, so the same moment always gives the same reading. Replacing the simulator with real meters later means swapping this one module. The data model already has a `sensor_id` per device.

### How automatic booking picks a room

`backend/app/services/booking_service.py` scores every free room and slot that fits the students and equipment by modelled energy:

1. the room's expected draw while in use (smaller rooms draw less);
2. pre-cooling, which is skipped when a class ends in that room right before;
3. corridor and washroom loads that stay on if the class runs past floor hours.

Earlier slots and tighter fits break ties.

---

## Architecture

```
frontend/   React 18 + TypeScript + Vite + Tailwind + Recharts      :5173
   │  REST (axios)
backend/    FastAPI + SQLAlchemy 2 + Pydantic v2 + scikit-learn     :8000
   │
   └── greencampus.db  (SQLite: timetable, bookings, inventory, bill data, audit log)
```

The SQLite database is committed, so a fresh clone runs with the pilot data already in place. On startup the backend creates any missing tables and seeds missing data without overwriting your edits.

---

## Setup

Requirements: **Python 3.10+**, **Node.js 18+**.

### Backend

```bash
cd backend
python -m venv venv
# Windows:  .\venv\Scripts\Activate.ps1
# macOS/Linux:  source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Start the backend first. If it's offline, pages say so rather than showing invented numbers.

### Configuration

Optional `backend/.env` (see `backend/.env.example`):

```env
DATABASE_URL=sqlite:///./greencampus.db
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

Set the tariff, emission factors and other model values in the **Savings model** and **Settings** pages. The tariff defaults are placeholders: copy the real rates from a DHBVN bill.

---

## Deploying to Vercel

The repo deploys as **one Vercel project**. The React build is served as static files, and the FastAPI backend runs as a Python serverless function at `/api/*`. Everything is on the same domain, so no CORS setup or API URL is needed.

| File | Purpose |
|---|---|
| `vercel.json` | Builds `frontend/`, serves `frontend/dist`, routes `/api/*` (plus `/docs`) to the Python function, and falls back to `index.html` for app routes. |
| `api/index.py` | The serverless entrypoint; it imports `app` from `backend/app/main.py`. |
| `requirements.txt` (repo root) | Python packages for Vercel. The ML libraries are left out (see limits). `backend/requirements.txt` stays the full local set. |
| `.vercelignore` | Keeps node_modules, caches, tests and design-review files out of the upload. |

**Steps**

1. On vercel.com, go to **Add New → Project** and import `himanshu-cloud-oss/green-campus`.
2. Leave **Root Directory** as the repo root and **Framework Preset** as *Other*. `vercel.json` sets the build commands.
3. Choose the branch to deploy (e.g. `feat/pilot-floor-console` for a preview) and press **Deploy**.

No environment variables are required. Optional ones:

| Variable | Default | Use |
|---|---|---|
| `APP_TIMEZONE` | `Asia/Kolkata` | Campus clock. Vercel servers run on UTC, and the timetable and simulator use this instead. |
| `DATABASE_URL` | bundled SQLite | Point at a hosted database to keep data between deploys (see limits). |

**Limits on Vercel (read before demoing)**

- **Data resets.** Vercel's filesystem is read-only, so each instance copies the committed `backend/greencampus.db` into `/tmp` and works on that copy. Bookings, trips and inventory edits work during a session but are lost when the instance is recycled or redeployed. For persistent data, move to a hosted Postgres (e.g. Neon or Vercel Postgres): set `DATABASE_URL` and add a driver such as `psycopg[binary]` to the root `requirements.txt`.
- **No forecasting.** numpy, pandas and scikit-learn together exceed Vercel's function size limit, so `/api/forecast` returns 503 there. No page in the navigation uses it, and it works locally.
- **Cold starts.** The first request after a quiet spell takes a few seconds, and the monthly projection takes 2–3 s per cold instance because the simulator recomputes the month.

To test the production setup locally with the Vercel CLI (`npm i -g vercel`), run `vercel dev` from the repo root.

---

## Tests

```bash
cd backend
pytest tests -q
```

The tests cover energy data reconciliation, timetable lookup, bookings and conflicts, and savings maths. They also cover the pilot features: inventory CRUD, telemetry determinism and seasonality, auto-booking capacity and needs rules, and savings-model reconciliation.

```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## API overview

| Area | Endpoints |
|---|---|
| Inventory | `GET /api/inventory/floors` · `GET /api/inventory/device-types` · `POST/PATCH/DELETE` floors, `/spaces/{id}`, `/assets/{id}` |
| Telemetry (simulated) | `GET /api/telemetry/live?at=` · `/series` · `/daily` · `/month` · `/assumptions` · `POST/DELETE /api/telemetry/cut/{space_id}` |
| Bookings | `POST /api/bookings/auto` (auto-pick and book) · `POST/GET/PATCH/DELETE /api/bookings` |
| Savings | `POST /api/savings/model` · `GET /api/savings/model/defaults` · legacy `/estimate`, `/whatif` |
| Classrooms | `GET /api/classrooms` · `/{id}/status` · `POST /{id}/device-state` |
| Timetable | `GET /api/timetable?weekday=MON` · `/periods` · `/current` |
| Energy (real bill) | `GET /api/energy/monthly` · `/summary` · `/export` |
| Other | `/api/alerts`, `/api/simulations`, `/api/forecast`, `/api/audit-log`, `/api/settings`, `/api/health` |

---

## Project structure

```
backend/
  app/
    api/            route handlers (inventory, telemetry, bookings, savings, …)
    models/         SQLAlchemy models (Building → Floor → Space → Asset, timetable, bookings, …)
    services/       telemetry_service (simulator), booking_service (auto-booking),
                    savings_model (annual model), inventory_service (device catalogue, seed)
    ml/             forecasting and anomaly detection (experimental)
  scripts/seed_data.py
  tests/
  greencampus.db
frontend/
  src/
    pages/          Overview, FloorMaps, ExtraClassBooking, SavingsCalculator, …
    components/
      panel/        SingleLineDiagram, LoadRibbon, RoomDayStrip
      layout/       icon rail, top bar, command palette
    services/       api.ts, pilot.ts (typed client for the pilot endpoints)
PRODUCT.md          product context: users, purpose, constraints
DESIGN.md           the "Night panel" design system (tokens, rules)
.claude/skills/     impeccable design skill used to build the UI
```

---

## Real energy data (campus-wide)

| Month | Grid (kWh) | Diesel generator (kWh) | Solar (kWh) | Total (kWh) |
|---|---:|---:|---:|---:|
| Jul 2024 | 131,280 | 18,816 | 7,185 | 157,281 |
| Aug 2024 | 139,960 | 10,396 | 7,045 | 157,401 |
| Sep 2024 | 133,060 | 6,657 | 6,710 | 146,427 |
| Oct 2024 | 113,860 | 1,570 | 8,061 | 123,491 |
| Nov 2024 | 39,780 | 2,221 | 5,662 | 47,663 |
| Dec 2024 | 40,080 | 0 | 5,974 | 46,054 |
| Jan 2025 | 40,000 | 203 | 6,260 | 46,463 |
| Feb 2025 | 39,340 | 176 | 6,357 | 45,873 |
| Mar 2025 | 48,420 | 182 | 10,343 | 58,945 |
| Apr 2025 | 147,600 | 6,238 | 9,433 | 163,271 |
| May 2025 | 126,020 | 4,885 | 8,942 | 139,847 |
| Jun 2025 | 209,100 | 4,007 | 7,596 | 220,703 |

The savings model uses each month's grid/diesel split to cost savings and CO₂. Solar output isn't reduced by saving, so it carries no credit.

---

## Next steps

- Replace estimated device ratings with nameplate/datasheet values (**Floor maps → Ratings to verify**).
- Copy the actual DHBVN commercial tariff into the Savings model.
- Install metering and relays, then feed real on/off counts per room into the telemetry module in place of the simulator.
- Decide who may request extra classes and whether bookings need approval.

---

Developed for academic and demonstration purposes for Manav Rachna University. Not for production use without real sensor integration, security hardening and institutional approval.
