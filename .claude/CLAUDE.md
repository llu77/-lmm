# LMM Financial Management System - Claude Code Guide

This document provides comprehensive guidance for AI assistants working on this codebase.

## Project Overview

**LMM** (نظام إدارة مالية) is a production-ready Arabic-first financial management system built as a monorepo. It's an enterprise ERP system with full RTL support for:

- Payroll and employee compensation management
- Revenue and expense tracking
- Employee requests and approval workflows
- Product orders and inventory
- AI-assisted financial analysis (Claude integration)
- Multi-branch operations with security controls

**Version**: 2.0.0 | **Status**: Production Ready

## Repository Structure

```
lmm/
├── src/                          # React frontend (legacy/reference)
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Main router
│   ├── pages/                    # Page components (15+ routes)
│   ├── components/
│   │   └── ui/                   # 65+ reusable UI components
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utilities (api-client, pdf-export)
│   └── types/                    # TypeScript definitions
│
├── symbolai-worker/              # Main Astro + Cloudflare Workers backend
│   ├── src/
│   │   ├── pages/                # Astro pages (20+ routes)
│   │   ├── components/           # React components for Astro
│   │   ├── layouts/              # Page layouts
│   │   ├── lib/                  # Core libraries
│   │   │   ├── db.ts             # D1 database utilities
│   │   │   ├── ai.ts             # Claude AI integration
│   │   │   ├── session.ts        # Session management
│   │   │   ├── permissions.ts    # RBAC system
│   │   │   ├── mcp-client.ts     # MCP client library
│   │   │   └── reasoningbank/    # AI reasoning persistence
│   │   ├── middleware.ts         # Astro middleware
│   │   ├── theme/                # Design tokens (colors, typography)
│   │   └── styles/               # Global CSS
│   ├── migrations/               # D1 database migrations
│   ├── astro.config.mjs          # Astro configuration
│   └── wrangler.toml             # Cloudflare Workers config
│
├── cloudflare-worker/            # Simple Cloudflare Worker
├── my-mcp-server-github-auth/    # MCP server for GitHub OAuth
│
├── .claude/                      # Claude Code configuration
│   ├── CLAUDE.md                 # This file
│   ├── settings.json             # MCP servers and settings
│   ├── commands/                 # Custom slash commands
│   └── output-styles/            # Response style presets
│
├── .github/
│   ├── workflows/                # CI/CD pipelines
│   ├── agents/                   # GitHub Copilot agents
│   └── dependabot.yml            # Automated dependency updates
│
└── docs/                         # Additional documentation
```

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 4.1.x | Styling with RTL utilities |
| Radix UI | Latest | Headless UI components |
| React Hook Form | 7.66.1 | Form state management |
| Zod | 4.1.13 | Schema validation |
| Recharts | 3.5.0 | Data visualization |

### Backend/Edge
| Technology | Version | Purpose |
|------------|---------|---------|
| Astro | 5.16.0 | Meta-framework |
| Cloudflare Workers | Latest | Edge computing |
| Cloudflare D1 | Latest | SQLite database at edge |
| Cloudflare KV | Latest | Key-value storage |
| Cloudflare R2 | Latest | Object storage (PDFs) |

### AI & Integration
| Technology | Version | Purpose |
|------------|---------|---------|
| @anthropic-ai/sdk | 0.70.1 | Claude AI integration |
| @modelcontextprotocol/sdk | 1.22.0 | MCP protocol |
| Resend | 6.5.2 | Email delivery |
| jsPDF | 3.0.4 | PDF generation |

### Development Tools
| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥18.20.8 | Runtime |
| npm | ≥9.0.0 | Package manager |
| Wrangler | 4.50.0 | Cloudflare CLI |
| ESLint | 9.16.0 | Code linting |

## Development Workflows

### Quick Start

```bash
# Install dependencies (all workspaces)
npm run install:all

# Development server (main worker)
npm run dev

# Or for symbolai-worker specifically:
cd symbolai-worker && npm run dev
```

### Build Commands

```bash
# Build all workspaces
npm run build

# Build only workers
npm run build:workers

# Build only MCP server
npm run build:mcp

# Type checking
npm run type-check

# Linting
npm run lint
```

### Deployment

```bash
# Deploy to Cloudflare
npm run deploy

# Preview deployment (symbolai-worker)
cd symbolai-worker && npm run deploy:preview
```

### Maintenance

```bash
# Clean all node_modules
npm run clean

# Update all dependencies
npm run update

# Security audit
npm run audit
```

## Key Entry Points

| File | Purpose |
|------|---------|
| `src/main.tsx` | React frontend entry |
| `src/App.tsx` | Main router configuration |
| `symbolai-worker/src/middleware.ts` | Astro/Cloudflare middleware |
| `symbolai-worker/src/lib/db.ts` | Database utilities |
| `symbolai-worker/src/lib/ai.ts` | AI/Claude integration |

## Coding Conventions

### TypeScript

- Use strict TypeScript with `noEmit` for type checking
- Define types in `src/types/` or co-located with components
- Prefer interfaces over type aliases for objects
- Use Zod schemas for runtime validation

### React Components

```tsx
// Use functional components with TypeScript
interface Props {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: Props) {
  // Component logic
}
```

### RTL/Arabic Support

```tsx
// Use logical properties for RTL support
<div className="ps-4 pe-2 ms-auto text-start">
  {/* ps = padding-inline-start, pe = padding-inline-end */}
  {/* ms = margin-inline-start, text-start = right in RTL */}
</div>
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `BranchSelector.tsx`)
- Utilities: `kebab-case.ts` (e.g., `api-client.ts`)
- Pages: `kebab-case.tsx` or `index.tsx` in folders
- Types: `types.ts` or `*.types.ts`

### Imports

```tsx
// Preferred import order:
// 1. React/framework imports
import { useState } from 'react';

