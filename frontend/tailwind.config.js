/** @type {import('tailwindcss').Config} */

// Every colour is a theme role from src/theme.ts, exposed as RGB-channel CSS variables so
// light ("Daylight") and dark ("Dusk") switch at runtime. Legacy slate/cyan/purple scales map
// onto the same roles so older markup themes correctly too.
const v = name => `rgb(var(--c-${name}) / <alpha-value>)`;
const roleScale = (light, mid, low) => ({
  50: v('ink'), 100: v('ink'), 200: v('ink'), 300: v(light), 400: v(mid), 500: v(mid),
  600: v(low), 700: v('wire'), 800: v('seam'), 900: v('raised'), 950: v('ground'),
});
const accentScale = {
  50: v('accent'), 100: v('accent'), 200: v('accent'), 300: v('accent'), 400: v('accent'), 500: v('accent'),
  600: v('accent-hover'), 700: v('accent-hover'), 800: v('seam'), 900: v('raised'), 950: v('ground'),
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: roleScale('ink', 'muted', 'wire'),
        cyan: roleScale('ink', 'ink', 'muted'),
        purple: accentScale,
        violet: accentScale,
        panel: {
          ground: v('ground'),
          rail: v('rail'),
          raised: v('raised'),
          seam: v('seam'),
          wire: v('wire'),
          grid: v('grid'),
          ink: v('ink'),
          muted: v('muted'),
          faint: v('muted'),
        },
        chrome: { DEFAULT: v('top'), ink: v('top-ink'), rail: v('rail'), 'rail-ink': v('rail-ink'), 'rail-active': v('rail-active'), 'rail-active-ink': v('rail-active-ink') },
        accent: { DEFAULT: v('accent'), hover: v('accent-hover'), on: v('on-accent') },
        waste: { DEFAULT: v('waste'), deep: v('waste-deep'), field: v('waste-field') },
        lamp: { on: v('lamp-on'), off: v('lamp-off') },
        chart: { base: v('chart-base'), saved: v('chart-saved') },
        cat: { ac: v('cat-ac'), fan: v('cat-fan'), light: v('cat-light'), av: v('cat-av'), neutral: v('cat-neutral') },
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['10.5px', { lineHeight: '14px', letterSpacing: '0.1em' }],
      },
    },
  },
  plugins: [],
};
