/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dezem: {
          primary: '#7B5B2E',
          dark: '#2a1f14',
          bg: '#f5f0ea',
          border: '#e8dfd4',
          muted: '#9e8c75',
        },
      },
    },
  },
  plugins: [],
}
