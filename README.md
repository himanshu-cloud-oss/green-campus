# 🌿 Green Campus AI — Manav Rachna University

> **Intelligent Energy Management Platform** for MRU, Sector 43, Faridabad, Haryana, India.
> A full-stack prototype demonstrating timetable-aware classroom management, energy analytics, estimated savings, simulated automation, and a foundation for genuine AI-based energy optimization.

---

## ⚠️ Prototype Disclaimer

This is a **demonstration prototype** operating in **Demo Mode**. All device states (AC, fan, lighting) are **simulated** — no physical hardware is controlled. Classroom occupancy is **timetable-based** (scheduled, not sensor-confirmed). Historical energy data is real campus-level data (Jul 2024–Jun 2025) and must not be interpreted as individual classroom measurements. ML forecasting is clearly labeled as experimental.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture)
2. [Prerequisites](#prerequisites)
3. [Installation — Windows](#installation-windows)
4. [Installation — Linux/macOS](#installation-linux)
5. [Running the Application](#running)
6. [Running Tests](#testing)
7. [Project Structure](#structure)
8. [API Documentation](#api)
9. [Database Schema](#database)
10. [Configuration](#configuration)

---

## 🏗️ Architecture Overview <a name="architecture"></a>

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Port 5173)                │
│         React + TypeScript + Tailwind + Recharts     │
│   Sidebar Navigation │ Live Clock │ Dark Glass UI    │
└────────────────────────┬────────────────────────────┘
                         │ REST API (Axios)
                         ▼
┌─────────────────────────────────────────────────────┐
│              FastAPI Backend (Port 8000)             │
│     SQLAlchemy ORM │ Pydantic Validation │ CORS      │
│  /api/classrooms │ /api/energy │ /api/bookings ...   │
└────────────────────────┬────────────────────────────┘
                         │ SQLAlchemy
                         ▼
┌─────────────────────────────────────────────────────┐
│              SQLite Database (greencampus.db)        │
│   12 months historical energy │ 5 classrooms        │
│   Timetable │ Bookings │ Simulations │ Audit Log     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              ML/Analytics Module (Scikit-learn)      │
│   Energy Forecasting │ Anomaly Detection            │
│   Timetable-Aware Recommendations                   │
└─────────────────────────────────────────────────────┘
```

**Tech Stack:**
| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Backend | Python FastAPI |
| Database | SQLite + SQLAlchemy 2.0 |
| Validation | Pydantic v2 |
| Data Processing | Pandas, NumPy |
| ML | Scikit-learn |
| Tests | Pytest |

---

## 🔧 Prerequisites <a name="prerequisites"></a>

| Requirement | Version | Check |
|---|---|---|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Python | 3.10+ | `python --version` |
| pip | 23+ | `pip --version` |

---

## 🪟 Installation — Windows <a name="installation-windows"></a>

### Step 1: Clone / Navigate to project

```powershell
cd "c:\Users\Sandeep Kumar\OneDrive\Documents\Desktop\green campus\greencampus-ai"
```

### Step 2: Backend Setup

```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If execution policy blocks activation:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env

# Initialize database and seed data
python scripts/seed_data.py
```

### Step 3: Frontend Setup

```powershell
# Open a new terminal
cd "c:\Users\Sandeep Kumar\OneDrive\Documents\Desktop\green campus\greencampus-ai\frontend"

# Install dependencies
npm install
```

---

## 🐧 Installation — Linux/macOS <a name="installation-linux"></a>

### Step 1: Backend Setup

```bash
cd greencampus-ai/backend

# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Seed database
python scripts/seed_data.py
```

### Step 2: Frontend Setup

```bash
cd ../frontend
npm install
```

---

## ▶️ Running the Application <a name="running"></a>

### Start Backend (Terminal 1)

**Windows:**
```powershell
cd "c:\Users\Sandeep Kumar\OneDrive\Documents\Desktop\green campus\greencampus-ai\backend"
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

**Linux/macOS:**
```bash
cd greencampus-ai/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Backend will be available at: **http://localhost:8000**
API docs (Swagger): **http://localhost:8000/docs**
API docs (ReDoc): **http://localhost:8000/redoc**

### Start Frontend (Terminal 2)

**Windows:**
```powershell
cd "c:\Users\Sandeep Kumar\OneDrive\Documents\Desktop\green campus\greencampus-ai\frontend"
npm run dev
```

**Linux/macOS:**
```bash
cd greencampus-ai/frontend
npm run dev
```

Frontend will be available at: **http://localhost:5173**

> **Note:** Start the backend first so the frontend can connect on startup.

---

## 🧪 Running Tests <a name="testing"></a>

### Backend Tests

```powershell
# Windows
cd backend
.\venv\Scripts\Activate.ps1
pytest tests/ -v

# With coverage
pytest tests/ -v --tb=short
```

```bash
# Linux/macOS
cd backend
source venv/bin/activate
pytest tests/ -v
```

**Test Coverage:**
- `test_energy.py` — Historical data import, total reconciliation, MoM changes
- `test_timetable.py` — Period lookup, lunch detection, boundary cases
- `test_bookings.py` — Create booking, conflict detection, cancellation
- `test_savings.py` — Savings formulae, CO₂ calculation, no double-counting

### Frontend Lint

```powershell
cd frontend
npm run lint
```

---

## 📁 Project Structure <a name="structure"></a>

```
greencampus-ai/
├── README.md
├── .env.example                 # Root env template
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx              # Router setup
│       ├── main.tsx             # Entry point
│       ├── index.css            # Global styles
│       ├── components/
│       │   ├── layout/          # Sidebar, TopNav, Layout
│       │   ├── classroom/       # ClassroomCard, ExtraClassModal, etc.
│       │   ├── charts/          # Recharts wrappers
│       │   ├── timetable/       # Grid, Period/Weekday selectors
│       │   ├── alerts/          # AlertPanel, CountdownTimer
│       │   ├── savings/         # Calculator, WhatIf
│       │   ├── reports/         # Reports, ExportButtons
│       │   ├── settings/        # SettingsPanel
│       │   └── ui/              # Card, Badge, Button, Modal, etc.
│       ├── pages/               # Route-level page components
│       ├── hooks/               # Custom React hooks
│       ├── services/            # api.ts — API client
│       ├── types/               # TypeScript interfaces
│       └── utils/               # timeUtils, energyUtils, formatters
└── backend/
    ├── requirements.txt
    ├── .env.example
    ├── app/
    │   ├── main.py              # FastAPI app, startup, CORS
    │   ├── config.py            # Settings from env
    │   ├── database.py          # SQLAlchemy engine/session
    │   ├── api/                 # Route handlers
    │   │   ├── classrooms.py
    │   │   ├── timetable.py
    │   │   ├── energy.py
    │   │   ├── bookings.py
    │   │   ├── simulations.py
    │   │   ├── alerts.py
    │   │   ├── savings.py
    │   │   ├── forecast.py
    │   │   └── audit.py
    │   ├── models/              # SQLAlchemy ORM models
    │   ├── schemas/             # Pydantic request/response schemas
    │   ├── services/            # Business logic
    │   │   ├── timetable_service.py
    │   │   ├── energy_service.py
    │   │   ├── savings_service.py
    │   │   └── simulation_service.py
    │   └── ml/                  # ML modules
    │       ├── forecasting.py
    │       └── anomaly_detection.py
    ├── scripts/
    │   └── seed_data.py         # Database initialization
    └── tests/
        ├── test_energy.py
        ├── test_timetable.py
        ├── test_bookings.py
        └── test_savings.py
```

---

## 🔌 API Documentation <a name="api"></a>

Full Swagger docs available at **http://localhost:8000/docs** after starting backend.

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | System health check |
| GET | `/api/classrooms` | List all 5 classrooms |
| GET | `/api/classrooms/{id}/status` | Classroom status with timetable |
| GET | `/api/timetable` | Timetable entries |
| GET | `/api/timetable/current` | Current period for all classrooms |
| GET | `/api/timetable/periods` | Period time definitions |
| GET | `/api/energy/monthly` | 12 months historical data |
| GET | `/api/energy/summary` | Peak, lowest, totals, MoM changes |
| GET | `/api/energy/export` | CSV download |
| POST | `/api/bookings` | Create extra-class booking |
| GET | `/api/bookings` | List bookings (filterable) |
| PATCH | `/api/bookings/{id}` | Update booking |
| DELETE | `/api/bookings/{id}` | Cancel booking |
| POST | `/api/simulations/no-show` | Trigger no-show simulation |
| GET | `/api/simulations` | List simulations |
| PATCH | `/api/simulations/{id}/cancel` | Cancel simulation |
| GET | `/api/alerts` | List alerts |
| PATCH | `/api/alerts/{id}` | Acknowledge/resolve alert |
| GET | `/api/savings/estimate` | Estimate savings |
| POST | `/api/savings/calculate` | Full savings calculation |
| POST | `/api/forecast` | Run ML forecast |
| GET | `/api/forecast/anomalies` | Anomaly detection results |
| GET | `/api/forecast/recommendations` | AI recommendations |
| GET | `/api/audit-log` | Audit log entries |
| GET | `/api/settings` | All settings |
| PATCH | `/api/settings/{key}` | Update setting |

---

## 🗄️ Database Schema <a name="database"></a>

Key tables and relationships:

```
classrooms (1) ──── (N) timetable_entries
classrooms (1) ──── (N) extra_class_bookings
classrooms (1) ──── (1) device_states
classrooms (1) ──── (N) simulation_events
classrooms (1) ──── (N) alerts (optional FK)
monthly_energy_records (campus-level, no classroom FK)
settings (key-value store)
audit_log (all mutation events)
```

---

## ⚙️ Configuration <a name="configuration"></a>

Edit `backend/.env`:

```env
DATABASE_URL=sqlite:///./greencampus.db
DEMO_MODE=true
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
APP_VERSION=1.0.0
NO_SHOW_COUNTDOWN_SECONDS=180
```

### Configurable Settings (via Settings page or `/api/settings`):

| Key | Default | Description |
|---|---|---|
| `tariff_per_kwh` | 8.50 | Electricity tariff (₹/kWh) |
| `grid_emission_factor` | 0.82 | CO₂ factor (kg CO₂/kWh) |
| `classroom_load_kw` | 2.4 | Combined classroom load (kW) |
| `ac_load_kw` | 1.5 | AC unit load (kW) |
| `fan_load_kw` | 0.075 | Fan load — 2 fans (kW) |
| `lights_load_kw` | 0.2 | Lighting load (kW) |
| `demo_mode` | true | Demo mode toggle |
| `no_show_countdown_seconds` | 180 | No-show countdown duration |

---

## 📊 Historical Energy Data

Campus-level energy consumption (Jul 2024–Jun 2025):

| Month | Grid (kWh) | Generator (kWh) | Solar (kWh) | Total (kWh) |
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

> ⚠️ **Data Rule:** These values represent **campus-level** consumption totals. They must not be interpreted as individual classroom or floor measurements.

---

## 🌱 Savings Calculation Methodology

### Prototype Benchmarks (Configurable)
- Assumed classroom combined load: **2.4 kW**
- Electricity tariff: **₹8.50/kWh**
- Grid emission factor: **0.82 kg CO₂/kWh**

### Formulae

**Energy Saved (kWh):**
```
avoidable_load_kW × avoidable_hours
```

**Cost Saved (₹):**
```
grid_energy_saved_kWh × tariff_per_kWh
```

**CO₂ Avoided (kg):**
```
grid_energy_saved_kWh × grid_emission_factor
```

> **Note:** CO₂ factor applies to grid electricity only. Generator and solar sources have different emission profiles not yet modeled.

---

## 🤖 AI/ML Module

The AI module is clearly labeled **Experimental**.

| Feature | Method | Status |
|---|---|---|
| Energy Forecasting | Seasonal Naive / Linear Regression / Random Forest | Experimental |
| Anomaly Detection | IQR / Z-score on monthly totals | Experimental |
| Recommendations | Rule-based heuristics | Heuristic (not ML) |

> **Data Sufficiency:** The 12 available monthly records are at the minimum threshold for simple models. Complex models require more data. The system honestly reports `data_sufficient: false` when data is inadequate.

---

## 🧑‍💻 Development Notes

- **Timetable occupancy** = scheduled, not sensor-confirmed physical presence
- **Device states** = simulated, not real hardware control
- **No-show simulation** = demonstration workflow, not real sensor detection
- All seeded timetable data is labeled as `demo_data: true`
- The frontend falls back to hardcoded historical data if the API is unavailable
- Backend health is polled every 30 seconds; TopNav shows connection status

---

## 📝 License

This prototype is developed for academic and demonstration purposes for Manav Rachna University. Not for production deployment without proper sensor integration, security hardening, and institutional authorization.
