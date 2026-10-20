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
        priority: {
          emergency: '#DC2626',
          dueToday: '#EA580C',
          twoDay: '#F59E0B',
          threeDay: '#EAB308',
          fiveDay: '#2563EB',
          completed: '#16A34A',
        }
      }
    },
  },
  plugins: [],
}
