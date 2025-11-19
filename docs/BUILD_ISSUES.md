# Build Issues and Resolutions

## Current Build Issues

### 1. React Version Mismatch (HIGH PRIORITY)

**Status**: ⚠️ Partially resolved - dependencies fixed, build still failing

**Error**:
```
Minified React error #527
React versions: 18.3.1 vs 19.2.0
```

**Impact**: The symbolai-worker build fails at the final step during static build phase.

**Root Cause**: The error originates from `_@astro-renderers` chunk during Astro's static build process, even though all npm dependencies are correctly aligned.

**What We've Tried** ✅:
1. ✅ Fixed react-dom version mismatch (changed from 19.2.0 to 18.3.1)
2. ✅ Updated both root and symbolai-worker package.json files
3. ✅ Verified all React packages in node_modules are 18.3.1
4. ✅ Cleared package-lock.json and reinstalled
5. ✅ Cleared workspace node_modules
6. ✅ Cleared build artifacts (dist folder)
7. ✅ Cleared Astro and Vite caches
8. ✅ Confirmed no React 19 packages exist in node_modules tree

**Current Status**:
- All package.json files specify react@18.3.1 and react-dom@18.3.1
- `npm list react react-dom` shows only 18.3.1 versions
- Build succeeds through server and client bundling
- Build fails when Astro tries to execute the bundled worker code

**Likely Causes**:
1. **Astro Configuration Issue**: The `@astrojs/react` renderer may have bundling issues
2. **Build Cache**: Some cached build artifact we haven't cleared
3. **Module Resolution**: Astro's module resolution may be pulling React from unexpected location
4. **Peer Dependency Conflict**: A transitive dependency declaring incorrect peer deps

**Next Investigation Steps**:

#### Option 1: Update Astro Packages (Recommended)
```bash
npm update @astrojs/react @astrojs/cloudflare astro
npm install --legacy-peer-deps --ignore-scripts
rm -rf symbolai-worker/dist symbolai-worker/.astro
npm run build:workers
```

#### Option 2: Fresh Install
```bash
rm -rf node_modules package-lock.json
rm -rf symbolai-worker/node_modules
npm install --legacy-peer-deps --ignore-scripts
npm run build:workers
```

#### Option 3: Investigate Astro React Renderer
Check `@astrojs/react` package for React version requirements and compatibility.

#### Option 4: Enable Verbose Logging
```bash
cd symbolai-worker
DEBUG=astro:* npm run build
```

**Affected Files**:
- ✅ `package.json` - Fixed (react-dom: ^18.3.1)
- ✅ `symbolai-worker/package.json` - Fixed (react-dom: ^18.3.1)
- ✅ `package-lock.json` - Updated with correct versions

**Temporary Workaround**:
The build script uses `|| true` to continue despite build failures. The cloudflare-worker builds successfully, so partial deployments are possible.

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
