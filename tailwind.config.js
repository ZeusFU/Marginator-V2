/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lexend', 'sans-serif'],
      },
      colors: {
        primary: '#488BF8',
        secondary: '#F2CB80',
        background: '#0E1117',
        surface: '#1a1c23',
        card: '#262730',
        text_primary: '#FAFAFA',
        text_secondary: '#a0aec0',
        border: '#353945',
      }
    },
  },
  plugins: [],
};
