# Astro 5.x Implementation Guide

This document describes how this project implements Astro 5.x best practices and features.

## Overview

This project uses **Astro 5.15.3** with the following modern features:
- 🏝️ **Islands Architecture** - Server-first rendering with selective client-side hydration
- 📦 **Content Layer API** - Enhanced content loading with `glob()` loaders
- 🎨 **ClientRouter** - SPA-like navigation with view transitions
- 🔒 **TypeScript** - Auto-generated types with `astro sync`
- ⚡ **Cloudflare Workers** - Edge deployment with SSR support

## Key Astro 5.x Features Implemented

### 1. Auto-Generated Types

Types are now auto-generated in `.astro/types.d.ts` instead of manual `src/env.d.ts`:

```bash
# Generate/update type definitions
npm run astro sync
```

**Configuration:** `tsconfig.json`
```json
{
  "extends": "astro/tsconfigs/base",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

**Reference in env.d.ts:**
```typescript
/// <reference path="../.astro/types.d.ts" />
```

### 2. Content Layer API

Using the new `glob()` loader for enhanced performance:

**Configuration:** `src/content.config.ts`
```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ 
    pattern: '**/*.md', 
    base: './src/content/docs' 
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    author: z.string().default('SymbolAI Team'),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { docs };
```

**Usage:**
```typescript
import { getCollection, getEntry } from 'astro:content';

// Get all entries with type safety
const allDocs = await getCollection('docs');

// Filter entries
const published = await getCollection('docs', ({ data }) => {
  return data.draft === false;
});

// Get single entry
const doc = await getEntry('docs', 'getting-started');
```

### 3. ClientRouter for View Transitions

Replaces the old `<ViewTransitions />` component:

**Implementation:** `src/layouts/MainLayout.astro`
```astro
---
import { ClientRouter } from 'astro:transitions';
---

<html>
<head>
  <ClientRouter />
</head>
<body>
  <slot />
</body>
</html>
```

**Benefits:**
- SPA-like navigation without full page reloads
- Preserve state across page navigations
- Smooth transitions between pages
- Better user experience

### 4. Islands Architecture

This project follows the Islands Architecture pattern:

**Server Components (Default):**
- `.astro` files render on the server
- Zero JavaScript by default
- Optimal performance

**Interactive Islands:**
- Use React components with client directives when needed
- Strategic hydration with `client:load`, `client:idle`, `client:visible`

**Example:**
```astro
---
import InteractiveForm from '@/components/InteractiveForm';
---

<!-- Server-rendered, zero JS -->
<div>Static content</div>

<!-- Interactive island, hydrates on page load -->
<InteractiveForm client:load />
```

## Project Structure

```
symbolai-worker/
├── .astro/                     # Auto-generated types (run astro sync)
│   ├── types.d.ts             # Main type definitions
│   └── content.d.ts           # Content collection types
│
├── src/
│   ├── content/               # Content collections
│   │   └── docs/              # Documentation markdown files
│   │       ├── getting-started.md
│   │       └── astro-v5-features.md
│   │
│   ├── content.config.ts      # Content Layer API configuration
│   │
│   ├── pages/                 # File-based routing
│   │   ├── index.astro        # Landing page
│   │   ├── docs.astro         # Documentation list
│   │   └── docs/
│   │       └── [...slug].astro # Dynamic doc pages
│   │
│   ├── layouts/
│   │   └── MainLayout.astro   # Main layout with ClientRouter
│   │
│   ├── components/            # UI components
│   │   └── ...
│   │
│   ├── env.d.ts              # References auto-generated types
│   └── styles/
│       └── globals.css       # Global styles
│
├── astro.config.mjs          # Astro configuration
├── tsconfig.json             # TypeScript config (v5.0 pattern)
└── package.json
```

## Development Workflow

### 1. Initial Setup

```bash
# Install dependencies
npm install

# Generate types
npm run astro sync
```

### 2. Development

```bash
# Start dev server
npm run dev

# Open http://localhost:4321
```

### 3. Adding Content

Create markdown files in `src/content/docs/`:

```markdown
---
title: Your Title
description: Brief description
pubDate: 2024-11-13
author: Your Name
tags: ['tag1', 'tag2']
draft: false
---

