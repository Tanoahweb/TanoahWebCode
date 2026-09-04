/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F4F4FA',
          100: '#EEEEF8',
          200: '#D5D5ED',
          300: '#ACACDC',
          400: '#7575BF',
          500: '#3F3F8F', // PRIMARY BRAND COLOR
          600: '#343476', // HOVER COLOR
          700: '#2A2A5E',
          800: '#1F1F46',
          900: '#15152F',
          DEFAULT: '#3F3F8F',
          hover: '#343476',
          light: '#EEEEF8',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8F8F8',
          subtle: '#FAFAFA',
          border: '#E7E7E7',
        },
      },
      fontFamily: {
        wondra: ['Wondra', 'serif'],
        poppins: ['Poppins', 'sans-serif'],
        cinzel: ['Cinzel', 'serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        brand: '4px',
        'brand-md': '6px',
        'brand-lg': '8px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'scale-up': 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
