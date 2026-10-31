/**
 * Three themes (Daylight, Dusk, Night), one set of roles. "Daylight" (light, navy chrome) and "Dusk" (slate dark).
 * This file is the single source of colour: applyTheme() writes every role as an
 * RGB-channel CSS variable (used by Tailwind as rgb(var(--c-x) / alpha)), and
 * useTheme() hands the same hex values to SVG and chart code.
 */
import { createContext, useContext } from 'react';

export type ThemeName = 'light' | 'dark' | 'night' | 'tree' | 'site';

export interface Palette {
  // surfaces
  ground: string; raised: string; seam: string; wire: string; grid: string;
  // text
  ink: string; muted: string;
  // chrome (rail + top bar)
  rail: string; railInk: string; railActive: string; railActiveInk: string; top: string; topInk: string;
  // action / selection
  accent: string; accentHover: string; onAccent: string;
  // signals (meaning fixed across themes)
  waste: string; wasteDeep: string; wasteField: string; lampOn: string; lampOff: string;
  // charts (validated pairs)
  chartBase: string; chartSaved: string;
  // load types (validated categorical set; IT/appliances/other are neutral)
  catAc: string; catFan: string; catLight: string; catAv: string; catNeutral: string;
  // room types (floor-plan tints)
  kindClass: string; kindStaff: string; kindService: string;
  tint: number; // alpha for room tints
}

export const PALETTES: Record<ThemeName, Palette> = {
  light: {
    ground: '#F4F7FB', raised: '#FFFFFF', seam: '#D7DFE9', wire: '#AEBACA', grid: '#E6ECF3',
    ink: '#13203A', muted: '#53607A',
    rail: '#14284B', railInk: '#A9BADA', railActive: '#24407A', railActiveInk: '#FFFFFF', top: '#14284B', topInk: '#FFFFFF',
    accent: '#1F5FD1', accentHover: '#1A51B3', onAccent: '#FFFFFF',
    waste: '#A35C00', wasteDeep: '#B8740F', wasteField: '#FFF1DB', lampOn: '#D92D3A', lampOff: '#14935A',
    chartBase: '#3E6FC0', chartSaved: '#B8740F',
    catAc: '#2563C9', catFan: '#0E8A7A', catLight: '#7A4FD0', catAv: '#BC3F78', catNeutral: '#64708A',
    kindClass: '#2563C9', kindStaff: '#7A4FD0', kindService: '#0E8A7A',
    tint: 0.12,
  },
  dark: {
    ground: '#1B2230', raised: '#232C3D', seam: '#323D52', wire: '#4A576E', grid: '#202938',
    ink: '#E8EDF4', muted: '#A3AEC0',
    rail: '#151B26', railInk: '#8C98AB', railActive: '#2A3650', railActiveInk: '#E8EDF4', top: '#1B2230', topInk: '#E8EDF4',
    accent: '#6EA8FF', accentHover: '#8DBBFF', onAccent: '#0E1420',
    waste: '#F5A524', wasteDeep: '#C27A12', wasteField: '#2E2616', lampOn: '#F0646B', lampOff: '#3DD68C',
    chartBase: '#5E86C2', chartSaved: '#C27A12',
    catAc: '#4D8AE8', catFan: '#1FA48F', catLight: '#9475E8', catAv: '#D4588F', catNeutral: '#8C98AB',
    kindClass: '#6EA8FF', kindStaff: '#B79CFF', kindService: '#9AA6B8',
    tint: 0.14,
  },
  night: {
    ground: '#0E1116', raised: '#141920', seam: '#222833', wire: '#3A414D', grid: '#151A21',
    ink: '#D9DEE5', muted: '#7D8694',
    rail: '#0A0C10', railInk: '#7D8694', railActive: '#222833', railActiveInk: '#D9DEE5', top: '#0E1116', topInk: '#D9DEE5',
    accent: '#D9DEE5', accentHover: '#FFFFFF', onAccent: '#0E1116',
    waste: '#F5A524', wasteDeep: '#C27A12', wasteField: '#191307', lampOn: '#E5484D', lampOff: '#3DD68C',
    chartBase: '#5E86C2', chartSaved: '#C27A12',
    catAc: '#8A93A1', catFan: '#8A93A1', catLight: '#8A93A1', catAv: '#8A93A1', catNeutral: '#8A93A1',
    kindClass: '#8A93A1', kindStaff: '#8A93A1', kindService: '#8A93A1',
    tint: 0.06,
  },
  /** Resource Tree: warm-neutral light admin console, dark warm header, blue actions. */
  tree: {
    ground: '#F2F1EF', raised: '#FFFFFF', seam: '#D9D5D1', wire: '#C4BEB8', grid: '#E9E7E4',
    ink: '#24211F', muted: '#6B645F',
    rail: '#E9E7E4', railInk: '#4A4440', railActive: '#2F6FDB', railActiveInk: '#FFFFFF', top: '#2A2624', topInk: '#F2EEEB',
    accent: '#2F6FDB', accentHover: '#2759B3', onAccent: '#FFFFFF',
    waste: '#A35C00', wasteDeep: '#B8740F', wasteField: '#FFF1DB', lampOn: '#D9443B', lampOff: '#2E9E5B',
    chartBase: '#3E6FC0', chartSaved: '#B8740F',
    catAc: '#2563C9', catFan: '#0E8A7A', catLight: '#7A4FD0', catAv: '#BC3F78', catNeutral: '#6B645F',
    kindClass: '#2563C9', kindStaff: '#7A4FD0', kindService: '#0E8A7A',
    tint: 0.1,
  },
  /** Site Controller: warm charcoal network-controller look, teal actions. */
  site: {
    ground: '#1E1C1B', raised: '#2A2725', seam: '#3B3734', wire: '#55504C', grid: '#252220',
    ink: '#EEEAE7', muted: '#ADA6A2',
    rail: '#181615', railInk: '#ADA6A2', railActive: '#2F2B29', railActiveInk: '#EEEAE7', top: '#1E1C1B', topInk: '#EEEAE7',
    accent: '#2BB3A3', accentHover: '#3CC7B6', onAccent: '#0F1B1A',
    waste: '#F0A23B', wasteDeep: '#C27A12', wasteField: '#2E2516', lampOn: '#F0646B', lampOff: '#4CC38A',
    chartBase: '#5E86C2', chartSaved: '#C27A12',
    catAc: '#5B9BFF', catFan: '#2FB59D', catLight: '#A88BFA', catAv: '#E86FA3', catNeutral: '#ADA6A2',
    kindClass: '#5B9BFF', kindStaff: '#A88BFA', kindService: '#ADA6A2',
    tint: 0.14,
  },
};


