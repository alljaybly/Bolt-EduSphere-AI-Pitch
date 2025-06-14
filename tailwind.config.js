/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF7E6',
          100: '#FFEDCC',
          200: '#FFE0A3',
          300: '#FFD27A',
          400: '#FFC552',
          500: '#FFB829',
          600: '#FFAD00',
          700: '#CC8A00',
          800: '#996800',
          900: '#664500',
        },
        secondary: {
          50: '#F5F5DC',
          100: '#EDE4C7',
          200: '#E0D4AF',
          300: '#D3C397',
          400: '#C6B37F',
          500: '#B9A267',
          600: '#A48F57',
          700: '#8A7848',
          800: '#705F39',
          900: '#574A2C',
        },
        accent: {
          50: '#F9F5EB',
          100: '#F2EBD7',
          200: '#E6D7B0',
          300: '#D9C388',
          400: '#CDAF61',
          500: '#C09B39',
          600: '#9A7D2E',
          700: '#755F22',
          800: '#4F3F17',
          900: '#2A200B',
        },
        book: {
          leather: '#4A2C0B',
          leatherDark: '#3A2209',
          parchment: '#F5F5DC',
          parchmentDark: '#EDE4C7',
          gold: '#FFD700',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'book': '5px 5px 15px rgba(0,0,0,0.5)',
        'page': '0 0 5px rgba(0,0,0,0.1)',
      },
      animation: {
        'page-turn': 'pageTurn 0.5s ease-in-out forwards',
      },
      keyframes: {
        pageTurn: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
      },
    },
  },
  plugins: [],
};