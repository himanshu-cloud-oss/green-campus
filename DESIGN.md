---
name: Green Campus AI
description: A switchboard console that draws the floor as a live single-line diagram, in a navy-framed Daylight theme and a slate Dusk theme.
colors:
  # Daylight (light, default)
  panel-ground: "#F4F7FB"
  panel-raised: "#FFFFFF"
  panel-seam: "#D7DFE9"
  panel-wire: "#AEBACA"
  panel-grid: "#E6ECF3"
  panel-ink: "#13203A"
  panel-muted: "#53607A"
  chrome-rail: "#14284B"
  chrome-rail-ink: "#A9BADA"
  chrome-rail-active: "#24407A"
  chrome-rail-active-ink: "#FFFFFF"
  chrome-top: "#14284B"
  chrome-top-ink: "#FFFFFF"
  accent: "#1F5FD1"
  accent-hover: "#1A51B3"
  on-accent: "#FFFFFF"
  waste: "#A35C00"
  waste-deep: "#B8740F"
  waste-field: "#FFF1DB"
  lamp-on: "#D92D3A"
  lamp-off: "#14935A"
  chart-base: "#3E6FC0"
  chart-saved: "#B8740F"
  cat-ac: "#2563C9"
  cat-fan: "#0E8A7A"
  cat-light: "#7A4FD0"
  cat-av: "#BC3F78"
  cat-neutral: "#64708A"
  kind-class: "#2563C9"
  kind-staff: "#7A4FD0"
  kind-service: "#0E8A7A"
  # Dusk (dark)
  panel-ground-dusk: "#1B2230"
  panel-raised-dusk: "#232C3D"
  panel-seam-dusk: "#323D52"
  panel-wire-dusk: "#4A576E"
  panel-grid-dusk: "#202938"
  panel-ink-dusk: "#E8EDF4"
  panel-muted-dusk: "#A3AEC0"
  chrome-rail-dusk: "#151B26"
  chrome-rail-ink-dusk: "#8C98AB"
  chrome-rail-active-dusk: "#2A3650"
  chrome-rail-active-ink-dusk: "#E8EDF4"
  chrome-top-dusk: "#1B2230"
  chrome-top-ink-dusk: "#E8EDF4"
  accent-dusk: "#6EA8FF"
  accent-hover-dusk: "#8DBBFF"
  on-accent-dusk: "#0E1420"
  waste-dusk: "#F5A524"
  waste-deep-dusk: "#C27A12"
  waste-field-dusk: "#2E2616"
  lamp-on-dusk: "#F0646B"
  lamp-off-dusk: "#3DD68C"
  chart-base-dusk: "#5E86C2"
  chart-saved-dusk: "#C27A12"
  cat-ac-dusk: "#4D8AE8"
  cat-fan-dusk: "#1FA48F"
  cat-light-dusk: "#9475E8"
  cat-av-dusk: "#D4588F"
  cat-neutral-dusk: "#8C98AB"
  kind-class-dusk: "#6EA8FF"
  kind-staff-dusk: "#B79CFF"
  kind-service-dusk: "#9AA6B8"
typography:
  display:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "28px"
    fontWeight: 600
    fontFeature: "tnum"
  headline:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "28px"
    fontFeature: "tnum"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  body-small:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  figure:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 600
    fontFeature: "tnum"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "10.5px"
    fontWeight: 600
    lineHeight: "14px"
    letterSpacing: "0.1em"
