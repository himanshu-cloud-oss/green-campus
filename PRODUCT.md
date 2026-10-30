# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
The facilities/energy admin in Manav Rachna University's server room. They keep the console open on a desk monitor all day and glance at it between other tasks. When it flags waste (e.g. lights or AC running in an empty LS-09), they cut that load from the console themselves. They also handle requests for extra, unscheduled classes and maintain the record of what equipment is installed where.

## Product Purpose
Green Campus AI reduces the electricity use and carbon footprint of L Block, starting with a pilot on the 2nd floor. It combines the timetable, extra-class bookings and a room-by-room device inventory to show where power is being spent when nobody needs it, lets the admin switch that load off, books extra classes into the room and slot that cost the least energy, and models the annual savings of automating it.

## Positioning
It is timetable-aware: it knows which rooms *should* be occupied, so it can call an empty-but-powered room waste rather than just showing a meter reading. Room allocation for extra classes is chosen by energy cost (back-to-back use, room size, after-hours common-area load), not just availability.

## Operating Context
- Pilot scope: L Block, 2nd floor. "LS" = L block, Second floor. Bookable classrooms: LS-03, LS-04, LS-08, LS-09, LS-10. LS-04 and LS-08 seat ~40; the others ~60 (estimates). LS-05 is the floor's staff room (not bookable). Also a corridor, two washrooms, stairs/lift lobby.
- Timetable: periods 1–10 from 08:10 to 16:30, lunch 11:30–12:20, Mon–Fri.
- Daily driver on a desk monitor; Overview is the home screen.
- Who may request or approve extra classes is not decided yet; the admin performs bookings for now.

## Capabilities and Constraints
- No metering or switching hardware yet. Live power is simulated from the device inventory, timetable, bookings, season/time-of-day temperature and a behaviour model; every simulated figure must be labelled as such.
- Device power ratings are estimates until hardware specs arrive; each device carries an ESTIMATED/VERIFIED flag. Future hardware will report how many devices are on in each room.
- Tariff: most likely DHBVN commercial (NDS); exact rates are placeholders until copied from a bill.
- Stack: React 18 + TypeScript + Vite + Tailwind (frontend), FastAPI + SQLite (backend).

## Brand Commitments
- The product name "Green Campus AI" stays. No colours or logo are binding.

## Evidence on Hand
- Real campus-wide monthly billing data, Jul 2024–Jun 2025 (grid, diesel generator, solar), in `backend/scripts/seed_data.py`. It is campus-level: it cannot be presented as floor or room measurements.
- No floor-level metering, occupancy sensors, or verified device specs exist yet. Never present simulated values as measured.

## Product Principles
1. Waste is defined against the timetable: an empty room drawing power is the headline signal.
2. Act where you see it: anything flagged can be dealt with from the same view.
3. Honest numbers: simulated, estimated and real (billing) data are always distinguishable.
4. Inventory is the single source of truth for loads; every calculation derives from it.
5. Built for all-day glancing: dense, calm, and readable without hunting.
