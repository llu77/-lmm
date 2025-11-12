# Debugging Guide for LMM System

This guide documents the debugging approaches and lessons learned from the comprehensive audit and fix session.

## Table of Contents
1. [Systematic Debugging Approach](#systematic-debugging-approach)
2. [Common Issues and Solutions](#common-issues-and-solutions)
3. [TypeScript Error Patterns](#typescript-error-patterns)
4. [Dependency Management](#dependency-management)
5. [Frontend Debugging](#frontend-debugging)
6. [Testing and Validation](#testing-and-validation)

---

## Systematic Debugging Approach

### 1. Start with Dependencies
Always begin by ensuring all dependencies are correctly installed and versions are compatible:

```bash
# Check for version mismatches
npm install

# Audit for vulnerabilities
npm audit

# Check for missing peer dependencies
npm ls
```

### 2. TypeScript Compilation
Run TypeScript type checking to identify compilation errors:

```bash
npm run type-check
```

### 3. Linting
Use ESLint to catch code quality issues:

```bash
npm run lint
```

### 4. Build Testing
Attempt to build all workspaces:

```bash
npm run build
```

### 5. Security Scanning
Always scan for security vulnerabilities after making changes:

```bash
# Use CodeQL or similar tools
# Check dependencies with npm audit
```

---

## Common Issues and Solutions

### Issue 1: Dependency Version Mismatch

**Problem**: Package version doesn't exist
```
error ETARGET: No matching version found for @tanstack/query-core@4.38.0
```

**Solution**:
1. Check available versions: `npm view <package> versions`
2. Update to a valid version in package.json
3. Re-install dependencies

**Example**:
```json
// Before
"@tanstack/query-core": "4.38.0"  // ❌ Doesn't exist

// After
"@tanstack/query-core": "^4.36.1"  // ✅ Valid version
```

### Issue 2: TypeScript Parser Errors with Inline Comments

**Problem**: Complex inline commented code in useEffect causes parser errors
```typescript
useEffect(() => { 
  // TODO: fetch("/api/data").then(r => r.json()).then(setData); 
}, []);
```

**Solution**: Move TODO comments outside the callback
```typescript
// TODO: fetch("/api/data").then(r => r.json()).then(setData);
useEffect(() => { }, []);
```

### Issue 3: Missing Import Extensions

**Problem**: TypeScript complains about .ts/.tsx extensions in imports
```
error TS5097: An import path can only end with a '.tsx' extension when 'allowImportingTsExtensions' is enabled.
```

**Solution**: Add to tsconfig.json:
```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true
  }
}
```

### Issue 4: Unknown Type in JSX

**Problem**: TypeScript error when using unknown values in JSX
```typescript
{result.field && <div>{result.field}</div>}
// Error: Type 'unknown' is not assignable to type 'ReactNode'
```

**Solution**: Wrap with type conversion functions
```typescript
{Boolean(result.field) && <div>{String(result.field)}</div>}
```

### Issue 5: Missing Type Properties

**Problem**: Property doesn't exist on type
```
error TS2339: Property 'isAuthenticated' does not exist on type 'AuthContextType'
```

**Solution**: Update the type definition to include all required properties:
```typescript
interface AuthContextType {
  authenticated: boolean;
  isAuthenticated: boolean; // Add alias
  // ... other properties
}
```

---

## TypeScript Error Patterns

### Pattern 1: Type Assertions with API Responses

**Bad**:
```typescript
const result = await apiClient.post('/api/endpoint');
setData(result); // Error: ApiResponse<any> not assignable
```

**Good**:
```typescript
const result = await apiClient.post('/api/endpoint');
setData(result.data || result);
```

### Pattern 2: Boolean Context with Unknown

**Bad**:
```typescript
{result.field && <Component />}
```

**Good**:
```typescript
{Boolean(result.field) && <Component />}
```

### Pattern 3: String Display with Unknown

**Bad**:
```typescript
<p>{result.text}</p>
```

**Good**:
```typescript
<p>{String(result.text)}</p>
```

---

## Dependency Management

### Adding New Dependencies

Always follow this process:

1. **Check if needed**: Don't add dependencies unnecessarily
2. **Check versions**: Use `npm view <package> versions` to find compatible versions
3. **Install**: `npm install <package>`
4. **Verify**: Run type-check and build after installing
5. **Audit**: Check for security vulnerabilities

### Common Missing Dependencies

When working with React applications, common missing dependencies include:

- `react-router-dom` - For routing
- `sonner` - For toast notifications
- `@radix-ui/*` - For UI components
- `convex` - For backend/database
- `embla-carousel-react` - For carousels
- `cmdk` - For command palette
- `next-themes` - For theme switching

---

## Frontend Debugging

### Component Issues

1. **Missing Components**: Create stub components as needed
```typescript
export default function MissingPage() {
  return <div>Page under development...</div>;
}
```

2. **Import Errors**: Check for missing default exports
3. **Props Type Errors**: Ensure component props match interface definitions

### Hook Issues

1. **Missing Hooks**: Create custom hooks when needed
2. **Context Issues**: Ensure providers wrap components properly
3. **State Management**: Verify useState and useEffect dependencies

---

## Testing and Validation

### Manual Testing Checklist

- [ ] TypeScript compilation passes
- [ ] ESLint shows no critical errors
- [ ] All workspaces build successfully
- [ ] No security vulnerabilities found
- [ ] No console errors in browser
- [ ] All routes accessible
- [ ] Forms validate properly
- [ ] API calls work as expected

### Automated Testing

```bash
# Run all checks
npm run type-check  # TypeScript
npm run lint        # ESLint  
npm run build       # Build
npm audit           # Security
```

---

## Best Practices

### Defensive Programming

1. **Always validate inputs**:
```typescript
const value = inputValue || defaultValue;
```

2. **Use optional chaining**:
```typescript
const data = response.data?.field;
```

3. **Handle errors gracefully**:
```typescript
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', error);
  toast.error('حدث خطأ');
}
```

### Type Safety

1. **Avoid `any`**: Use proper types or `unknown`
2. **Use type guards**: Check types before use
3. **Define interfaces**: Create clear type definitions

### Code Organization

1. **Separate concerns**: Keep logic separate from UI
2. **Reuse code**: Extract common patterns into utilities
3. **Document decisions**: Add comments for complex logic

---

## Conclusion

Following this systematic approach helps identify and resolve issues efficiently:

1. **Start broad** (dependencies) and move to specific (individual files)
2. **Use tools** (TypeScript, ESLint, CodeQL) to catch issues early
3. **Document learnings** to prevent future similar issues
4. **Test thoroughly** before considering work complete

Remember: Good debugging is about understanding the system, not just fixing symptoms.
