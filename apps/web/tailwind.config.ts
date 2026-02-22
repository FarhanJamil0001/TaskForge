import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E6F4FF',
          100: '#CCE8FF',
          500: '#0073EA',
          600: '#0060C2',
          700: '#004D9A',
        },
        sidebar: {
          DEFAULT: '#292F4C',
          hover: '#363D59',
          active: '#4B5279',
        },
        surface: '#F6F7FB',
        'monday-border': '#E6E9EF',
        'txt-primary': '#323338',
        'txt-secondary': '#676879',
        status: {
          green: '#00C875',
          orange: '#FDAB3D',
          red: '#E2445C',
          blue: '#579BFC',
          purple: '#784BD1',
          gray: '#C4C4C4',
        },
      },
    },
  },
  plugins: [],
};
export default config;
