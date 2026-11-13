/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        teal: 'var(--bio-teal)',
        accent: 'var(--bio-accent)',
        ink: 'var(--bio-ink)',
        panel: 'var(--bio-panel)',
        paper: 'var(--bio-paper)',
        mist: 'var(--bio-mist)',
        sand: 'var(--bio-sand)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Source Han Sans SC"',
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
      boxShadow: {
        lift: 'var(--bio-shadow)',
      },
      screens: {
        desktop: '1440px',
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
}
