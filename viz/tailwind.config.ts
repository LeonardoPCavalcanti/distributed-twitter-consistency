import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#070a10',
        panel: '#0f151f',
        line: '#1f2a3a',
        p0: '#38bdf8', // cyan
        p1: '#a78bfa', // violet
        p2: '#fb7185', // rose
        green: '#34d399',
        amber: '#fbbf24',
        muted: '#7d8aa0',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Chakra Petch"', '"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(56,189,248,0.0)' },
          '50%': { boxShadow: '0 0 14px 2px rgba(56,189,248,0.45)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
