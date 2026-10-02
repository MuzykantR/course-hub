/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
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
          codeBg: 'var(--code-bg)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
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
