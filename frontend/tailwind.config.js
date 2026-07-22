/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Brand: Indigo 700 — única cor primária
        brand: {
          DEFAULT: '#4338CA',
          hover:   '#3730A3',
          light:   '#EEF2FF',
          border:  '#C7D2FE',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted:   '#F5F5F5',
          subtle:  '#F9F9F9',
        },
        // Border neutro
        border: {
          DEFAULT: 'rgba(5,5,5,0.08)',
          strong:  'rgba(5,5,5,0.14)',
        },
        // Cores semânticas apenas para status
        feedback: {
          success:          '#059669',
          'success-bg':     '#ECFDF5',
          'success-border': '#A7F3D0',
          warning:          '#D97706',
          'warning-bg':     '#FFFBEB',
          'warning-border': '#FDE68A',
          error:            '#DC2626',
          'error-bg':       '#FEF2F2',
          'error-border':   '#FECACA',
          info:             '#0891B2',
          'info-bg':        '#ECFEFF',
          'info-border':    '#A5F3FC',
        },
      },
      boxShadow: {
        card:   '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        panel:  '0 4px 16px 0 rgb(0 0 0 / 0.07)',
        modal:  '0 20px 60px 0 rgb(0 0 0 / 0.14)',
        inset:  'inset 0 1px 2px 0 rgb(0 0 0 / 0.04)',
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.25rem',
      },
      keyframes: {
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        indeterminate: 'indeterminate 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
