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
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        border: 'var(--border-color)',
        primary: {
          DEFAULT: 'var(--text-primary)',
          foreground: 'var(--background)',
        },
        secondary: {
          DEFAULT: 'var(--border-color)',
          foreground: 'var(--text-secondary)',
        },
        accent: {
          DEFAULT: 'var(--text-secondary)',
          foreground: 'var(--background)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}
