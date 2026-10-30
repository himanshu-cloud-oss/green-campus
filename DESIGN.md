---
name: Green Campus AI
description: A graphite night-panel console that draws the floor as a live single-line diagram.
colors:
  panel-ground: "#0E1116"
  panel-rail: "#0A0C10"
  panel-raised: "#141920"
  panel-seam: "#222833"
  panel-wire: "#3A414D"
  panel-grid: "#151A21"
  panel-ink: "#D9DEE5"
  panel-muted: "#7D8694"
  waste: "#F5A524"
  waste-deep: "#C27A12"
  waste-field: "#191307"
  lamp-on: "#E5484D"
  lamp-off: "#3DD68C"
  chart-base: "#5E86C2"
  chart-saved: "#C27A12"
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
    backgroundColor: "{colors.panel-ink}"
    textColor: "{colors.panel-ground}"
    typography: "{typography.body-small}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "#FFFFFF"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.panel-ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
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
    backgroundColor: "{colors.panel-seam}"
    textColor: "{colors.panel-ink}"
  field:
    backgroundColor: "{colors.panel-ground}"
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
    textColor: "{colors.panel-muted}"
    rounded: "{rounded.control}"
    size: "40px"
  nav-rail-item-active:
    backgroundColor: "{colors.panel-seam}"
    textColor: "{colors.panel-ink}"
  kpi-cell:
    backgroundColor: "{colors.panel-ground}"
    textColor: "{colors.panel-ink}"
    typography: "{typography.headline}"
    padding: "10px 20px"
---

# Design System: Green Campus AI

## Overview

**Creative North Star: "The Night Panel"**

The console is a switchboard seen at night by the electrician who wired it. The floor is drawn as a single-line diagram (transformer, meter, main breaker, 415 V bus, one feeder per room), and every other surface borrows the same vocabulary: seams instead of cards, lamps instead of badges, line weight instead of decoration. Graphite ground, neutral ink, and exactly one warm signal, amber, which means one thing only: power flowing into a room the timetable says is empty.

Density is high and calm. Panels are split by 1px seams and sit flush against each other; nothing floats, glows, or fades. Words are set in Archivo, every figure in tabular JetBrains Mono, so columns of kW line up under a glance. State changes snap in two frames, the way a breaker throws, and the only continuous motion in the product is current flowing along energised feeders.

The world rejects the category default for energy dashboards: tiled KPI cards, donut charts, gradient fills and neon glow. Those devices were explicitly refused in the direction contract and the shipped surfaces carry none of them.

**Key Characteristics:**
- Graphite ground, 1px seams, flush panels; no cards.
- Amber is reserved for waste; red/green follow the Indian panel-lamp code.
- Archivo for words, JetBrains Mono tabular for every figure.
- Switchgear drawn in SVG; line weight encodes kW.
- Two-step snaps for state; dash-flow for live current; nothing fades.

## Colors

A near-monochrome graphite panel whose only chroma is functional signal: amber waste, two lamp colours, and a validated two-hue chart pair.

### Primary
- **Feeder Amber** (waste): power into an empty room. Feeder lines, room-tag strokes and kW readouts for wasting rooms, the waste KPI, the waste queue total, and Trip commands in the palette.
- **Banked Amber** (waste-deep): the filled waste share under the load ribbon and the "saved" series in charts. Same meaning as Feeder Amber at a lower luminance so it can sit as an area.
- **Ember Field** (waste-field): the fill of a wasting room's tag, a barely-warm ground that lets the amber stroke read as an enclosure.

### Secondary
- **Lamp Red** (lamp-on): energised. Panel lamps on live feeders, the waste-queue row lamp, alert badge on the rail, offline/backend error text and destructive hover.
- **Lamp Green** (lamp-off): tripped. Panel lamps on isolated feeders, the TRIPPED label and open-breaker glyph, and success confirmations.

### Tertiary
- **Survey Blue** (chart-base): the baseline series in comparison charts only. Validated against the ground with Banked Amber as its pair.

