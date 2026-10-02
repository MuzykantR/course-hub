/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Status colors derived from the HSE brand book's additional palette (green, red, yellow, blue).
        success: { 50: '#F2F9F6', 100: '#E0F1EA', 200: '#C1E3D4', 300: '#91CEB3', 400: '#57B48B', 500: '#229C66', 600: '#1E865C', 700: '#1A7052', 800: '#155747', 900: '#11403D', 950: '#0D2D34' },
        danger: { 50: '#FDF2F4', 100: '#FBE0E5', 200: '#F7C1CA', 300: '#F191A1', 400: '#E9586F', 500: '#E22342', 600: '#BF203E', 700: '#9C1D3A', 800: '#751A35', 900: '#521731', 950: '#34152D' },
        warning: { 50: '#FFFBF2', 100: '#FEF5E1', 200: '#FDEBC4', 300: '#FBDC95', 400: '#F9CA5E', 500: '#F7B92B', 600: '#D49F25', 700: '#B2841F', 800: '#8B6718', 900: '#684C12', 950: '#4A350D' },
        info: { 50: '#F2F9FC', 100: '#E0F2F9', 200: '#C1E4F3', 300: '#90D0EA', 400: '#56B7DE', 500: '#20A0D4', 600: '#1C89B8', 700: '#18729D', 800: '#14597E', 900: '#104262', 950: '#0D2E4A' },
        hse: { navy: '#0F2D69', blue: '#374B9B', sky: '#20A0D4', violet: '#7B53B7', yellow: '#FED554' },
        theme: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          card: 'var(--bg-card)',
          cardHover: 'var(--bg-card-hover)',
          cardMuted: 'var(--bg-card-muted)',
          input: 'var(--bg-input)',
          border: 'var(--border-base)',
          borderSubtle: 'var(--border-subtle)',
          main: 'var(--text-main)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          accent: 'var(--accent-main)',
          accentHover: 'var(--accent-hover)',
          accentText: 'var(--accent-text)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Space Grotesk', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'Space Grotesk', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'neo-sm': 'var(--shadow-neo-sm)',
        neo: 'var(--shadow-neo)',
        'neo-lg': 'var(--shadow-neo-lg)',
      },
      borderRadius: {
        card: '20px',
        'card-lg': '28px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
