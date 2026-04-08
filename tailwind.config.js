export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:           '#08090a',
        surface:      '#0e0f11',
        surfaceHover: '#131518',
        border:       '#1c1e22',
        borderLight:  '#242629',
        primary:      '#6366f1',
        primaryHover: '#5558e8',
        muted:        '#52555c',
        mutedLight:   '#6b6f78',
        green:        '#10b981',
        red:          '#ef4444',
        yellow:       '#f59e0b',
        violet:       '#8b5cf6',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)',
        glow:  '0 0 20px rgba(99,102,241,0.15)',
      },
    },
  },
  plugins: [],
}
