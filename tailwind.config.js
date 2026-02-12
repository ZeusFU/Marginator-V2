/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lexend', 'sans-serif'],
      },
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        background: 'var(--background)',
        surface: 'var(--surface)',
        surface_hover: 'var(--surface-hover)',
        card: 'var(--card)',
        text_primary: 'var(--text_primary)',
        text_secondary: 'var(--text_secondary)',
        border: 'var(--border)',
        muted: 'var(--muted)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        card: 'var(--shadow-card)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1rem',
      }
    },
  },
  plugins: [],
};
