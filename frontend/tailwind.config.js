/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        secondary: '#7c3aed',
        ink: {
          DEFAULT: '#1A1A1A',
          muted: '#6B6A65',
          faint: '#A8A59E',
        },
        paper: {
          DEFAULT: '#FAF8F3',
          card: '#FFFFFF',
          line: '#E8E4DB',
          dark: '#12110F',
          'dark-card': '#1A1917',
          'dark-line': '#2A2824',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      fontSize: {
        'display': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontFamily: '"Playfair Display", Georgia, serif' }],
        'h1':      ['32px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontFamily: '"Playfair Display", Georgia, serif' }],
        'h2':      ['24px', { lineHeight: '1.3', fontFamily: '"Playfair Display", Georgia, serif' }],
        'h3':      ['18px', { lineHeight: '1.4', fontFamily: '"Playfair Display", Georgia, serif' }],
        'body':    ['16px', { lineHeight: '1.6', fontFamily: 'Inter, sans-serif' }],
        'small':   ['14px', { lineHeight: '1.5', fontFamily: 'Inter, sans-serif' }],
        'caption': ['12px', { lineHeight: '1.4', fontFamily: 'Inter, sans-serif' }],
        'tiny':    ['10px', { lineHeight: '1.3', fontFamily: 'Inter, sans-serif' }],
      },
    },
  },
  plugins: [],
}