rounded:
  tag: "2px"
  control: "3px"
  lamp: "9999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body-small}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.panel-ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.panel-ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
  button-outline-hover:
    textColor: "{colors.accent}"
  button-trip:
    backgroundColor: "transparent"
    textColor: "{colors.panel-ink}"
    rounded: "{rounded.control}"
    padding: "4px 10px"
  chip-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.panel-muted}"
    typography: "{typography.body-small}"
    rounded: "{rounded.control}"
    padding: "4px 10px"
  chip-toggle-on:
    backgroundColor: "rgba(31, 95, 209, 0.1)"
    textColor: "{colors.accent}"
  chip-category:
    backgroundColor: "rgba(37, 99, 201, 0.14)"
    textColor: "{colors.panel-ink}"
    rounded: "{rounded.lamp}"
    padding: "2px 8px"
  field:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.panel-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  tag-status:
    backgroundColor: "transparent"
    textColor: "{colors.panel-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "2px 6px"
  nav-rail-item:
    backgroundColor: "transparent"
    textColor: "{colors.chrome-rail-ink}"
    rounded: "{rounded.control}"
    size: "40px"
  nav-rail-item-active:
    backgroundColor: "{colors.chrome-rail-active}"
    textColor: "{colors.chrome-rail-active-ink}"
  top-bar:
    backgroundColor: "{colors.chrome-top}"
    textColor: "{colors.chrome-top-ink}"
    height: "40px"
  kpi-cell:
    backgroundColor: "{colors.panel-ground}"
    textColor: "{colors.panel-ink}"
    typography: "{typography.headline}"
    padding: "10px 20px"
---

# Design System: Green Campus AI

## Overview

**Creative North Star: "The Switchboard Panel"**

The console is the floor's switchboard as drawn by the electrician who wired it. The floor is a single-line diagram (transformer, meter, main breaker, 415 V bus, one feeder per room), and every other surface borrows the same vocabulary: seams instead of cards, lamps instead of badges, line weight instead of decoration. It comes in two lights, chosen from a Light/Dark switch in the top bar and remembered per browser: **Daylight** (the default), light content framed by a navy rail and top bar, and **Dusk**, a slate-dark panel for low light. Both themes are one set of roles; only the values change.

Colour is functional, never decorative, but the console is no longer monochrome. One blue accent carries action and selection; one hue per load type (AC, fans, lights, AV) follows that type everywhere it appears; room types tint the floor plan and departments tint the timetable. Amber still means one thing only: power flowing into a room the timetable says is empty. Red and green are still panel lamps.

Density is high and calm. Panels are split by 1px seams and sit flush; nothing floats, glows, or fades. Words are set in Archivo, every figure in tabular JetBrains Mono. State changes snap in two frames, the way a breaker throws, and the only continuous motion is current flowing along energised feeders. The world rejects the category default for energy dashboards: tiled KPI cards, donut charts, gradient fills and neon glow.

**Key Characteristics:**
- Two themes, one role set: Daylight (navy chrome, light content) by default, Dusk (slate) on request.
- 1px seams, flush panels; no cards.
- Blue accent for action and selection; a fixed hue per load type; amber only for waste; red/green only as panel lamps.
- Archivo for words, JetBrains Mono tabular for every figure.
- Switchgear drawn in SVG; line weight encodes kW.
- Two-step snaps for state; dash-flow for live current; nothing fades.

## Colors

Calm neutral panels in two themes, carrying four kinds of functional colour: action blue, load-type hues, the amber waste signal and the panel-lamp pair. `frontend/src/theme.ts` is the single source of every value; the frontmatter lists Daylight under plain keys and Dusk under `-dusk` keys.

### Primary
- **Action Blue** (accent / accent-dusk): what you can act on and what you have selected. Primary buttons, pressed chips and toggles, the selected room on the floor plan, focus ring, caret, text selection, the active-page marker on the rail, the booking pick and its alternatives, and the replay cursor on the load ribbon. **Action Blue Deep** (accent-hover) is its hover; **On Accent** is text on an accent fill.

### Secondary
- **Feeder Amber** (waste): power into an empty room. Feeder lines, room-tag strokes and kW readouts for wasting rooms, the waste KPI and queue total. Daylight uses a darker amber so it holds contrast as text on white.
- **Banked Amber** (waste-deep): the filled waste share under the load ribbon and the "saved" series in charts.
- **Ember Field** (waste-field): the fill of a wasting room's tag.
- **Lamp Red** (lamp-on): energised. Panel lamps on live feeders, the waste-queue row lamp, the alert dot on the rail, offline/error text and destructive actions.
- **Lamp Green** (lamp-off): tripped. Lamps on isolated feeders, the TRIPPED label and open-breaker glyph, success confirmations.

