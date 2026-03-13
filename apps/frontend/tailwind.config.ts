import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: "rgb(var(--color-border))",
        input: "rgb(var(--color-input))",
        ring: "rgb(var(--color-ring))",
        background: "rgb(var(--color-background))",
        foreground: "rgb(var(--color-foreground))",
        primary: {
          DEFAULT: "rgb(var(--color-primary))",
          foreground: "rgb(var(--color-primary-foreground))",
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        secondary: {
          DEFAULT: "rgb(var(--color-secondary))",
          foreground: "rgb(var(--color-secondary-foreground))",
        },
        destructive: {
          DEFAULT: "rgb(var(--color-destructive))",
          foreground: "rgb(var(--color-destructive-foreground))",
        },
        muted: {
          DEFAULT: "rgb(var(--color-muted))",
          foreground: "rgb(var(--color-muted-foreground))",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent))",
          foreground: "rgb(var(--color-accent-foreground))",
        },
        popover: {
          DEFAULT: "rgb(var(--color-popover))",
          foreground: "rgb(var(--color-popover-foreground))",
        },
        card: {
          DEFAULT: "rgb(var(--color-card))",
          foreground: "rgb(var(--color-card-foreground))",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
export default config;
