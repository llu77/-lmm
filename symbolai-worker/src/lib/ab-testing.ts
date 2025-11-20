/**
 * A/B Testing Utility for Cloudflare Pages
 *
 * Provides utilities for implementing A/B testing using cookies.
 * Based on Cloudflare Pages Functions best practices.
 *
 * @module ab-testing
 * @see https://developers.cloudflare.com/pages/functions/examples/ab-testing/
 *
 * @example
 * ```typescript
 * import { createABTest } from '@/lib/ab-testing';
 *
 * const abTest = createABTest('homepage-redesign', {
 *   variants: ['control', 'variant-a', 'variant-b'],
 *   weights: [50, 30, 20], // Percentage distribution
 * });
 *
 * export const onRequest = async (context) => {
 *   const variant = abTest.getVariant(context);
 *   // Use variant to determine which content to serve
 * };
 * ```
 */

import type { AstroGlobal } from 'astro';

export interface ABTestConfig {
  /** Test identifier (used as cookie name prefix) */
  name: string;

  /** List of variant names */
  variants: string[];

  /** Optional: Weight distribution (must sum to 100) */
  weights?: number[];

  /** Optional: Cookie expiration in days (default: 30) */
  cookieMaxAge?: number;

  /** Optional: Cookie path (default: '/') */
  cookiePath?: string;
}

export interface ABTestResult {
  /** The assigned variant */
  variant: string;

  /** Whether this is a new assignment */
  isNewAssignment: boolean;

  /** The cookie value */
  cookieValue: string;
}

/**
 * A/B Test Manager
 */
export class ABTest {
  private config: Required<ABTestConfig>;
  private cookieName: string;

  constructor(config: ABTestConfig) {
    // Validate config
    if (!config.name) {
      throw new Error('ABTest: name is required');
    }

    if (!config.variants || config.variants.length === 0) {
      throw new Error('ABTest: at least one variant is required');
    }

    // Set defaults
    this.config = {
      name: config.name,
      variants: config.variants,
      weights: config.weights || this.equalWeights(config.variants.length),
      cookieMaxAge: config.cookieMaxAge || 30,
      cookiePath: config.cookiePath || '/',
    };

    // Validate weights
    if (this.config.weights.length !== this.config.variants.length) {
      throw new Error('ABTest: weights must match number of variants');
    }

    const sum = this.config.weights.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new Error('ABTest: weights must sum to 100');
    }

    this.cookieName = `ab-test-${this.config.name}`;
  }

  /**
   * Generate equal weights for all variants
   */
  private equalWeights(count: number): number[] {
    const weight = 100 / count;
    return new Array(count).fill(weight);
  }

  /**
   * Select a random variant based on weights
   */
  private selectRandomVariant(): string {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (let i = 0; i < this.config.variants.length; i++) {
      cumulative += this.config.weights[i];
      if (random <= cumulative) {
        return this.config.variants[i];
      }
    }

    // Fallback to first variant
    return this.config.variants[0];
  }

  /**
   * Get or assign variant for a user
   *
   * @param context - Astro context
   * @returns AB test result with assigned variant
   */
  getVariant(context: {
    cookies: AstroGlobal['cookies'];
  }): ABTestResult {
    // Check for existing cookie
    const existingCookie = context.cookies.get(this.cookieName);

    if (existingCookie?.value) {
      // Validate existing variant
      if (this.config.variants.includes(existingCookie.value)) {
        return {
          variant: existingCookie.value,
          isNewAssignment: false,
          cookieValue: existingCookie.value,
        };
      }
    }

    // Assign new variant
    const variant = this.selectRandomVariant();

    // Set cookie
    context.cookies.set(this.cookieName, variant, {
      path: this.config.cookiePath,
      maxAge: this.config.cookieMaxAge * 24 * 60 * 60, // Convert days to seconds
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });

    return {
      variant,
      isNewAssignment: true,
      cookieValue: variant,
    };
  }

  /**
   * Force assign a specific variant (for testing/debugging)
   *
   * @param context - Astro context
   * @param variant - Variant name to assign
   */
  forceVariant(
    context: { cookies: AstroGlobal['cookies'] },
    variant: string
  ): void {
    if (!this.config.variants.includes(variant)) {
      throw new Error(`ABTest: invalid variant "${variant}"`);
    }

    context.cookies.set(this.cookieName, variant, {
      path: this.config.cookiePath,
      maxAge: this.config.cookieMaxAge * 24 * 60 * 60,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
  }

  /**
   * Clear variant assignment
   *
   * @param context - Astro context
   */
  clearVariant(context: { cookies: AstroGlobal['cookies'] }): void {
    context.cookies.delete(this.cookieName, {
      path: this.config.cookiePath,
    });
  }

  /**
   * Get test configuration
   */
  getConfig(): Readonly<Required<ABTestConfig>> {
    return { ...this.config };
  }
}

/**
 * Create an A/B test instance
 *
 * @param name - Test identifier
 * @param config - Test configuration (optional)
 * @returns ABTest instance
 *
 * @example
 * ```typescript
 * const homepageTest = createABTest('homepage-redesign', {
 *   variants: ['control', 'new-design'],
 * });
 * ```
 */
export function createABTest(
  name: string,
  config: Omit<ABTestConfig, 'name'>
): ABTest {
  return new ABTest({ name, ...config });
}

/**
 * Feature flag utility (simple on/off test)
 *
 * @param name - Flag name
 * @param percentage - Percentage of users to enable (0-100)
 * @returns ABTest instance with 'enabled' and 'disabled' variants
 *
 * @example
 * ```typescript
 * const betaFeature = createFeatureFlag('beta-dashboard', 20); // 20% enabled
 * const { variant } = betaFeature.getVariant(context);
 * if (variant === 'enabled') {
 *   // Show beta dashboard
 * }
 * ```
 */
export function createFeatureFlag(name: string, percentage: number): ABTest {
  if (percentage < 0 || percentage > 100) {
    throw new Error('createFeatureFlag: percentage must be between 0 and 100');
  }

  return new ABTest({
    name: `ff-${name}`,
    variants: ['enabled', 'disabled'],
    weights: [percentage, 100 - percentage],
  });
}

export default { createABTest, createFeatureFlag };
