/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        island: {
          sand: '#f2d2a9',
          ocean: '#0077be',
          forest: '#228b22',
          wood: '#5d4037',
        }
      }
    },
  },
  plugins: [],
}
