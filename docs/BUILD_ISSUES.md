# Build Issues and Resolutions

## Current Build Issues

### 1. React Version Mismatch (HIGH PRIORITY)

**Status**: ❌ Blocking production builds

**Error**:
```
Minified React error #527
React versions: 18.3.1 vs 19.2.0
```

**Impact**: The symbolai-worker build fails at the final step due to conflicting React versions being bundled together.

**Root Cause**: Multiple versions of React are installed in the dependency tree:
- Some packages depend on React 18.3.1
- Other packages require React 19.2.0

**Solution Options**:

#### Option 1: Force Single React Version (Recommended)
Add resolutions to `package.json`:

```json
{
  "resolutions": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "overrides": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
```

Then run:
```bash
npm install --legacy-peer-deps --ignore-scripts
```

#### Option 2: Update All Packages to React 19
Update all React-dependent packages to versions compatible with React 19.2.0.

**Affected Files**:
- `symbolai-worker/package.json`
- Root `package.json`

**Next Steps**:
1. Audit React dependencies: `npm list react react-dom`
2. Choose React version (18.3.1 recommended for stability)
3. Add resolutions/overrides to package.json
4. Test build: `npm run build:workers`
5. Update documentation once resolved

---

### 2. NPM Postinstall Script Infinite Loop

**Status**: ✅ RESOLVED

**Issue**: The postinstall script in root `package.json` created an infinite loop by triggering nested npm installs.

**Solution**: CI/CD workflow now uses `--ignore-scripts` flag:
```bash
npm install --legacy-peer-deps --ignore-scripts
```

**Files Updated**:
- `.github/workflows/cloudflare-workers-deploy.yml`

**Alternative Solution** (for local development):
Update `package.json` postinstall script to prevent recursion:
```json
{
  "scripts": {
    "postinstall": "[ -z \"$SKIP_POSTINSTALL\" ] && npm run install:workers && npm run install:mcp || true"
  }
}
```

Then run:
```bash
SKIP_POSTINSTALL=1 npm install
```

---

## Build Warnings (Non-blocking)

### Zod Export Warnings

**Status**: ⚠️ Non-blocking, but should be addressed

**Warnings**:
```
"toJSONSchema" is not exported by zod
"safeParseAsync" is not exported by zod
"looseObject" is not exported by zod
"base64" is not exported by zod
```

**Impact**: May cause issues with AI SDK functionality

**Solution**: Update `@ai-sdk/provider-utils` and `ai` packages to versions compatible with installed Zod version.

---

## Testing Builds

### Local Build Test
```bash
# Install dependencies
npm install --legacy-peer-deps --ignore-scripts

# Build all workers
npm run build:workers

# Build specific worker
cd symbolai-worker && npm run build
```

### CI/CD Build Test
The GitHub Actions workflow automatically runs builds on:
- Push to main branch
- Pull requests to main
- Manual workflow dispatch

Monitor builds at: `Actions` → `Deploy Cloudflare Workers`

---

## Build Performance

### Current Build Times (Local)
- **symbolai-worker**: ~12-15 seconds (when successful)
- **cloudflare-worker**: <1 second (no build needed)
- **Total**: ~15 seconds

### Optimization Opportunities
1. ✅ **Already implemented**: `NODE_OPTIONS='--max-old-space-size=2048'` for memory
2. ⏳ **Pending**: Fix React version mismatch to enable successful builds
3. 💡 **Future**: Consider build caching strategies for faster CI/CD

---

**Last Updated**: 2025-11-19
**Priority**: Fix React version mismatch before production deployment
