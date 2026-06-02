export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Sistema de cor Pulse — azul + branco (tema claro)
        bg:           '#F6F9FB', // n-50 · fundo da página
        surface:      '#FFFFFF', // n-0 · cards
        surfaceHover: '#EEF2F6', // n-100 · superfícies / hover
        border:       '#E0E7EE', // n-200 · bordas e divisores
        borderLight:  '#CAD5E0', // n-300 · bordas fortes
        primary:      '#2A9BD8', // Pulse Blue 500
        primaryHover: '#1D7FB8', // 600
        ink:          '#0A2540', // navy-900 · texto base
        navy:         '#0D2845', // navy-800 · superfície escura / títulos densos
        muted:        '#697787', // n-500 · texto secundário
        mutedLight:   '#98A6B8', // n-400 · ícones inativos
        green:        '#1F9D72', // success
        red:          '#DB4D57', // error
        yellow:       '#E0A234', // warning
        violet:       '#196693', // Pulse 700 (destaque alternativo)
        pulse: {
          50: '#eef8fd', 100: '#d6eefb', 200: '#aee0f5', 300: '#7fcdee', 400: '#4fb4e4',
          500: '#2a9bd8', 600: '#1d7fb8', 700: '#196693', 800: '#1a5375', 900: '#19455f', 950: '#102c3f',
        },
      },
      fontFamily: {
        sans:    ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['"Space Grotesk"', 'Manrope', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 1px 2px rgba(10,37,64,0.04), 0 4px 16px rgba(10,37,64,0.06)',
        glow:  '0 0 20px rgba(42,155,216,0.18)',
      },
    },
  },
  plugins: [],
}