### Tertiary
- **Load-type hues** (cat-ac Cool Blue, cat-fan Teal, cat-light Violet, cat-av Rose; validated as a categorical set in both themes): one colour per load category wherever load types appear: Floor Maps category chips, Overview feeder-table dots, single-line-diagram branch tips, and Savings "By load type" bars. IT, appliances and other loads take **Neutral Load** (cat-neutral).
- **Room-type tints** (kind-class, kind-staff, kind-service): the floor-plan fill and border for classrooms/labs, staff rooms and services, with a legend beside the plan. Tints sit at 12% (Daylight) or 14% (Dusk) over the raised surface.
- **Department tints**: timetable entries tinted by department (CSE, ECE, ME, CE) drawn from the load-type set, with a legend.
- **Survey Blue** (chart-base) with **Banked Amber** (chart-saved): the validated two-series chart pair, baseline vs saved.

### Neutral
- **Ground** (panel-ground): page and content background (Daylight cool off-white, Dusk slate).
- **Raised** (panel-raised): the right-hand panel column, fields, tooltips, the command palette, selected rows, room tags. White in Daylight.
- **Seam** (panel-seam): every 1px divider, table rules, chip borders at rest.
- **Wire** (panel-wire): de-energised feeders, control and field borders, dashed ESTIMATED tags.
- **Grid** (panel-grid): the 20px drafting grid behind diagrams and floor plans.
- **Ink** (panel-ink): primary text, live feeders, the busbar, the selected room tag's stroke.
- **Muted Ink** (panel-muted): labels, units, secondary text, axis ticks, placeholders.
- **Chrome** (chrome-*): the rail and top bar. Daylight frames content in navy with pale rail icons; Dusk drops the rail one step below the slate ground and lets the top bar share the ground.

### Named Rules
**The One Source Rule.** Every colour comes from a role in `theme.ts`. Markup uses role utilities (panel-*, chrome-*, accent, waste, lamp, chart, cat-*); SVG and chart code reads hex from `useTheme()`. A hardcoded hex does not switch themes and is a defect.

**The Action Blue Rule.** Blue means "act here" or "this is selected": accent fill for the one primary action, accent border plus a 10% accent fill plus accent text for a pressed choice. Blue is never a load type's meaning in a control, never decoration, never waste.

**The One Signal Rule.** Amber means power into an empty room and nothing else. It never marks a hover, a primary action or a "warning" of another kind.

**The Panel-Lamp Rule.** Red is energised and green is tripped (Indian switchgear convention). Never use green as "good" or red as "bad" outside that meaning, except error text and destructive actions where red already reads as live danger.

**The Load-Colour Rule.** A load type has one colour everywhere it appears, and only the four controllable categories get one. Category labels stay in ink for contrast; the colour sits on the dot and a 14% tint.

## Typography

**Body Font:** Archivo (with system-ui, sans-serif), self-hosted at 400/500/600/700.
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace), self-hosted at 400/500/600, always with tabular numerals.

**Character:** A plain, slightly industrial grotesque for words against an engineering mono for every number, so the console reads like a labelled instrument rather than a report.

### Hierarchy
- **Display** (JetBrains Mono 600, 28px): the single answer on a decision surface, e.g. the picked room code on the booking result.
- **Headline** (JetBrains Mono 600, 22px / 28px): KPI strip figures and savings totals. Units follow in Archivo 12px muted.
- **Title** (Archivo or Mono 600, 15px): selected-feeder header and panel titles where a name, not a label, heads the block.
- **Body** (Archivo 400, 13px): rows, form text, explanatory lines. Secondary lines drop to 12px or 11px muted.
- **Figure** (JetBrains Mono 600, 13px): kW values and room codes in lists and tables.
- **Label** (Archivo 600, 10.5px / 14px, 0.1em, uppercase): panel headings ("Into empty rooms · 5", "Incomer kW · last 24 h"), KPI names, form labels, the SIMULATED tag.

### Named Rules
**The Tabular Rule.** Every figure (kW, kWh, °C, times, counts, room codes) is JetBrains Mono with tabular numerals. Words never are.

**The Label-Is-The-Heading Rule.** The uppercase label is the panel's actual heading and carries its live count or value. It is never stacked as an ornamental line above another heading.

