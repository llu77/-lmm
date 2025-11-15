# GitHub Copilot Instructions for LMM Project

## Project Overview

This is a comprehensive financial management system (LMM - نظام LMM للإدارة المالية) built with modern web technologies. The system includes payroll management, expense tracking, revenue management, employee requests, and an AI-powered assistant with full Arabic language support and RTL (right-to-left) text direction.

## Repository Structure

This is a **monorepo** with the following workspaces:

- **Root**: Main monorepo coordination and shared dependencies
- **symbolai-worker**: Astro-based frontend with Cloudflare Workers
- **cloudflare-worker**: Additional Cloudflare Workers functionality  
- **my-mcp-server-github-auth**: MCP (Model Context Protocol) server with GitHub authentication

## Build and Development

### Installation
```bash
npm install              # Install root dependencies
npm run install:all      # Install all workspace dependencies
```

### Building
```bash
npm run build            # Build all workspaces
npm run build:workers    # Build worker packages only
npm run build:mcp        # Build MCP server only
```

### Development
```bash
npm run dev              # Start development server
npm run dev:workers      # Run workers in development mode
```

### Type Checking
```bash
npm run type-check       # Run TypeScript type checking (no emit)
```

### Linting
```bash
npm run lint             # Run ESLint on all files
```

### Testing
```bash
npm run test             # Run tests (currently placeholder)
```

## Key Technologies

### Frontend Stack
- **React 18.3** with React Router v7
- **TypeScript 5.9** with strict mode enabled
- **Astro v4** for static site generation
- **Radix UI** for accessible component primitives
- **TanStack Query** for data fetching and caching
- **Cloudflare Workers** for edge computing

### Build & Development Tools
- **ESLint 9** with TypeScript ESLint
- **Wrangler 4** for Cloudflare Workers deployment
- **Node 18.20.8+** and npm 9+ required

### Language Support
- Full **Arabic (RTL)** language support
- **NativeBase v3.4** design system with 200+ colors
- Dark mode support with WCAG 3.0 APCA compliance

## Coding Guidelines

### File Paths
- Use absolute paths with `@/*` alias for imports (e.g., `@/components/ui/button`)
- Path alias is configured in `tsconfig.json`

### TypeScript
- Use **strict mode** (enabled in tsconfig.json)
- Avoid `any` types (warn level in ESLint)
- Prefer type inference where possible
- Use React 18 JSX transform (`jsx: "react-jsx"`)

### React Components
- Use functional components with hooks
- Follow React 18 best practices
- Use proper TypeScript types for props

### Code Style
- ESLint configuration is in `eslint.config.js` (flat config format)
- Console statements are allowed (`no-console: off`)
- Unused variables trigger warnings, not errors

### Module System
- Use **ES modules** (`type: "module"` in package.json)
- Use `import/export` syntax (not `require`)
- Module resolution is set to "bundler"

## Important Files and Directories

### Configuration Files
- `package.json` - Monorepo root configuration with workspace definitions
- `tsconfig.json` - TypeScript configuration with strict mode
- `eslint.config.js` - ESLint flat config
- `wrangler.toml` / `wrangler.jsonc` - Cloudflare Workers configuration

### Build Artifacts (Excluded)
The following directories should **not** be modified:
- `node_modules/` - Dependencies (managed by npm)
- `dist/` - Build output
- `build/` - Build output
- `.wrangler/` - Wrangler cache
- `coverage/` - Test coverage reports

### Special Directories
- `.github/agents/` - Custom Copilot agents (do not modify without explicit request)
- `cloudflare-analysis/` - Analysis artifacts (excluded from linting)
- `cloudflare-migration/` - Migration artifacts (excluded from linting)
- `symbolai-migration/` - Migration artifacts (excluded from linting)

## Workspace-Specific Notes

### symbolai-worker
- Astro-based frontend application
- Contains design system tokens (theme/colors.ts, typography.ts, spacing.ts)
- Handles main UI and user interactions

### cloudflare-worker
- Serverless functions on Cloudflare's edge network
- Separate Wrangler configuration

### my-mcp-server-github-auth
- MCP server implementation
- GitHub authentication integration

## Testing Strategy

**Note**: Test infrastructure is minimal. When adding tests:
- Follow existing patterns in the repository
- Use the same testing framework as other tests (if present)
- Run `npm test` to execute tests
- Tests are not currently blocking builds

## Common Tasks

### Adding Dependencies
```bash
# Root dependency
npm install <package>

# Workspace-specific dependency
cd <workspace> && npm install <package>
```

### Deploying
```bash
npm run deploy           # Build and deploy to Cloudflare
```

### Cleaning
```bash
npm run clean            # Remove all node_modules
npm run clean:workers    # Clean worker workspaces only
npm run clean:mcp        # Clean MCP workspace only
```

### Auditing
```bash
npm run audit            # Run security audit on all workspaces
```

## Best Practices for Issues

When assigned issues for this repository:

1. **Understand the monorepo structure** - Changes may span multiple workspaces
2. **Run type checking** after changes - `npm run type-check`
3. **Run linting** after code changes - `npm run lint`
4. **Test builds** before finalizing - `npm run build`
5. **Respect RTL/Arabic support** - Ensure changes work with RTL text direction
6. **Follow existing patterns** - Match the style and structure of existing code
7. **Consider edge deployment** - Remember this runs on Cloudflare Workers
8. **Minimal changes** - Make surgical, focused changes to achieve the goal

## Arabic Language Support

This project has extensive Arabic language support:
- All UI text should support Arabic
- Use RTL-aware components and layouts
- Test changes with Arabic content
- Maintain existing Arabic translations

## Security Considerations

- Never commit secrets or API keys
- Use environment variables for sensitive configuration
- Follow Cloudflare Workers security best practices
- Validate user input appropriately

## Additional Resources

- See individual workspace README files for more specific guidance
- Check `*.md` files in root for additional documentation
- Review existing components before creating new ones
