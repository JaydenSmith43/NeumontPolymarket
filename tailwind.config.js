/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#333333',
        secondary: '#222222',
        accent: '#f1c40f',
        textColor: '#f5f5f5',
        background: '#1a1a1a',
        cardBg: '#2a2a2a',
        success: '#f1c40f',
        danger: '#333333',
        accentHover: '#f39c12',
      },
      boxShadow: {
        'card': '0 6px 16px rgba(0, 0, 0, 0.3)',
        'button': '0 2px 4px rgba(0, 0, 0, 0.2)',
        'buttonHover': '0 4px 8px rgba(0, 0, 0, 0.3)',
      },
      borderWidth: {
        '1': '1px',
      },
    },
  },
  plugins: [],
}