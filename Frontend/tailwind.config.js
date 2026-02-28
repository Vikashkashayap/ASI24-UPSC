/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f8fafc",
        card: "#ffffff",
        primary: {
          DEFAULT: "#2563eb",
          foreground: "#ffffff",
        },
        "royal-blue": "#2563eb",
        "royal-blue-dark": "#1d4ed8",
        "hero-bg": "#f0f9ff",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
      },
      borderRadius: {
        xl: "1rem",
      },
      // Mobile-first breakpoints (min-width)
      screens: {
        'xs': '360px',      // Small mobile
        'sm': '480px',      // Large mobile
        'md': '768px',      // Tablet
        'lg': '1024px',     // Laptop
        'xl': '1280px',     // Desktop
        '2xl': '1536px',    // Large desktop
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
};
