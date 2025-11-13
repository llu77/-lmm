/**
 * Content Collections Configuration with Content Layer API
 * 
 * Astro 5.x introduces the Content Layer API with enhanced performance
 * and scalability for loading content.
 * 
 * @see https://docs.astro.build/en/guides/content-collections/
 */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Documentation Collection
 * 
 * Uses the new glob() loader for file-based content with enhanced performance.
 * This replaces the legacy `type: 'content'` pattern.
 */
const docs = defineCollection({
  loader: glob({ 
    pattern: '**/*.md', 
    base: './src/content/docs' 
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('SymbolAI Team'),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

/**
 * Export all collections
 * 
 * Collections are accessible via:
 * - getCollection('docs') - Get all entries
 * - getEntry('docs', 'example') - Get single entry
 */
export const collections = {
  docs,
};