### Neutral
- **Night Ground** (panel-ground): page and field background.
- **Rail Black** (panel-rail): the 56px icon rail, one step darker than the ground.
- **Raised Graphite** (panel-raised): tooltips, the command palette, selected rows, room tags. The only lift the world allows.
- **Seam** (panel-seam): every 1px divider between panels, table rules, active rail item and pressed chips.
- **Wire** (panel-wire): de-energised feeders, control borders at rest, hover borders, dashed ESTIMATED tags.
- **Grid** (panel-grid): the 20px drafting grid behind diagrams and floor plans.
- **Ink** (panel-ink): primary text, live feeders, the busbar, the primary button fill, focus outline, caret and selected outlines.
- **Muted Ink** (panel-muted): labels, units, secondary text, axis ticks, placeholders.

### Named Rules
**The One Signal Rule.** Amber means power into an empty room and nothing else. It never marks a brand moment, a hover, a primary action or a "warning" of another kind.

**The Panel-Lamp Rule.** Red is energised and green is tripped (Indian switchgear convention). Never use green as "good" or red as "bad" outside that meaning, except error text and destructive hover where red already reads as live danger.

**The Ink-Not-Accent Rule.** Interactive emphasis is carried by ink (#D9DEE5) on graphite, not by a brand hue. The primary button is an ink slab; selection is an ink outline.

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

The shell is a fixed 56px icon rail on the left and a 40px sticky top bar (breadcrumb, Ctrl K palette trigger, SIMULATED tag, backend lamp, clock). Content sits flush against both with 1px seams; there are no gutters around panels and no page-level max width on operating surfaces.

Overview is a desk-monitor console: at xl and above, a two-column grid (fluid diagram column + 380px right column) filling the viewport height below the top bar, with a full-width KPI strip on top and the load ribbon along the bottom. Below xl, everything stacks in one column and the diagram scrolls horizontally (minimum 880px) rather than shrinking past legibility.

Spacing is tight and regular: 16px horizontal panel padding, 12px vertical, 8px between list cells, 20px inside KPI cells. Rows are separated by seams, not gaps.

## Elevation & Depth

The world is flat. Depth is tonal and one step deep: Rail Black < Night Ground < Raised Graphite, with seams doing the separating. No glows, no gradient fills, no ambient shadows on panels.

### Shadow Vocabulary
- **Modal drop** (`box-shadow: 0 24px 60px -12px rgba(0,0,0,0.7)`): the command palette only, over a 60% black backdrop. It is the one surface that genuinely leaves the panel.

### Named Rules
**The Flush Panel Rule.** Panels meet at 1px seams. If a block needs separation, add a seam, not a shadow, a gap or a card.

## Shapes

Corners are nearly square: 3px on controls (buttons, fields, chips, rail items, tooltips), 2px on small inline tags and keycaps. The only round forms are panel lamps and status dots, because lamps are round. Diagram geometry is drawn in SVG strokes: square breakers, circular transformer and meter, a solid 6px busbar, and feeder lines whose stroke width scales with kW (1.4px at rest, up to ~5.6px). Dashed strokes mean flow when moving, tripped when still, and "alternative" or "estimated" when used on an outline.

## Components

### Buttons
Switchgear-plain: rectangles with a hairline, labelled in sentence case, icons from a 1.6-stroke line set.
- **Shape:** near-square (3px).
- **Primary:** an ink slab (#D9DEE5 fill, ground-coloured text, 12-13px Archivo 600). One per decision: Create, Book this, Find the best slot.
- **Outline:** transparent with a Wire border that turns Ink on hover; used for every secondary action (Back to live, Release trip, Add device).
- **Trip:** the outline button with an uppercase 11px label tracked 0.1em and a power glyph. Isolated in its own column of the waste row. Disabled at 40% opacity while replaying.
- **Text:** muted text that turns ink on hover (Close, Cancel, Edit devices); destructive text turns Lamp Red.
- **Hover / Focus:** border/colour change through the two-step snap (90ms, steps(2)). Focus is a 1.5px ink outline at 2px offset everywhere.

### Chips
- **Style:** toggle buttons (durations, room needs, spaces) with a Seam border and muted text at rest.
- **State:** pressed = Ink border on Seam fill with ink text; hover at rest = Wire border.

### Cards / Containers
There are no cards. Containers are panel regions bounded by seams on Night Ground; Raised Graphite is used only for overlays and selected rows.

### Inputs / Fields
- **Style:** Night Ground fill, 1px Seam border, 3px corners, 13px text, 6px × 10px padding.
- **Focus:** border shifts to Ink; caret is Ink. Hover shifts border to Wire.
- **Disabled:** 50% opacity.

### Navigation
A 56px Rail Black icon column. Items are 40px squares with 18px line icons in Muted Ink; hover lifts to Raised Graphite, active sits on Seam with ink icon and a 1px ink tick at the rail's left edge. Labels appear as a raised tooltip with the page's number key in mono; number keys jump between pages and Ctrl K opens the command palette.

### Status Tags
Small uppercase label-type tags with 2px corners. VERIFIED is a solid Wire outline in ink; ESTIMATED is a dashed Wire outline in muted. SIMULATED sits in the top bar the same way, because every simulated figure must be labelled.

### Single-Line Diagram (signature)
The floor's live state drawn as switchgear on a 20px drafting grid: transformer, kWh meter and main MCCB feeding a solid ink busbar, then one feeder per space with a panel lamp, a breaker glyph (closed or thrown open), per-category branch counts (AC/FN/LT/AV, on/installed) and a room tag with code, state and kW. Live feeders carry a 7/5 dash that flows at a speed proportional to kW (stilled under reduced motion). Wasting feeders, their branches and tag turn amber; tripped feeders show a green lamp, open breaker and a still dashed line. The selected tag takes a 2px ink stroke.

### Load Ribbon
Today's incomer kW as a 2px ink line over the waste share as a stepped Banked Amber area, mono axis ticks, no grid. Clicking any point replays the whole console to that moment; a dashed ink reference line marks the moment shown.

### Room Day Strip
One time axis per bookable room (08:00 to 19:00) with hour rules in Seam: timetabled classes as Seam blocks with Wire outline, extra classes as solid Wire, the pick as a solid Ink block, alternatives as dashed Ink outlines, lunch as a diagonal hatch.

## Do's and Don'ts

### Do:
- **Do** separate every panel, row and region with a 1px Seam (#222833) and let panels sit flush.
- **Do** set every figure in JetBrains Mono with tabular numerals, and put its unit in muted Archivo beside it.
- **Do** reserve Feeder Amber (#F5A524) for power into an empty room, everywhere it appears.
- **Do** use the panel-lamp code: Lamp Red for energised, Lamp Green for tripped.
- **Do** snap state changes in two steps (90ms, steps(2, end)) and keep current flow as the only continuous motion, stilled under reduced motion.
- **Do** label simulated and estimated values in place (SIMULATED, ESTIMATED tags; "· simulated" beside timestamps).
- **Do** draw domain objects as SVG switchgear and use line weight, dash and lamp state to carry meaning.

### Don't:
- **Don't** use cards, glows, gradient fills or decorative shadows; the command palette's modal drop is the only shadow. Drawn patterns (the 20px drafting grid, the lunch hatch) are linework, not gradients, and stay allowed.
- **Don't** tile KPIs as cards or show proportions as donut charts; KPIs live in a seamed strip.
- **Don't** use amber, red or green as general-purpose accent, success or warning colours.
- **Don't** fade or ease state changes; nothing fades in this world.
- **Don't** round controls beyond 3px; only lamps and status dots are circles.
- **Don't** stack an uppercase label above a heading as an eyebrow; the label is the heading.
