/** @type {import('tailwindcss').Config} */

// Graphite night-panel world. Legacy pages use slate/cyan/purple utility classes;
// those scales are remapped here so every page sits in the same world.
const graphite = {
  50: '#F2F4F7', 100: '#E3E7EC', 200: '#D9DEE5', 300: '#B4BCC7', 400: '#9AA3B0',
  500: '#7D8694', 600: '#4A525E', 700: '#2C333E', 800: '#222833', 900: '#161A21', 950: '#0E1116',
};
const ink = {
  50: '#F5F7FA', 100: '#E8ECF1', 200: '#DDE2E9', 300: '#D9DEE5', 400: '#E6EAF0',
  500: '#D9DEE5', 600: '#B4BCC7', 700: '#4A525E', 800: '#2C333E', 900: '#1A1F27', 950: '#12161C',
};
const steel = {
  50: '#EEF3FA', 100: '#DCE6F4', 200: '#BCD0EA', 300: '#93B2DD', 400: '#7499CF', 500: '#5E86C2',
  600: '#4B6EA5', 700: '#3D5986', 800: '#2E4466', 900: '#1E2D45', 950: '#141F31',
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: graphite,
        cyan: ink,
        purple: steel,
        violet: steel,
        panel: {
          ground: '#0E1116',
          rail: '#0A0C10',
          raised: '#141920',
          seam: '#222833',
          wire: '#3A414D',
          ink: '#D9DEE5',
          muted: '#7D8694',
          faint: '#5B6371',
        },
        waste: { DEFAULT: '#F5A524', deep: '#C27A12', field: '#191307' },
        lamp: { on: '#E5484D', off: '#3DD68C' },
        chart: { base: '#5E86C2', saved: '#C27A12' },
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
