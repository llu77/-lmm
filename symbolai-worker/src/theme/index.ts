/**
 * NativeBase v3.4 Design System
 * Complete theme configuration for lmm project
 */

export * from './colors';
export * from './typography';
export * from './spacing';

/**
 * Border Radius tokens
 */
export const radii = {
  'none': '0',
  'xs': '0.125rem',    // 2px
  'sm': '0.25rem',     // 4px
  'md': '0.375rem',    // 6px
  'lg': '0.5rem',      // 8px
  'xl': '0.75rem',     // 12px
  '2xl': '1rem',       // 16px
  '3xl': '1.5rem',     // 24px
  'full': '9999px',
} as const;

/**
 * Shadow tokens (converted to CSS box-shadow)
 */
export const shadows = {
  'none': 'none',
  'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
} as const;

/**
 * Breakpoints for responsive design
 */
export const breakpoints = {
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
} as const;

/**
 * Z-index scale
 */
export const zIndices = {
  'hide': -1,
  'auto': 'auto',
  'base': 0,
  'docked': 10,
  'dropdown': 1000,
  'sticky': 1100,
  'banner': 1200,
  'overlay': 1300,
  'modal': 1400,
  'popover': 1500,
  'skipLink': 1600,
  'toast': 1700,
  'tooltip': 1800,
} as const;

export type Radii = keyof typeof radii;
export type Shadow = keyof typeof shadows;
export type Breakpoint = keyof typeof breakpoints;
export type ZIndex = keyof typeof zIndices;
