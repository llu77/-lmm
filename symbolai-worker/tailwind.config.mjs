/** @type {import('tailwindcss').Config} */
import { colors } from './src/theme/colors.ts';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  darkMode: ["class"],
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        "2xl": "1536px",
      },
    },
    extend: {
      // NativeBase v3.4 Color System
      colors: {
        // Preserve shadcn/ui semantic colors with CSS variables
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Add NativeBase color palette
        ...colors,

        // Semantic colors mapped to NativeBase
        primary: {
          ...colors.cyan,
          DEFAULT: colors.cyan[500],
          foreground: colors.white,
        },
        secondary: {
          ...colors.pink,
          DEFAULT: colors.pink[500],
          foreground: colors.white,
        },
        success: {
          ...colors.green,
          DEFAULT: colors.green[500],
          foreground: colors.white,
        },
        warning: {
          ...colors.orange,
          DEFAULT: colors.orange[500],
          foreground: colors.white,
        },
        danger: {
          ...colors.rose,
          DEFAULT: colors.rose[500],
          foreground: colors.white,
        },
        error: {
          ...colors.red,
          DEFAULT: colors.red[500],
          foreground: colors.white,
        },
        info: {
          ...colors.lightBlue,
          DEFAULT: colors.lightBlue[500],
          foreground: colors.white,
        },
        muted: {
          ...colors.trueGray,
          DEFAULT: colors.trueGray[100],
          foreground: colors.trueGray[900],
        },
        accent: {
          ...colors.violet,
          DEFAULT: colors.violet[500],
          foreground: colors.white,
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },

      // NativeBase spacing system
      spacing: {
        'px': '1px',
        '0': '0',
        '0.5': '0.125rem',
        '1': '0.25rem',
        '1.5': '0.375rem',
        '2': '0.5rem',
        '2.5': '0.625rem',
        '3': '0.75rem',
        '3.5': '0.875rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '7': '1.75rem',
        '8': '2rem',
        '9': '2.25rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
        '32': '8rem',
        '40': '10rem',
        '48': '12rem',
        '56': '14rem',
        '64': '16rem',
        '72': '18rem',
        '80': '20rem',
        '96': '24rem',
      },

      // NativeBase border radius
      borderRadius: {
        'none': '0',
        'xs': '0.125rem',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },

      // NativeBase typography
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1em' }],
        'xs': ['0.75rem', { lineHeight: '1.125em' }],
        'sm': ['0.875rem', { lineHeight: '1.25em' }],
        'md': ['1rem', { lineHeight: '1.375em' }],
        'lg': ['1.125rem', { lineHeight: '1.5em' }],
        'xl': ['1.25rem', { lineHeight: '1.5em' }],
        '2xl': ['1.5rem', { lineHeight: '1.75em' }],
        '3xl': ['1.875rem', { lineHeight: '2em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5em' }],
        '5xl': ['3rem', { lineHeight: '3em' }],
        '6xl': ['3.75rem', { lineHeight: '3em' }],
        '7xl': ['4.5rem', { lineHeight: '4em' }],
        '8xl': ['6rem', { lineHeight: '4em' }],
        '9xl': ['8rem', { lineHeight: '4em' }],
      },

      fontWeight: {
        hairline: '100',
        thin: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },

      letterSpacing: {
        'xs': '-0.05em',
        'sm': '-0.025em',
        'md': '0',
        'lg': '0.025em',
        'xl': '0.05em',
        '2xl': '0.1em',
      },

      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("tailwindcss-animate")
  ],
}
