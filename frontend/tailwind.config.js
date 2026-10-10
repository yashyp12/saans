/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 12px 30px rgba(15, 23, 42, 0.12)',
      },
      colors: {
        green: '#2E9E6B',
        amber: '#E0A100',
        orange: '#E8710A',
        red: '#D93636',
        maroon: '#7A1F3D',
      },
    },
  },
  plugins: [],
}