## Layout

The shell is a fixed 56px icon rail on the left and a 40px sticky top bar (breadcrumb, Ctrl K palette trigger, SIMULATED tag, backend lamp, Light/Dark switch, clock), both in Chrome colours. Content sits flush against both with 1px seams; there are no gutters around panels and no page-level max width on operating surfaces.

Overview is a desk-monitor console: at xl and above, a two-column grid (fluid diagram column on Ground + 380px Raised right column) filling the viewport height below the top bar, with a full-width KPI strip on top and the load ribbon along the bottom. Below xl, everything stacks in one column and the diagram scrolls horizontally (minimum 880px) rather than shrinking past legibility. Floor Maps places the room-type legend beside the plan at xl and below it otherwise.

Spacing is tight and regular: 16px horizontal panel padding, 12px vertical, 8px between list cells, 20px inside KPI cells. Rows are separated by seams, not gaps.

## Elevation & Depth

The world is flat. Depth is tonal and one step deep: Ground < Raised, with seams doing the separating and Chrome framing the content. In Daylight the step reads as off-white to white; in Dusk as slate to lighter slate. No glows, no gradient fills, no ambient shadows on panels.

### Shadow Vocabulary
- **Modal drop** (`box-shadow: 0 24px 60px -12px rgba(0,0,0,0.7)`): the command palette (and the shared modal dialog), over a 60% black backdrop. The one surface that genuinely leaves the panel.

### Named Rules
**The Flush Panel Rule.** Panels meet at 1px seams. If a block needs separation, add a seam, not a shadow, a gap or a card.

## Shapes

Corners are nearly square: 3px on controls (buttons, fields, chips, rail items, tooltips, the theme switch), 2px on small inline tags, keycaps and legend swatches. Round forms are reserved for panel lamps, status dots and load-type dots, and the load-type category chip, which is a full pill so it reads as a tag rather than a control. Diagram geometry is drawn in SVG strokes: square breakers, circular transformer and meter, a solid 6px busbar, and feeder lines whose stroke width scales with kW (1.4px at rest, up to ~5.6px). Dashed strokes mean flow when moving, tripped when still, and "alternative" or "estimated" when used on an outline.

## Components

### Buttons
Switchgear-plain: rectangles with a hairline, labelled in sentence case, icons from a 1.6-1.8-stroke line set.
- **Shape:** near-square (3px).
- **Primary:** an Action Blue slab with On Accent text, Archivo 600; hover deepens to Action Blue Deep. One per decision: Create, Book this, Find the best slot.
- **Secondary:** Raised fill with a Seam border that turns Wire on hover.
- **Outline:** transparent with a Wire border; on hover border and text turn Action Blue. Used for secondary actions (Back to live, Release trip, Add device).
- **Trip:** the outline button with an uppercase 11px label tracked 0.1em and a power glyph, in its own column of the waste row. Disabled at 40% opacity while replaying.
- **Danger:** Lamp Red text and a 60% Lamp Red border; hover adds a 10% red fill.
- **Text / Ghost:** muted or ink text with no border; hover lifts to Seam or ink.
- **Hover / Focus:** colour change through the two-step snap (90ms, steps(2)). Focus is a 2px Action Blue outline at 2px offset everywhere.

### Chips
- **Toggle chips** (durations, room needs, spaces, report tabs, alert filters): Seam border and muted text at rest; hover shifts the border to Wire. Pressed = Action Blue border, 10% Action Blue fill, Action Blue text at 600. Segmented toggles (Live/Replay, weekdays) use the same fill and text without the border.
- **Category chips:** a full pill with a 7px load-type dot and a 14% tint of that load type; the label stays in Ink at 11.5px 600. A bare dot is used inside dense rows.

### Cards / Containers
There are no cards. Containers are panel regions bounded by seams on Ground; Raised is used for side columns, overlays and selected rows.

### Inputs / Fields
- **Style:** Raised fill, 1px Wire border, 3px corners, 13px text, 6px × 10px padding.
- **Focus:** border shifts to Action Blue; caret is Action Blue. Hover shifts border to Muted Ink.
- **Disabled:** 50% opacity.

