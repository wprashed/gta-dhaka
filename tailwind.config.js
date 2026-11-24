/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
        display: ['Impact', 'Oswald', 'Arial Black', 'sans-serif'],
      },
      colors: {
        dhaka: {
          green: '#006a4e',
          red: '#f42a41',
          gold: '#f59e0b',
          cng: '#15803d',
          rickshaw: '#ec4899',
          neon: '#06b6d4'
        }
      }
    },
  },
  plugins: [],
}
