/**
 * Two themes, one set of roles. "Daylight" (light, navy chrome) and "Dusk" (slate dark).
 * This file is the single source of colour: applyTheme() writes every role as an
 * RGB-channel CSS variable (used by Tailwind as rgb(var(--c-x) / alpha)), and
 * useTheme() hands the same hex values to SVG and chart code.
 */
import { createContext, useContext } from 'react';

export type ThemeName = 'light' | 'dark';

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
};

const STORAGE_KEY = 'gc-theme';

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

export function initialTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return 'light';
}

export function saveTheme(name: ThemeName) {
  try {
    localStorage.setItem(STORAGE_KEY, name);
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
}

export const ThemeContext = createContext<ThemeState>({ name: 'light', p: PALETTES.light, toggle: () => undefined });
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
