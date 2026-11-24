/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        obsidian: {
          950: '#040712',
          900: '#070B1A',
          800: '#0D1326',
          700: '#141D38',
        },
        brand: {
          blue: '#3B82F6',
          cyan: '#06B6D4',
          violet: '#8B5CF6',
          indigo: '#6366F1',
        },
      },
      boxShadow: {
        glow: '0 0 32px -8px rgba(59, 130, 246, 0.35)',
        'glow-violet': '0 0 32px -8px rgba(139, 92, 246, 0.35)',
        glass: '0 8px 32px 0 rgba(2, 6, 23, 0.55)',
      },
      backgroundImage: {
        'radial-glow':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.22), rgba(139, 92, 246, 0.08), transparent)',
      },
    },
  },
  plugins: [],
}

