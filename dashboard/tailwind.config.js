/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary - LinkedIn Blue
        primary: {
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
          DEFAULT: 'rgb(var(--color-primary-500) / <alpha-value>)',
        },

        // Neutral - Blue-tinted grays
        neutral: {
          50: 'rgb(var(--color-neutral-50) / <alpha-value>)',
          100: 'rgb(var(--color-neutral-100) / <alpha-value>)',
          200: 'rgb(var(--color-neutral-200) / <alpha-value>)',
          300: 'rgb(var(--color-neutral-300) / <alpha-value>)',
          400: 'rgb(var(--color-neutral-400) / <alpha-value>)',
          500: 'rgb(var(--color-neutral-500) / <alpha-value>)',
          600: 'rgb(var(--color-neutral-600) / <alpha-value>)',
          700: 'rgb(var(--color-neutral-700) / <alpha-value>)',
          800: 'rgb(var(--color-neutral-800) / <alpha-value>)',
          900: 'rgb(var(--color-neutral-900) / <alpha-value>)',
        },

        // Post Category Colors
        category: {
          recruitment: {
            DEFAULT: '#10B981',
            light: '#D1FAE5',
            dark: '#047857',
          },
          promotional: {
            DEFAULT: '#F59E0B',
            light: '#FEF3C7',
            dark: '#B45309',
          },
          'thought-leadership': {
            DEFAULT: '#8B5CF6',
            light: '#EDE9FE',
            dark: '#6D28D9',
          },
          events: {
            DEFAULT: '#3B82F6',
            light: '#DBEAFE',
            dark: '#1D4ED8',
          },
          csr: {
            DEFAULT: '#14B8A6',
            light: '#CCFBF1',
            dark: '#0F766E',
          },
          'internal-news': {
            DEFAULT: '#64748B',
            light: '#F1F5F9',
            dark: '#334155',
          },
          partnerships: {
            DEFAULT: '#EC4899',
            light: '#FCE7F3',
            dark: '#BE185D',
          },
        },

        // Semantic colors
        success: {
          DEFAULT: '#00BDA5',
          light: '#E5FAF5',
          dark: '#00A38D',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          dark: '#B91C1C',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#B45309',
        },
        info: {
          DEFAULT: '#0A66C2',
          light: '#F0F9FF',
          dark: '#08529C',
        },

        // Surface colors
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',

        // Sidebar colors
        sidebar: {
          bg: 'rgb(var(--color-sidebar-bg) / <alpha-value>)',
          hover: 'rgb(var(--color-sidebar-hover) / <alpha-value>)',
          active: 'rgb(var(--color-sidebar-active) / <alpha-value>)',
          text: 'rgb(var(--color-sidebar-text) / <alpha-value>)',
          'text-active': 'rgb(var(--color-sidebar-text-active) / <alpha-value>)',
        },
      },

      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },

      fontSize: {
        'xs': ['0.6875rem', { lineHeight: '1rem' }],
        'sm': ['0.75rem', { lineHeight: '1.125rem' }],
        'base': ['0.875rem', { lineHeight: '1.375rem' }],
        'lg': ['1rem', { lineHeight: '1.5rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['2rem', { lineHeight: '2.5rem' }],
        '4xl': ['2.5rem', { lineHeight: '3rem' }],
      },

      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },

      width: {
        'sidebar': '240px',
        'sidebar-collapsed': '64px',
      },

      height: {
        'topbar': '56px',
        'row': '52px',
        'row-compact': '44px',
      },

      maxWidth: {
        'container': '1440px',
        'content': '1200px',
      },

      borderRadius: {
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },

      boxShadow: {
        'sm': '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(15 23 42 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.08)',
        'md': '0 4px 6px -1px rgb(15 23 42 / 0.1), 0 2px 4px -2px rgb(15 23 42 / 0.1)',
        'lg': '0 10px 15px -3px rgb(15 23 42 / 0.1), 0 4px 6px -4px rgb(15 23 42 / 0.1)',
        'xl': '0 20px 25px -5px rgb(15 23 42 / 0.1), 0 8px 10px -6px rgb(15 23 42 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(15 23 42 / 0.25)',
        'card': '0 1px 3px 0 rgb(15 23 42 / 0.08)',
        'card-hover': '0 4px 12px 0 rgb(15 23 42 / 0.12)',
        'dropdown': '0 4px 12px rgb(15 23 42 / 0.15)',
        'modal': '0 8px 30px rgb(15 23 42 / 0.25)',
        'focus': '0 0 0 3px rgb(10 102 194 / 0.15)',
        'focus-error': '0 0 0 3px rgb(239 68 68 / 0.15)',
      },

      transitionDuration: {
        'fast': '150ms',
        'DEFAULT': '200ms',
        'slow': '300ms',
        'slower': '400ms',
      },

      zIndex: {
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },

      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },

      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-in-right': 'slide-in-right 300ms ease-out',
        'slide-in-up': 'slide-in-up 300ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'shimmer': 'shimmer 1.5s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
