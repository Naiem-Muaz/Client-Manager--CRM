/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0F1E3A', // Deep Navy
          secondary: '#2F4A7D', // Slate Blue
          accent: '#2ECC71', // Emerald
          warning: '#F4B400', // Amber
          risk: '#D93025', // Crimson
        },
        bg: {
          main: '#F6F7F9', // Soft Grey
          surface: '#FFFFFF',
        },
        divider: '#E5E7EB', // Cool Grey
      },
      spacing: {
        'sidebar': '260px',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
