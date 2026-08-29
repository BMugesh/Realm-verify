/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#070B12',
        'background-surface': '#0B111D',
        'background-elevated': '#101827',
        accent: {
          DEFAULT: '#15BCDF',
          hover: '#3FD0EF',
          dark: '#0FA3C2',
          glow: 'rgba(21, 188, 223, 0.35)',
        },
        glass: {
          surface: 'rgba(255, 255, 255, 0.04)',
          surfaceHover: 'rgba(255, 255, 255, 0.07)',
          border: 'rgba(255, 255, 255, 0.10)',
          borderHover: 'rgba(255, 255, 255, 0.18)',
          highlight: 'rgba(255, 255, 255, 0.15)',
        },
        status: {
          approved: '#10B981',
          approvedBg: 'rgba(16, 185, 129, 0.15)',
          approvedBorder: 'rgba(16, 185, 129, 0.3)',
          review: '#F59E0B',
          reviewBg: 'rgba(245, 158, 11, 0.15)',
          reviewBorder: 'rgba(245, 158, 11, 0.3)',
          unresolved: '#EF4444',
          unresolvedBg: 'rgba(239, 68, 68, 0.15)',
          unresolvedBorder: 'rgba(239, 68, 68, 0.3)',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass-card': '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'glass-pill': '0 10px 30px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        'glow-cyan': '0 0 25px -5px rgba(21, 188, 223, 0.4)',
        'glow-sm': '0 0 12px -2px rgba(21, 188, 223, 0.3)',
      },
      animation: {
        'mesh-slow': 'mesh 15s ease infinite alternate',
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
      },
      keyframes: {
        mesh: {
          '0%': { transform: 'scale(1) translate(0px, 0px)' },
          '50%': { transform: 'scale(1.1) translate(-20px, 20px)' },
          '100%': { transform: 'scale(1) translate(20px, -20px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
};
