# Green Campus AI — Frontend

Production-grade React + TypeScript + Tailwind CSS dashboard for **Manav Rachna University (MRU)** Building Energy Management System (BEMS).

## Features

- **Classroom Monitoring:** Real-time occupancy tracking, HVAC / Fan / Light controls, smart cutoff simulations, and extra-class reservation modal.
- **Academic Timetable Matrix:** Full interactive schedule synchronized with campus ERP and automated pre-cooling schedules.
- **Energy Analytics:** 12-month historical consumption breakdown across Grid Import, DG Backup, and Rooftop Solar with stacked bars, trend lines, donut chart, and MoM table.
- **AI Predictive Forecasting:** Machine learning regression models (Random Forest, Ridge, Seasonal Naive) with uncertainty bounds, statistical anomaly detection, and data sufficiency disclaimers.
- **Server Room Alert Console:** Live 1-second interval countdown timers for empty classroom cutoffs, incident severity badges, and bulk resolution.
- **Savings & What-If Modeler:** Real-time mathematical modeling of avoided kilowatt-hours, financial savings in INR, and carbon abatement with campus-scale sliders.
- **Institutional Compliance Reports:** Full audit trail ledger with pagination, print stylesheets, and CSV export.

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Bundler:** Vite 5
- **Styling:** Tailwind CSS 3 (Deep Navy `#0a0f1e`, Near Black `#050a12`, Cyan & Emerald neon accents)
- **Visualization:** Recharts
- **Icons:** Lucide React
- **Routing:** React Router v6
- **HTTP Client:** Axios (with mock/fallback mode when backend is offline)

## Getting Started

```bash
# Navigate to the frontend directory
cd "C:\Users\Sandeep Kumar\OneDrive\Documents\Desktop\green campus\greencampus-ai\frontend"

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The application runs on `http://localhost:5173` and proxies `/api` calls to `http://localhost:8000`.
