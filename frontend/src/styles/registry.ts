import type { ThemeName } from '../theme';

export type StyleId = 'night' | 'console' | 'tree' | 'site';

export interface StyleDef {
  id: StyleId;
  name: string;
  base: string;
  /** Fixed theme (no switch) when set. */
  theme?: ThemeName;
  /** Switchable themes when set. */
  themes?: ThemeName[];
  tagline: string;
  description: string;
  tags: string[];
  status: 'Working' | 'In progress';
  thumbnail: string;
}

export const STYLES: StyleDef[] = [
  {
    id: 'night', name: 'Night Panel', base: '/night', theme: 'night',
    tagline: 'Dark control-room console',
    description: 'A single-line diagram of the L Block feeders with live load and wasted kW per room. Built for a facilities operator watching the floor.',
    tags: ['Dark', 'Single-line diagram', 'Original'], status: 'Working', thumbnail: '/gallery/night.png',
  },
  {
    id: 'console', name: 'Daylight / Dusk', base: '/console', themes: ['light', 'dark'],
    tagline: 'Same console, light or dark',
    description: 'The pilot console with colour roles for categories and room types, and a switch between a light and a dark theme. Suited to bright offices and projected demos.',
    tags: ['Light + Dark', 'Colour roles', 'Switchable'], status: 'Working', thumbnail: '/gallery/console.png',
  },
  {
    id: 'tree', name: 'Resource Tree', base: '/tree',
    tagline: 'Browse by building, floor and room',
    description: 'A hierarchical tree of the site with a detail pane for whichever node is selected. Familiar to anyone who has used a systems administration tool.',
    tags: ['Tree view', 'Sysadmin', 'Hardware-ready'], status: 'Working', thumbnail: '/gallery/tree.png',
  },
  {
    id: 'site', name: 'Site Controller', base: '/site',
    tagline: 'Dense BMS-style site overview',
    description: 'A compact controller layout with status tiles, point tables and alarm lists. Aimed at building management staff used to dedicated controllers.',
    tags: ['Site map', 'Inspector', 'Hardware-ready'], status: 'Working', thumbnail: '/gallery/site.png',
  },
];

export const getStyle = (id: StyleId) => STYLES.find(s => s.id === id)!;
