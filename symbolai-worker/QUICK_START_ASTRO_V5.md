# Quick Start: Astro 5.x

## 🚀 Getting Started

### Installation
```bash
cd symbolai-worker
npm install
```

### Generate Types
```bash
npm run sync
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## 📝 Adding New Content

### 1. Create Markdown File
```bash
# Create file in src/content/docs/
touch src/content/docs/my-new-doc.md
```

### 2. Add Frontmatter
```markdown
---
title: My Document Title
description: Brief description
pubDate: 2024-11-13
author: Your Name
tags: ['tag1', 'tag2']
draft: false
---

# Your Content Here

Write your markdown content...
```

### 3. Update Types
```bash
npm run sync
```

### 4. Access Content
```typescript
import { getCollection } from 'astro:content';

const doc = await getEntry('docs', 'my-new-doc');
```

## 🏗️ Project Structure

```
symbolai-worker/
├── .astro/              # Auto-generated (don't edit)
│   └── types.d.ts
├── src/
│   ├── content/         # Your content here
│   │   └── docs/        # Documentation files
│   ├── content.config.ts # Collection definitions
│   ├── pages/           # Routes
│   │   ├── docs.astro   # /docs
│   │   └── docs/
│   │       └── [...slug].astro  # /docs/*
│   └── layouts/
│       └── MainLayout.astro
└── ASTRO_V5_GUIDE.md   # Full documentation
```

## 🔍 Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run sync` | Generate types |
| `npm run type-check` | Check TypeScript |
| `npm run preview` | Preview build |
| `npm run deploy` | Deploy to Cloudflare |

## 📚 Content Collections

### Query All Documents
```typescript
import { getCollection } from 'astro:content';

const docs = await getCollection('docs');
```

### Filter Documents
```typescript
const published = await getCollection('docs', ({ data }) => {
  return data.draft === false;
});
```

### Get Single Document
```typescript
import { getEntry } from 'astro:content';

const doc = await getEntry('docs', 'getting-started');
```

### Render Content
```typescript
import { render } from 'astro:content';

const { Content, headings } = await render(doc);
```

## 🎨 View Transitions

Already configured in `MainLayout.astro`:

```astro
---
import { ClientRouter } from 'astro:transitions';
---

<head>
  <ClientRouter />
</head>
```

## 📖 Full Documentation

- **Implementation Guide:** `ASTRO_V5_GUIDE.md`
- **Architecture:** `ASTRO_V5_ARCHITECTURE.md`
- **Summary:** Root directory `ASTRO_V5_IMPLEMENTATION_SUMMARY.md`

## 🆘 Troubleshooting

### Types not updating?
```bash
npm run sync
```

### Build failing?
```bash
# Clean and rebuild
rm -rf dist/ .astro/
npm run build
```

### Type errors?
```bash
npm run type-check
```

## ✨ Features

✅ Auto-generated types  
✅ Type-safe content queries  
✅ View transitions  
✅ Content Layer API  
✅ SSR with Cloudflare  
✅ Islands Architecture  
✅ RTL support  

## 🔗 Resources

- [Astro Docs](https://docs.astro.build/)
- [Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [View Transitions](https://docs.astro.build/en/guides/view-transitions/)
- [Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
