/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E8542E',
          50: '#FDF1ED',
          100: '#FBE0D7',
          200: '#F6BFAE',
          300: '#F19E85',
          400: '#EC7D5C',
          500: '#E8542E',
          600: '#C5421F',
          700: '#9C3419',
          800: '#732613',
          900: '#4A180C',
        },
        ink: {
          DEFAULT: '#1F2A37',
          50: '#F4F5F6',
          100: '#E3E6EA',
          200: '#C6CCD3',
          300: '#9AA5B1',
          400: '#6B7785',
          500: '#4A5563',
          600: '#374151',
          700: '#2A3441',
          800: '#1F2A37',
          900: '#141C26',
        },
      },
    },
  },
  plugins: [],
}
