/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design tokens - Dark theme with blue accent
        background: '#0B0F1A',
        surface: '#111827',
        'surface-elevated': '#1F2937',
        'surface-hover': '#374151',
        primary: '#3B82F6',
        'primary-hover': '#2563EB',
        'primary-light': '#60A5FA',
        'primary-muted': '#1E3A5F',
        success: '#22C55E',
        'success-light': '#4ADE80',
        'success-muted': '#14532D',
        warning: '#F59E0B',
        'warning-light': '#FBBF24',
        'warning-muted': '#78350F',
        danger: '#EF4444',
        'danger-light': '#F87171',
        'danger-muted': '#7F1D1D',
        text: '#F9FAFB',
        'text-secondary': '#D1D5DB',
        'text-muted': '#9CA3AF',
        'text-inverse': '#0B0F1A',
        border: '#374151',
        'border-light': '#4B5563',
        overlay: 'rgba(11, 15, 26, 0.8)',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '8px',
        'badge': '9999px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'h1': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h2': ['1.875rem', { lineHeight: '1.25' }],
        'h3': ['1.5rem', { lineHeight: '1.3' }],
        'h4': ['1.25rem', { lineHeight: '1.4' }],
        'body': ['1rem', { lineHeight: '1.5' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.5' }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.25)',
        'modal': '0 24px 48px rgba(0, 0, 0, 0.5), 0 8px 16px rgba(0, 0, 0, 0.3)',
        'toast': '0 8px 24px rgba(0, 0, 0, 0.4)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}