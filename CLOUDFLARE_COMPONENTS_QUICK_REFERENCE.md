# Quick Reference: Cloudflare Code Components

## 🚀 Quick Start

### Import Components

```typescript
import { GitHubCode, CodeBlock } from '~/components';
```

### In Astro Files

```astro
---
import { GitHubCode, CodeBlock } from '~/components';
---

<GitHubCode client:load repo="owner/repo" path="file.ts" />
<CodeBlock client:load lang="typescript">code here</CodeBlock>
```

---

## 📦 GitHubCode Component

### Basic Usage

```tsx
<GitHubCode
  repo="llu77/-lmm"
  path="symbolai-worker/astro.config.mjs"
/>
```

### With Line Numbers

```tsx
<GitHubCode
  repo="llu77/-lmm"
  path="package.json"
  startLine={10}
  endLine={20}
  showLineNumbers={true}
/>
```

### Collapsible

```tsx
<GitHubCode
  repo="llu77/-lmm"
  path="tsconfig.json"
  collapse={true}
  title="TypeScript Config"
/>
```

### All Options

```tsx
<GitHubCode
  repo="owner/repository"     // Required
  path="src/file.ts"          // Required
  startLine={10}              // Optional
  endLine={30}                // Optional
  showLineNumbers={true}      // Default: true
  collapse={false}            // Default: false
  wrap={false}                // Default: false
  title="My Code"             // Optional
  lang="typescript"           // Optional, auto-detected
/>
```

---

## 📝 CodeBlock Component

### Basic Usage

```tsx
<CodeBlock lang="typescript">
  const greeting = "Hello";
  console.log(greeting);
</CodeBlock>
```

### With Line Numbers and Highlighting

```tsx
<CodeBlock
  lang="javascript"
  showLineNumbers={true}
  highlight={[2, 3]}
  title="Event Handler"
>
  function handleClick(event) {
    event.preventDefault();
    console.log('Clicked!');
  }
</CodeBlock>
```

### Collapsible

```tsx
<CodeBlock
  lang="json"
  collapse={true}
  title="Configuration"
>
  {
    "name": "my-app",
    "version": "1.0.0"
  }
</CodeBlock>
```

### All Options

```tsx
<CodeBlock
  lang="typescript"           // Default: 'text'
  title="Example"             // Optional
  showLineNumbers={false}     // Default: false
  collapse={false}            // Default: false
  wrap={false}                // Default: false
  highlight={[1, 2, 3]}       // Optional, line numbers
>
  Your code here
</CodeBlock>
```

---

## 🎨 Supported Languages

Both components support standard language identifiers:

- `typescript`, `javascript`, `tsx`, `jsx`
- `python`, `ruby`, `go`, `rust`
- `bash`, `shell`, `sh`
- `json`, `yaml`, `toml`
- `html`, `css`, `scss`
- `sql`, `graphql`
- `markdown`, `mdx`
- And many more...

---

## 📋 Cloudflare Style Guide Rules

### Placeholders: Use `< >`

```bash
wrangler secret put <SECRET_NAME>
```

### Optional Parameters: Use `[ ]`

```bash
npx wrangler deploy [OPTIONS]
```

### Shell Commands: NO `$` prefix

✅ Correct:
```bash
npm install
npm run build
```

❌ Wrong:
```bash
$ npm install
$ npm run build
```

### Inline Code: Use backticks

- Files: `package.json`
- Commands: `GET /api/users`
- Values: `NODE_ENV=production`

---

## 🌐 Arabic/RTL Support

Both components fully support Arabic text and RTL layouts:

```tsx
<CodeBlock lang="javascript" title="مثال على الكود">
  // الكود هنا
  const message = "مرحباً";
</CodeBlock>
```

---

## 🔗 Links

- **Full Documentation:** `/docs/cloudflare-code-components`
- **Live Examples:** `/code-examples`
- **Component README:** `symbolai-worker/src/components/README.md`
- **Compliance Report:** `CLOUDFLARE_STYLE_GUIDE_COMPLIANCE.md`

---

## 🎯 Common Patterns

### Show Config File

```tsx
<GitHubCode
  repo="llu77/-lmm"
  path="symbolai-worker/astro.config.mjs"
  title="Astro Configuration"
/>
```

### Highlight Important Lines

```tsx
<CodeBlock
  lang="typescript"
  showLineNumbers
  highlight={[5, 6, 7]}
>
  import { useState } from 'react';
  
  function Counter() {
    // These lines are highlighted
    const [count, setCount] = useState(0);
    const increment = () => setCount(count + 1);
    const decrement = () => setCount(count - 1);
    
    return <div>...</div>;
  }
</CodeBlock>
```

### Long Code (Collapsible)

```tsx
<GitHubCode
  repo="llu77/-lmm"
  path="symbolai-worker/package.json"
  collapse={true}
  title="Package Dependencies"
/>
```

### Shell Commands

```tsx
<CodeBlock lang="bash">
  npm install
  npm run build
  wrangler deploy
</CodeBlock>
```

---

## 💡 Pro Tips

1. **Use `startLine`/`endLine`** to show only relevant code sections
2. **Use `collapse`** for supplementary or long code blocks
3. **Use `title`** to provide context
4. **Use `highlight`** to draw attention to specific lines
5. **Use `wrap`** for long lines that need to be readable

---

## 🔧 GitHub API Rate Limits

- **Unauthenticated:** 60 requests/hour
- **Authenticated:** 5,000 requests/hour

To use authentication, add a GitHub token to environment variables.

---

## 🎉 That's It!

You now have full Cloudflare-compliant code components ready to use in your documentation.

For questions or issues, refer to the full documentation or open an issue.
