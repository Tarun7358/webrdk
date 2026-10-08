/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        rage: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          accent: '#ff2a42',
          glow: '#ff0033',
        },
        dark: {
          bg: '#0a0b0e',
          surface: '#12141a',
          card: '#161922',
          border: '#232734',
          muted: '#8e96a8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'rage-glow': '0 0 25px -5px rgba(255, 42, 66, 0.35)',
        'rage-glow-sm': '0 0 15px -3px rgba(255, 42, 66, 0.25)',
      }
    },
  },
  plugins: [],
}
