import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        stellar: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
      },
      boxShadow: {
        soft: '0 18px 60px rgba(17, 24, 39, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
