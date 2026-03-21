/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      colors: {
        brand: {
          wordmark: '#0d9488',
          wordmarkOnDark: '#2dd4bf',
          sidebar: '#0F0F0F',
          sidebarText: '#E5E5E5',
          accent: '#25D366',
          accent2: '#128C7E',
          border: '#F0F0F0',
          text: '#111111',
          textMuted: '#6B7280',
          inputBg: '#F9FAFB',
          chatBg: '#F0F2F5',
          sentBubble: '#DCF8C6',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04)',
      },
      transitionDuration: {
        150: '150ms',
        200: '200ms',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

