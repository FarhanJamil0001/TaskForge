import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
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
          green: 'var(--status-green)',
          orange: 'var(--status-orange)',
          red: 'var(--status-red)',
          blue: 'var(--status-blue)',
          purple: 'var(--status-purple)',
          testing: 'var(--status-testing)',
          gray: 'var(--status-gray)',
        },
        'hover-bg': 'var(--hover-bg)',
        'header-bg': 'var(--header-bg)',
      },
    },
  },
  plugins: [],
};
export default config;
