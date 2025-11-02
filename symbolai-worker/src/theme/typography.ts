/**
 * NativeBase v3.4 Typography System
 * Font sizes, weights, line heights, and letter spacing
 */

export const typography = {
  fontSizes: {
    '2xs': '0.625rem',    // 10px
    'xs': '0.75rem',      // 12px
    'sm': '0.875rem',     // 14px
    'md': '1rem',         // 16px
    'lg': '1.125rem',     // 18px
    'xl': '1.25rem',      // 20px
    '2xl': '1.5rem',      // 24px
    '3xl': '1.875rem',    // 30px
    '4xl': '2.25rem',     // 36px
    '5xl': '3rem',        // 48px
    '6xl': '3.75rem',     // 60px
    '7xl': '4.5rem',      // 72px
    '8xl': '6rem',        // 96px
    '9xl': '8rem',        // 128px
  },

  fontWeights: {
    hairline: '100',
    thin: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
    extraBlack: '950',
  },

  lineHeights: {
    '2xs': '1em',
    'xs': '1.125em',
    'sm': '1.25em',
    'md': '1.375em',
    'lg': '1.5em',
    'xl': '1.75em',
    '2xl': '2em',
    '3xl': '2.5em',
    '4xl': '3em',
    '5xl': '4em',
  },

  letterSpacings: {
    'xs': '-0.05em',
    'sm': '-0.025em',
    'md': '0',
    'lg': '0.025em',
    'xl': '0.05em',
    '2xl': '0.1em',
  },

  fonts: {
    heading: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
} as const;

export type FontSize = keyof typeof typography.fontSizes;
export type FontWeight = keyof typeof typography.fontWeights;
export type LineHeight = keyof typeof typography.lineHeights;
export type LetterSpacing = keyof typeof typography.letterSpacings;
