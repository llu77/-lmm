# Build Fix for Cloudflare Pages

## Problem

The Cloudflare Pages build was failing with this error:

```
Error: Loading PostCSS Plugin failed: Cannot find module 'tailwindcss'
```

### Root Cause

The project uses **npm workspaces** (monorepo structure), but Cloudflare Pages was only installing dependencies in the **root** directory and not in the workspaces (`symbolai-worker`, `cloudflare-worker`, `my-mcp-server-github-auth`).

**Build Process (Before Fix):**
```bash
1. npm clean-install  # Installs root deps only
2. npm install --legacy-peer-deps  # Custom build command, doesn't install workspace deps
3. npm run build  # FAILS: tailwindcss not found in symbolai-worker
```

## Solution

### Changes Made

#### 1. Added `wrangler.json` (NEW FILE)
```json
{
  "pages_build_output_dir": "symbolai-worker/dist",
  "build": {
    "command": "npm ci --legacy-peer-deps && npm run build"
  }
}
```

**Why:**
- `npm ci` installs **all dependencies including workspaces**
- Faster and more reliable than `npm install`
- Uses `package-lock.json` for deterministic builds

#### 2. Added `postinstall` Script to `package.json`
```json
{
  "scripts": {
    "postinstall": "npm run install:workers && npm run install:mcp"
  }
}
```

**Why:**
- Runs automatically after any `npm install`
- Ensures workspace dependencies are always installed
- Works both locally and on Cloudflare Pages

## How It Works Now

### Cloudflare Pages Build Process (After Fix):

```bash
1. npm clean-install  # Installs root deps
   └─> postinstall hook runs automatically
       └─> npm run install:workers  # Installs symbolai-worker deps (including tailwindcss!)
       └─> npm run install:mcp      # Installs MCP server deps

2. npm ci --legacy-peer-deps  # From wrangler.json (alternative command)
   └─> Also triggers postinstall if run

3. npm run build  # ✅ SUCCESS: All deps available
   └─> npm run build:workers
       └─> cd symbolai-worker && npm run build  # Astro build with tailwindcss
```

## Verification

To test locally:

```bash
# Clean install
rm -rf node_modules */node_modules
npm ci --legacy-peer-deps

# Verify symbolai-worker has node_modules
ls symbolai-worker/node_modules/tailwindcss  # Should exist

# Build
npm run build  # Should succeed
```

## Key Benefits

✅ **Automatic**: `postinstall` runs on every install
✅ **Declarative**: `wrangler.json` documents build config
✅ **Reliable**: `npm ci` ensures consistent builds
✅ **Compatible**: Works with `--legacy-peer-deps` flag

## Cloudflare Pages Configuration

No dashboard changes needed! The `wrangler.json` file will be automatically detected and used by Cloudflare Pages.

**Alternative:** You can also update the build command in Cloudflare Pages dashboard to:
```
npm ci --legacy-peer-deps && npm run build
```

## Notes

- The `postinstall` script uses `|| true` flags in workspace installs to prevent build failures if a workspace has issues
- The build continues even if `cloudflare-worker` or `my-mcp-server-github-auth` fail to build (`|| true` in build:workers)
- Main requirement: `symbolai-worker` must build successfully for Pages deployment

## Testing

Before deploying:
1. Clone repo fresh
2. Run `npm ci --legacy-peer-deps`
3. Verify `symbolai-worker/node_modules/tailwindcss` exists
4. Run `npm run build`
5. Check `symbolai-worker/dist` directory exists

---

**Fixed By:** Claude Code (Ultra-Think Mode)
**Date:** 2025-11-16
**Issue:** Cloudflare Pages build failing due to missing workspace dependencies
**Solution:** Multi-layer approach with `postinstall` + `wrangler.json`
