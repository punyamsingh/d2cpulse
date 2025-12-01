/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Nightwing-inspired color palette
        nightwing: {
          // Deep blacks and navy blues
          900: '#020617', // Near black
          850: '#0a0f1f', // Very dark blue
          800: '#0d1526', // Dark navy
          700: '#111827', // Base dark
          600: '#1e293b', // Lighter navy
          500: '#334155', // Medium navy
          // Electric blue accents (Nightwing's signature)
          electric: '#0ea5e9', // Primary accent
          glow: '#38bdf8', // Lighter accent
          bright: '#7dd3fc', // Bright accent
          // Complementary accent
          accent: '#06b6d4', // Cyan
          'accent-light': '#22d3ee', // Light cyan
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'nightwing-glow': 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #0284c7 100%)',
        'nightwing-dark': 'linear-gradient(180deg, #020617 0%, #0d1526 50%, #111827 100%)',
      },
      boxShadow: {
        'nightwing': '0 0 30px rgba(14, 165, 233, 0.15)',
        'nightwing-hover': '0 0 40px rgba(14, 165, 233, 0.25)',
        'glow-sm': '0 0 10px rgba(14, 165, 233, 0.3)',
        'glow-md': '0 0 20px rgba(14, 165, 233, 0.4)',
        'glow-lg': '0 0 40px rgba(14, 165, 233, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(14, 165, 233, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(14, 165, 233, 0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

