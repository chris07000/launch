/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          500: '#f97316',
          400: '#fb923c',
          900: '#7c2d12',
        },
        yellow: {
          500: '#eab308',
          400: '#facc15',
        },
        green: {
          500: '#22c55e',
        },
        blue: {
          500: '#3b82f6',
        },
        purple: {
          500: '#a855f7',
        },
        gray: {
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        red: {
          400: '#f87171',
          700: '#b91c1c',
          900: '#7f1d1d',
        },
      },
      backgroundColor: {
        'black/10': 'rgba(0, 0, 0, 0.1)',
        'black/20': 'rgba(0, 0, 0, 0.2)',
        'black/30': 'rgba(0, 0, 0, 0.3)',
        'black/40': 'rgba(0, 0, 0, 0.4)',
        'black/80': 'rgba(0, 0, 0, 0.8)',
        'black/90': 'rgba(0, 0, 0, 0.9)',
        'orange-500/10': 'rgba(249, 115, 22, 0.1)',
        'orange-500/20': 'rgba(249, 115, 22, 0.2)',
        'green-500/20': 'rgba(34, 197, 94, 0.2)',
        'blue-500/20': 'rgba(59, 130, 246, 0.2)',
        'purple-500/20': 'rgba(168, 85, 247, 0.2)',
      },
      borderColor: {
        'orange-900/30': 'rgba(124, 45, 18, 0.3)',
        'orange-900/40': 'rgba(124, 45, 18, 0.4)',
      },
    },
  },
  plugins: [],
} 