import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette (surfaces, nav, accents)
        bg:      '#FEF3E2', // warm cream (main background)
        brand1:  '#FAB12F', // yellow (primary accent)
        brand2:  '#FA812F', // orange (secondary accent)
        brand3:  '#DD0303', // red (danger / highlight)

        // Neutral text/icon colors (allowed)
        ink:     '#1A1A1A',
        white:   '#FFFFFF',

        // Semantic aliases (to avoid rewriting everything at once)
        surface: '#FEF3E2',
        primary: '#1A1A1A',
        secondary: '#FA812F',
        danger:  '#DD0303',

        // Legacy tokens (kept as aliases but mapped to brand system)
        black:        '#1A1A1A',
        'gray-light': '#FEF3E2',
        'gray-mid':   '#FA812F',
        'gray-dark':  '#FA812F',
        'border-col': '#FA812F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
