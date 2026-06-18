/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          base:   '#080808',
          card:   '#101010',
          hover:  '#161616',
          border: 'rgba(255,255,255,0.07)',
        },
        ink: {
          primary:   '#FFFFFF',
          secondary: '#888888',
          muted:     '#444444',
          accent:    '#A0A0A0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
