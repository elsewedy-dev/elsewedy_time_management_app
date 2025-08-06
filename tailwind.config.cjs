module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        // Light theme colors
        light: {
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          text: '#1e293b',
          textSecondary: '#64748b',
          accent: '#3b82f6',
        },
        // Dark theme colors
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          text: '#f1f5f9',
          textSecondary: '#94a3b8',
          accent: '#60a5fa',
        }
      }
    },
  },
  plugins: [],
}; 