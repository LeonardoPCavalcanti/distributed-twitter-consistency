import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0e14',
        panel: '#121821',
        line: '#243042',
        p0: '#38bdf8',
        p1: '#a78bfa',
        p2: '#fb7185',
        green: '#34d399',
        amber: '#fbbf24',
        muted: '#7d8aa0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
