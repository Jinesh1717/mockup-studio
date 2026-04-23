/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          light: '#FFD700',
          DEFAULT: '#D4AF37',
          dark: '#AA8C2C',
        },
        black: {
          DEFAULT: '#0A0A0A',
          muted: '#1A1A1A'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
