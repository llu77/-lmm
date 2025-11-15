# Cloudflare Style Guide Components

This directory contains components that follow [Cloudflare's Documentation Style Guide](https://developers.cloudflare.com/style-guide/components/github-code/).

## Components

### GitHubCode

Display source code directly from GitHub repositories in your documentation.

**Features:**
- Fetch code from any public GitHub repository
- Filter by line numbers (startLine/endLine)
- Show/hide line numbers
- Collapsible code blocks
- Text wrapping
- Dark mode support
- RTL support for Arabic
- Direct link to GitHub source

**Usage:**
```tsx
import { GitHubCode } from '~/components';

<GitHubCode
  repo="owner/repository"
  path="src/example.ts"
  startLine={10}
  endLine={30}
  showLineNumbers={true}
  title="Example Code"
/>
```

### CodeBlock

Display inline code blocks with advanced formatting options.

**Features:**
- Syntax highlighting support
- Line numbers
- Line highlighting
- Collapsible blocks
- Text wrapping
- Dark mode support
- RTL support for Arabic

**Usage:**
```tsx
import { CodeBlock } from '~/components';

<CodeBlock
  lang="typescript"
  showLineNumbers={true}
  highlight={[3, 4, 5]}
  title="Example"
>
  const greeting = "Hello";
  console.log(greeting);
</CodeBlock>
```

## Style Guide Compliance

These components follow Cloudflare's style guide conventions:

### Placeholders
- Use angle brackets `< >` for values that should be replaced
- Example: `wrangler secret put <SECRET_NAME>`

### Optional Parameters
- Use square brackets `[ ]` for optional parameters
- Example: `npx wrangler deploy [OPTIONS]`

### Shell Commands
- **Do not** use `$` before shell commands
- ❌ Wrong: `$ npm install`
- ✅ Correct: `npm install`

### Monospace Text
Use backticks for:
- File names: `package.json`
- API commands: `GET /api/users`
- Variable values: `NODE_ENV=production`
- Function names: `fetchData()`

## Documentation

Full documentation in Arabic is available at:
- [Cloudflare Code Components Guide](/docs/cloudflare-code-components)
- [Live Examples](/code-examples)

## Implementation Details

### GitHubCode Component
- Uses GitHub API to fetch file content
- Respects GitHub API rate limits (60/hour unauthenticated, 5000/hour with token)
- Implements loading and error states
- Provides direct links to source on GitHub

### CodeBlock Component
- Pure React component for inline code
- Supports line highlighting
- Fully accessible with keyboard navigation
- Optimized for both LTR and RTL layouts

## Best Practices

1. **Use startLine/endLine**: Don't display entire large files
2. **Use collapse**: For long or secondary code blocks
3. **Use title**: To provide context for the code
4. **Use wrap**: For long lines that should be readable

## Performance

### Caching
Consider implementing caching for frequently accessed GitHub files to reduce API calls.

### Rate Limiting
GitHub API has the following limits:
- Unauthenticated: 60 requests/hour
- Authenticated: 5000 requests/hour

To use authentication, add a GitHub token to your environment variables.

## Security

- Never expose GitHub tokens in client-side code
- Use environment variables for sensitive configuration
- Validate all user input before making API calls
- The components use React's built-in XSS protection

## Contributing

When adding features to these components:
1. Maintain Cloudflare style guide compliance
2. Ensure RTL/Arabic support works correctly
3. Test in both light and dark modes
4. Update documentation and examples
5. Add TypeScript types for all props

## License

These components are part of the LMM Financial Management System.
