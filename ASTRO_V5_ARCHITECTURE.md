# Astro 5.x Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Astro 5.x Application                       │
│                     (symbolai-worker/)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │         Configuration Layer              │
        ├──────────────────────────────────────────┤
        │ • astro.config.mjs                       │
        │   - Output: 'server' (SSR)              │
        │   - Adapter: @astrojs/cloudflare        │
        │   - Integrations: React                  │
        │                                          │
        │ • tsconfig.json                          │
        │   - Extends: astro/tsconfigs/base       │
        │   - Include: .astro/types.d.ts          │
        └──────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │       Type Generation (astro sync)       │
        ├──────────────────────────────────────────┤
        │ .astro/                                  │
        │ ├── types.d.ts       ← Auto-generated   │
        │ ├── content.d.ts     ← Content types    │
        │ └── collections/     ← Metadata         │
        │                                          │
        │ src/env.d.ts                             │
        │ └── /// <reference path="../.astro/..." │
        └──────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │          Content Layer API               │
        ├──────────────────────────────────────────┤
        │ src/content.config.ts                    │
        │                                          │
        │ ┌──────────────────────────────────┐   │
        │ │ defineCollection({                │   │
        │ │   loader: glob({                  │   │
        │ │     pattern: '**/*.md',           │   │
        │ │     base: './src/content/docs'    │   │
        │ │   }),                              │   │
        │ │   schema: z.object({...})         │   │
        │ │ })                                 │   │
        │ └──────────────────────────────────┘   │
        │                                          │
        │ Content Collections:                     │
        │ └── docs/                                │
        │     ├── getting-started.md               │
        │     └── astro-v5-features.md            │
        └──────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │            Layout System                 │
        ├──────────────────────────────────────────┤
        │ src/layouts/MainLayout.astro             │
        │                                          │
        │ <head>                                   │
        │   <ClientRouter /> ← View Transitions    │
        │ </head>                                  │
        │                                          │
        │ <body>                                   │
        │   <header> Navigation </header>          │
        │   <main> <slot /> </main>               │
        │   <footer> Footer </footer>              │
        │ </body>                                  │
        └──────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │          Pages & Routes                  │
        ├──────────────────────────────────────────┤
        │ src/pages/                               │
        │ ├── index.astro          /               │
        │ ├── dashboard.astro      /dashboard      │
        │ ├── docs.astro           /docs          │
        │ └── docs/                                │
        │     └── [...slug].astro  /docs/*        │
        │                                          │
        │ Dynamic Content Rendering:               │
        │ ┌──────────────────────────────────┐   │
        │ │ const doc = await getEntry(...)   │   │
        │ │ const { Content } = await render()│   │
        │ │ <Content />                       │   │
        │ └──────────────────────────────────┘   │
        └──────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │         Build & Deployment               │
        ├──────────────────────────────────────────┤
        │ npm run build                            │
        │ └── Generates: dist/                     │
        │     ├── _worker.js    ← Cloudflare      │
        │     ├── _astro/       ← Static assets   │
        │     └── _routes.json  ← Routing         │
        │                                          │
        │ npm run deploy                           │
        │ └── Deploys to Cloudflare Workers       │
        └──────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Cloudflare Edge    │
│  (Workers)          │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Astro SSR          │
│  Server Rendering   │
└──────┬──────────────┘
       │
       ├──→ Static Pages (0 JS)
       │    └─→ HTML + CSS
       │
       ├──→ Content Collections
       │    ├─→ getCollection()
       │    ├─→ Type-safe queries
       │    └─→ Zod validation
       │
       └──→ Interactive Islands
            ├─→ React components
            ├─→ client:load
            └─→ Selective hydration
       │
       ▼
┌─────────────────────┐
│  Response           │
│  - HTML (SSR)       │
│  - CSS (optimized)  │
│  - JS (minimal)     │
└─────────────────────┘
```

## Islands Architecture

```
┌───────────────────────────────────────────────────┐
│                   HTML Page                        │
│  ┌─────────────────────────────────────────┐     │
│  │      Static Server-Rendered Content       │     │
│  │                (0 JS)                      │     │
│  └─────────────────────────────────────────┘     │
│                                                    │
│  ┌─────────────────┐    ┌──────────────────┐    │
│  │  Island 1        │    │  Island 2         │    │
│  │  (React)         │    │  (React)          │    │
│  │  client:load     │    │  client:visible   │    │
│  └─────────────────┘    └──────────────────┘    │
│                                                    │
│  ┌─────────────────────────────────────────┐     │
│  │      Static Server-Rendered Content       │     │
│  │                (0 JS)                      │     │
│  └─────────────────────────────────────────┘     │
│                                                    │
│  ┌─────────────────┐                              │
│  │  Island 3        │                              │
│  │  (React)         │                              │
│  │  client:idle     │                              │
│  └─────────────────┘                              │
└───────────────────────────────────────────────────┘
```

## Content Collection Flow

```
┌──────────────────┐
│  Markdown Files  │
│  src/content/    │
│  └── docs/       │
│      ├── *.md    │
│      └── *.md    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ content.config.ts│
│ - glob() loader  │
│ - Zod schema     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   astro sync     │
│ Type Generation  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│  .astro/content.d.ts          │
│  - Auto-generated types       │
│  - Collection interfaces      │
│  - Entry types                │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Type-Safe Queries            │
│  - getCollection('docs')      │
│  - getEntry('docs', 'slug')   │
│  - IntelliSense support       │
└───────────────────────────────┘
```

## View Transitions (ClientRouter)

```
Page A                 Page B
┌─────────┐           ┌─────────┐
│         │           │         │
│ Content │  ──────▶  │ Content │
│         │   Smooth  │         │
│         │   Trans.  │         │
└─────────┘           └─────────┘
     │                     │
     └──────────┬──────────┘
                │
                ▼
        ┌──────────────┐
        │ ClientRouter │
        │ - No reload  │
        │ - Preserve   │
        │   state      │
        │ - Animate    │
        └──────────────┘
```

## Type Safety Flow

```
Developer writes:
┌──────────────────────────┐
│ await getCollection(     │
│   'docs',                 │
│   ({ data }) => ...      │
│ )                         │
└────────┬─────────────────┘
         │
         ▼
TypeScript checks:
┌──────────────────────────┐
│ ✓ Collection exists      │
│ ✓ data.title is string   │
│ ✓ data.pubDate is Date   │
│ ✓ All fields validated   │
└────────┬─────────────────┘
         │
         ▼
Runtime execution:
┌──────────────────────────┐
│ ✓ Zod validates data     │
│ ✓ Type-safe access       │
│ ✓ IntelliSense works     │
└──────────────────────────┘
```

## Build Process

```
Source Code
    │
    ├─→ .astro files    ──────┐
    ├─→ .ts files       ──────┤
    ├─→ .tsx files      ──────┤
    ├─→ Content (*.md)  ──────┤
    └─→ Styles (*.css)  ──────┤
                               │
                               ▼
                        ┌──────────────┐
                        │ astro build  │
                        └──────┬───────┘
                               │
                               ├─→ SSR Compilation
                               ├─→ Type Checking
                               ├─→ Content Processing
                               ├─→ Asset Optimization
                               └─→ Route Generation
                               │
                               ▼
                        ┌──────────────┐
                        │    dist/     │
                        ├──────────────┤
                        │ _worker.js   │ ← Cloudflare Worker
                        │ _astro/      │ ← Static assets
                        │ _routes.json │ ← Routing config
                        └──────────────┘
                               │
                               ▼
                        Cloudflare Workers
                        (Edge Deployment)
```

## Component Hierarchy

```
App
├── MainLayout.astro
│   ├── ClientRouter (View Transitions)
│   ├── Header (Navigation)
│   ├── Main (Content Slot)
│   └── Footer
│
├── Pages
│   ├── index.astro (Static)
│   ├── dashboard.astro (SSR)
│   ├── docs.astro (Content List)
│   └── docs/[...slug].astro (Dynamic)
│       ├── getCollection() → Type-safe
│       ├── render() → Markdown
│       └── <Content /> → Rendered HTML
│
└── Components
    ├── Static Components (.astro)
    │   └── Server-rendered, 0 JS
    │
    └── Interactive Components (React)
        ├── client:load → Immediate
        ├── client:idle → Deferred
        └── client:visible → Lazy
```

## Development Workflow

```
1. Create Content
   ├── Write markdown in src/content/docs/
   └── Add frontmatter with schema fields

2. Generate Types
   └── npm run sync
       └── Updates .astro/types.d.ts

3. Build Pages
   ├── Use getCollection() for queries
   ├── Type-safe data access
   └── Render with <Content />

4. Test Locally
   └── npm run build
       └── Verify build output

5. Deploy
   └── npm run deploy
       └── Push to Cloudflare Workers
```

## Key Benefits

```
┌───────────────────────────────────────┐
│         Performance                    │
├───────────────────────────────────────┤
│ ✓ Zero JS by default                  │
│ ✓ Optimized static assets             │
│ ✓ Edge deployment (Cloudflare)        │
│ ✓ Fast content loading (glob loader)  │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│       Developer Experience             │
├───────────────────────────────────────┤
│ ✓ Type safety everywhere              │
│ ✓ Auto-generated types                │
│ ✓ IntelliSense support                │
│ ✓ Hot module replacement              │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│          Scalability                   │
├───────────────────────────────────────┤
│ ✓ Content Layer API                   │
│ ✓ Efficient content loading           │
│ ✓ Type-safe queries                   │
│ ✓ Easy to add more collections        │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│        User Experience                 │
├───────────────────────────────────────┤
│ ✓ SPA-like navigation                 │
│ ✓ Smooth transitions                  │
│ ✓ Fast page loads                     │
│ ✓ Progressive enhancement             │
└───────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────┐
│              Astro 5.15.3                    │
│         Content-First Framework              │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
  ┌─────────┐ ┌─────────┐ ┌──────────┐
  │ React   │ │Cloudflare│ │TypeScript│
  │ 18.3.1  │ │ Workers  │ │  5.9.3   │
  └─────────┘ └─────────┘ └──────────┘
        │           │           │
        └───────────┼───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
  ┌──────────┐          ┌──────────┐
  │ Content  │          │   Zod    │
  │ Layer API│          │  3.25.76 │
  └──────────┘          └──────────┘
```

## Summary

This architecture implements:

1. **Modern Astro 5.x patterns** with Content Layer API and ClientRouter
2. **Type-safe development** with auto-generated types
3. **Islands Architecture** for optimal performance
4. **Edge deployment** on Cloudflare Workers
5. **Content-driven approach** with scalable collections
6. **Developer-friendly** workflow with great DX

All while maintaining **backward compatibility** and following **best practices**.
