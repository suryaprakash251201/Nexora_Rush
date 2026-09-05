/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05070d',
          900: '#0a0e18',
          800: '#111827',
          700: '#1a2338',
        },
        neon: {
          cyan: '#22d3ee',
          red: '#fb3b53',
          amber: '#fbbf24',
          violet: '#a78bfa',
          green: '#34d399',
        },
      },
      fontFamily: {
        display: ['"Orbitron"', 'system-ui', 'sans-serif'],
        body: ['"Rajdhani"', 'system-ui', 'sans-serif'],
      },
      textShadow: {
        neon: '0 0 18px rgba(34,211,238,0.55)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
