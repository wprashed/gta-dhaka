/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Noto Sans Bengali"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Impact', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        monsoon: {
          darkest: '#0b0e13',
          surface: '#101418',
          bitumen: '#14171c',
          container: '#1d2025',
          high: '#272a2f',
          highest: '#32353a',
          cng: '#00ff66',
          amber: '#ffb703',
          neon: '#00e5ff',
          blood: '#ff003c',
          glare: '#fff2d6',
          slate: '#1e293b',
        },
        dhaka: {
          green: '#00ff66',
          red: '#ff003c',
          gold: '#ffb703',
          cng: '#00ff66',
          rickshaw: '#ec4899',
          neon: '#00e5ff',
        }
      }
    },
  },
  plugins: [],
}
