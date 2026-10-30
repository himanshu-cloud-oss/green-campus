---
version: 1
slug: "frontend-src-pages-overview-tsx"
primary_target: "frontend/src/pages/Overview.tsx"
related_targets: ["frontend/src/pages/FloorMaps.tsx","frontend/src/pages/ExtraClassBooking.tsx","frontend/src/pages/SavingsCalculator.tsx"]
---

# Green Campus console — operations surfaces

Scope: the admin console (Overview, Floor Maps, Extra-class booking, Savings model, plus the existing Classroom/Timetable/Alerts pages inside the same shell). Mode: Operate. Audience: the energy/facilities admin at a server-room desk monitor, glancing all day and cutting waste themselves. Constraints: all live power is simulated and must be labelled; device specs are estimates.

## Direction contract

THESIS: The floor is shown the way its electrician sees it, a live single-line diagram: transformer, meter, main breaker, busbar, one feeder per room, line weight proportional to kW. It refuses the category default of tiled KPI cards and donut charts.

OWN-WORLD: Graphite night panel. Ground #0E1116, panels split by 1px seams (#222833), neutral ink #D9DEE5, muted #7D8694. Amber #F5A524 is reserved for power flowing into an empty room; Indian panel-lamp code for state (red #E5484D energised, green #3DD68C tripped). Archivo for words, JetBrains Mono for every figure, tabular. Switchgear symbols drawn in SVG; no cards, no glow, no gradients.

STORY: The admin sees total load and waste at a glance, finds which feeders are amber, trips them from the waste queue, and moves on. Inventory edits, bookings and savings use the same diagrammatic language.

FIRST VIEWPORT: 56px icon rail left; 60px KPI strip (incomer kW, waste kW, today kWh, ambient, devices on, floor id + timestamp + "simulated"); the single-line diagram fills the centre with per-feeder AC/FN/LT/AV branch counts and room tags; a 380px right column (widened from 340px so each waste row fits a one-line device summary, its kW and an isolated outlined TRIP button without truncation) holding the waste queue, then a "Next" timeline measured from the shown moment, then the selected-feeder detail; today's incomer kW ribbon along the bottom, clickable to replay any moment.

FORM: Single-Line Diagram, night panel rendition; position 1 on my ordered list (user-steered after a re-roll). seed:950e4e2146f76e8f. Signature interaction: current flow — energised feeders carry a dash pattern that moves at a speed proportional to kW (still under reduced motion); clicking the ribbon scrubs the whole diagram to that moment. State changes snap; no fades.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
