/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        healthy: '#22c55e',
        degraded: '#f97316',
        down: '#ef4444',
        unknown: '#94a3b8',
      },
    },
  },
  plugins: [],
};