### Navigation
A 56px Chrome rail. Items are 40px squares with 18px line icons in rail ink; hover lifts toward the active fill, active sits on the rail-active fill with bright icon and a 2px Action Blue tick at the rail's left edge. Labels appear as a Raised tooltip with the page's number key in mono; number keys jump between pages and Ctrl K opens the command palette. The top bar carries a two-segment Light/Dark switch (sun and moon line icons; the chosen segment takes a 20% chrome-ink fill).

### Status Tags
Small uppercase label-type tags with 2px corners. VERIFIED is a solid Wire outline in ink; ESTIMATED is a dashed Wire outline in muted. SIMULATED sits in the top bar the same way, because every simulated figure must be labelled.

### Single-Line Diagram (signature)
The floor's live state drawn as switchgear on a 20px drafting grid: transformer, kWh meter and main MCCB feeding a solid ink busbar, then one feeder per space with a panel lamp, a breaker glyph (closed or thrown open), per-category branch counts (AC/FN/LT/AV, on/installed) whose tips carry the load-type colour (dimmed when off), and a room tag with code, state and kW. Live feeders carry a 7/5 dash that flows at a speed proportional to kW (stilled under reduced motion). Wasting feeders, their branches and tag turn amber; tripped feeders show a green lamp, open breaker and a still dashed line. The selected tag takes a 2px ink stroke.

### Floor Plan
Rooms drawn to grid scale on the drafting grid, each filled with its room-type tint over Raised and bordered in that hue at 45%; the room-type label is set in the hue. The selected room takes a 2px Action Blue border. A legend names the three room types.

### Load Ribbon
Today's incomer kW as a 2px ink line over the waste share as a stepped Banked Amber area, mono axis ticks, no grid. Clicking any point replays the whole console to that moment; a dashed Action Blue reference line marks the moment shown.

### Room Day Strip
One time axis per bookable room (08:00 to 19:00) with hour rules in Seam: timetabled classes as Seam blocks with Wire outline, extra classes as solid Wire, the pick as a solid Action Blue block, alternatives as dashed Action Blue outlines, lunch as a diagonal hatch.

## Do's and Don'ts

### Do:
- **Do** take every colour from a `theme.ts` role so both Daylight and Dusk stay correct; SVG and charts read hex from `useTheme()`.
- **Do** separate every panel, row and region with a 1px Seam and let panels sit flush.
- **Do** set every figure in JetBrains Mono with tabular numerals, and put its unit in muted Archivo beside it.
- **Do** mark action and selection with Action Blue: accent fill for the primary action, accent border + 10% fill + accent text for a pressed choice.
- **Do** give each load type its own colour everywhere it appears (AC, Fans, Lights, AV), keep IT/appliances/other neutral, and keep category labels in ink.
- **Do** reserve Feeder Amber for power into an empty room, everywhere it appears.
- **Do** use the panel-lamp code: Lamp Red for energised, Lamp Green for tripped.
- **Do** snap state changes in two steps (90ms, steps(2, end)) and keep current flow as the only continuous motion, stilled under reduced motion.
- **Do** label simulated and estimated values in place (SIMULATED, ESTIMATED tags; "· simulated" beside timestamps).
- **Do** draw domain objects as SVG switchgear and use line weight, dash and lamp state to carry meaning.

### Don't:
- **Don't** hardcode hex values in markup, SVG or charts; they will not switch theme.
- **Don't** use cards, glows, gradient fills or decorative shadows; the modal drop is the only shadow. Drawn patterns (the 20px drafting grid, the lunch hatch) are linework, not gradients, and stay allowed.
- **Don't** tile KPIs as cards or show proportions as donut charts; KPIs live in a seamed strip.
- **Don't** use amber, red or green as general-purpose accent, success or warning colours, and don't use Action Blue for anything but action and selection.
- **Don't** put category label text in the category colour; colour sits on the dot and the tint.
- **Don't** fade or ease state changes; nothing fades in this world.
- **Don't** round controls beyond 3px; only lamps, status and load-type dots are circles and only category chips are pills.
- **Don't** stack an uppercase label above a heading as an eyebrow; the label is the heading.
