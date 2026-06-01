/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'Consolas', 'Monaco', '"Andale Mono"', 'monospace'],
      },
      colors: {
        garden: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        surface: {
          light: '#ffffff',
          dark: '#0a0a0b',
        },
        muted: {
          light: '#f8f9fa',
          dark: '#18181b',
        },
        border: {
          light: '#e5e7eb',
          dark: '#27272a',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