const channels = (hex: string) => {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
};

const kebab = (s: string) => s.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);

export function applyTheme(name: ThemeName) {
  const p = PALETTES[name];
  const root = document.documentElement;
  root.dataset.theme = name;
  root.style.colorScheme = name;
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'string') root.style.setProperty(`--c-${kebab(k)}`, channels(v));
  }
}

export function initialTheme(storageKey = 'gc-theme-console', fallback: ThemeName = 'light'): ThemeName {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return fallback;
}

export function saveTheme(name: ThemeName, storageKey = 'gc-theme-console') {
  try {
    localStorage.setItem(storageKey, name);
  } catch {
    /* storage unavailable */
  }
}

/** rgba() from a hex, for tints in SVG/inline styles. */
export const alpha = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};

export interface ThemeState {
  name: ThemeName;
  p: Palette;
  toggle: () => void;
  /** True when the style fixes its theme (no light/dark switch). */
  locked: boolean;
}

export const ThemeContext = createContext<ThemeState>({ name: 'light', p: PALETTES.light, toggle: () => undefined, locked: false });
export const useTheme = () => useContext(ThemeContext);

/** Colour for a load category (HVAC, FAN, LIGHTING, AV; everything else is neutral). */
export const categoryColor = (p: Palette, category: string) =>
  ({ HVAC: p.catAc, FAN: p.catFan, LIGHTING: p.catLight, AV: p.catAv } as Record<string, string>)[category] ?? p.catNeutral;

/** Floor-plan colour for a space kind. */
export const kindColor = (p: Palette, kind: string) =>
  kind === 'CLASSROOM' || kind === 'LAB' ? p.kindClass : kind === 'STAFF_ROOM' ? p.kindStaff : p.kindService;

/** Timetable tint by department (CSE, ECE, ME...), from the validated categorical set. */
export const deptColor = (p: Palette, section?: string | null) => {
  const dept = (section ?? '').split('-')[0].toUpperCase();
  return ({ CSE: p.catAc, ECE: p.catLight, ME: p.catFan, CE: p.catAv } as Record<string, string>)[dept] ?? p.catNeutral;
};