// 2. External libraries
import { useForm } from 'react-hook-form';

// 3. Internal components (use @ alias)
import { Button } from '@/components/ui/button';

// 4. Utilities and types
import { cn } from '@/lib/utils';
import type { User } from '@/types';
```

## Database (Cloudflare D1)

### Migrations Location
`symbolai-worker/migrations/`

### Key Tables
- `employees` - Employee records
- `revenues` - Income tracking
- `expenses` - Expense tracking
- `payroll` - Payroll records
- `requests` - Employee requests
- `sessions` - User sessions

### Database Operations
```typescript
// Use lib/db.ts utilities
import { getDB } from '@/lib/db';

const db = getDB(env);
const result = await db.prepare('SELECT * FROM employees').all();
```

## Environment Variables

### Required Secrets (set via Wrangler)
- `ANTHROPIC_API_KEY` - Claude AI API key
- `RESEND_API_KEY` - Email service key
- `SESSION_SECRET` - Session encryption

### Cloudflare Bindings (in wrangler.toml)
- `DB` - D1 database
- `KV_SESSIONS` - Session storage
- `KV_CACHE` - General cache
- `R2_STORAGE` - File storage

## CI/CD Pipelines

Located in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `cloudflare-workers-deploy.yml` | Push to main | Full deployment |
| `cloudflare-pages-deploy.yml` | Push/PR | Pages deployment |
| `claude.yml` | @claude mention | AI code assistance |
| `claude-code-review.yml` | PR opened | Automated review |

### Deployment Flow
1. Build verification (type-check, lint)
2. Deploy symbolai-worker to Cloudflare Workers
3. Deploy cloudflare-worker
4. Deploy to Cloudflare Pages
5. Post deployment summary

## Testing

### Current State
- Test placeholder: `npm run test`
- Security tests: `npm run security:test` (password hashing)
- MCP tests: `npm run test:mcp`

### Recommended Stack
- **Unit**: Vitest or Jest
- **Integration**: React Testing Library
- **E2E**: Playwright or Cypress

## Important Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| System Spec | `LMM_SYSTEM_SPECIFICATION.json` | Complete system specification |
| Deployment | `DEPLOYMENT_GUIDE.md` | Deployment instructions |
| Astro Guide | `ASTRO_V5_ARCHITECTURE.md` | Astro 5 architecture |
| MCP Guide | `MCP_ARCHITECTURE.md` | MCP integration |
| Security | `COMPREHENSIVE_SECURITY_AUDIT_REPORT.md` | Security audit |

---

## Claude Code Configuration

### Directory Structure

```
.claude/
├── CLAUDE.md              # This file
├── settings.json          # Project MCP servers
├── settings.local.json    # User-specific (gitignored)
├── commands/              # Custom slash commands
│   └── dedupe.md          # Dependency deduplication
├── output-styles/         # Response style presets
│   ├── code-reviewer.md
│   ├── documentation-writer.md
│   ├── api-designer.md
│   ├── python-expert.md
│   └── test-specialist.md
└── MCP_SETUP.md           # MCP configuration guide
```

### MCP Servers

Configured in `settings.json`:
- **Cloudflare AI** - AI operations
- **Cloudflare Docs** - Documentation search
- **Cloudflare Workers** - Infrastructure management
- **Figma** - Design integration

### Output Styles

Output styles customize Claude's responses for specific tasks:

```markdown
---
name: Style Name
description: Brief description
---

System prompt content here.
```

**Available Styles:**
- `code-reviewer.md` - Thorough code review with security focus
- `documentation-writer.md` - Clear, comprehensive documentation
- `test-specialist.md` - Test-driven development assistance
- `api-designer.md` - RESTful API design patterns
- `python-expert.md` - Python best practices

### Custom Commands

Create commands in `.claude/commands/*.md`:

```markdown
---
name: command-name
description: What it does
---

Command prompt content.
```

---

## AI Assistant Guidelines

When working on this codebase:

1. **Language**: Code in English, UI text in Arabic. Comments in English.

2. **RTL Awareness**: Always use logical CSS properties (`ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`) instead of directional ones.

3. **Type Safety**: Maintain strict TypeScript. Don't use `any` without justification.

4. **Component Library**: Prefer existing Radix UI components in `src/components/ui/`.

5. **Security**:
   - Never commit secrets or API keys
   - Use environment variables for sensitive data
   - Validate all user input with Zod

6. **Database**:
   - Use parameterized queries (never string concatenation)
   - Migrations go in `symbolai-worker/migrations/`

7. **Testing**: Add tests for new functionality when possible.

8. **Documentation**: Update relevant docs when making significant changes.

## Quick References

### Common Commands
```bash
npm run dev              # Start dev server
npm run build            # Build all
npm run type-check       # TypeScript check
npm run lint             # ESLint check
npm run deploy           # Deploy to production
```

### Key Paths
- UI Components: `src/components/ui/`
- API Routes: `symbolai-worker/src/pages/api/`
- Database: `symbolai-worker/src/lib/db.ts`
- AI Integration: `symbolai-worker/src/lib/ai.ts`
- Styles: `symbolai-worker/src/styles/globals.css`
- Migrations: `symbolai-worker/migrations/`

### Design System Colors
```
Primary (Cyan):   #06b6d4
Secondary (Pink): #ec4899
Success (Green):  #22c55e
Warning (Orange): #f97316
Danger (Rose):    #f43f5e
Error (Red):      #ef4444
Info (Blue):      #0ea5e9
```

---

## Additional Resources

- [Claude Code Docs](https://docs.claude.com/en/docs/claude-code)
- [Astro Documentation](https://docs.astro.build)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/docs/primitives)