# Your Content

Write your markdown here...
```

Run `astro sync` to update types:
```bash
npm run astro sync
```

### 4. Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### 5. Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## Best Practices Implemented

### ✅ TypeScript Integration
- Using `astro/tsconfigs/base` for v5.0 compatibility
- Auto-generated types with `astro sync`
- Type-safe content queries
- Strict TypeScript checking

### ✅ Content Collections
- Modern Content Layer API with `glob()` loader
- Zod schema validation
- Type-safe frontmatter
- Efficient content loading

### ✅ Performance Optimization
- Zero JavaScript by default
- Strategic client-side hydration
- Optimized static assets
- Edge deployment on Cloudflare

### ✅ Developer Experience
- Hot module replacement
- Fast builds with Content Layer API
- Type safety throughout
- Clear project structure

### ✅ SEO & Accessibility
- Semantic HTML structure
- Proper meta tags in layouts
- RTL support for Arabic content
- Accessible navigation

### ✅ View Transitions
- ClientRouter for smooth navigation
- State preservation across pages
- Enhanced user experience

## Migration from v4.x to v5.x

If you're migrating an existing Astro project:

1. **Update tsconfig.json:**
   ```json
   {
     "extends": "astro/tsconfigs/base",
     "include": [".astro/types.d.ts", "**/*"]
   }
   ```

2. **Replace ViewTransitions with ClientRouter:**
   ```astro
   // Old (v4.x)
   import { ViewTransitions } from 'astro:transitions';
   
   // New (v5.x)
   import { ClientRouter } from 'astro:transitions';
   ```

3. **Update Content Collections:**
   ```typescript
   // Old (v4.x)
   const docs = defineCollection({
     type: 'content',
     schema: z.object({...})
   });
   
   // New (v5.x)
   import { glob } from 'astro/loaders';
   
   const docs = defineCollection({
     loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
     schema: z.object({...})
   });
   ```

4. **Run astro sync:**
   ```bash
   npm run astro sync
   ```

5. **Update env.d.ts:**
   ```typescript
   /// <reference path="../.astro/types.d.ts" />
   ```

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run astro sync       # Generate/update types

# Building
npm run build            # Build for production
npm run preview          # Preview build locally

# Deployment
npm run deploy           # Deploy to Cloudflare

# Type checking
npm run type-check       # Run TypeScript type check

# Linting
npm run lint            # Run ESLint
```

## Resources

- [Astro 5.x Documentation](https://docs.astro.build/)
- [Content Collections Guide](https://docs.astro.build/en/guides/content-collections/)
- [View Transitions Guide](https://docs.astro.build/en/guides/view-transitions/)
- [Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [TypeScript Guide](https://docs.astro.build/en/guides/typescript/)

## Examples

### Querying Content Collections

```astro
---
import { getCollection, getEntry } from 'astro:content';

// Get all docs
const allDocs = await getCollection('docs');

// Filter published docs
const published = await getCollection('docs', ({ data }) => {
  return data.draft === false;
});

// Sort by date
const sorted = published.sort((a, b) => 
  b.data.pubDate.getTime() - a.data.pubDate.getTime()
);

// Get single entry
const doc = await getEntry('docs', 'getting-started');
---
```

### Rendering Content

```astro
---
import { render } from 'astro:content';

const doc = await getEntry('docs', 'example');
const { Content, headings } = await render(doc);
---

<article>
  <h1>{doc.data.title}</h1>
  <Content />
</article>
```

### Using ClientRouter

```astro
---
import { ClientRouter } from 'astro:transitions';
---

<html>
<head>
  <ClientRouter />
</head>
<body>
  <!-- Navigation will be smooth between pages -->
  <nav>
    <a href="/">Home</a>
    <a href="/docs">Docs</a>
  </nav>
  <slot />
</body>
</html>
```

## Support

For issues or questions:
- Check [Astro Discord](https://astro.build/chat)
- Review [GitHub Issues](https://github.com/withastro/astro/issues)
- Read the [Documentation](https://docs.astro.build/)
