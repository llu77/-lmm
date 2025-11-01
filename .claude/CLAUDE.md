# Claude Code Configuration Guide

This directory contains configuration files for customizing Claude Code behavior.

## 📁 Directory Structure

```
.claude/
├── CLAUDE.md              # This file - main documentation
├── settings.json          # Project-level settings
├── settings.local.json    # User-specific settings (gitignored)
├── commands/              # Custom slash commands
│   └── *.md              # Command definition files
├── output-styles/         # Output style presets
│   └── *.md              # Style definition files
└── MCP_SETUP.md          # MCP server configuration guide
```

## 🎨 Output Styles System

Output styles allow you to customize how Claude Code responds by providing specialized system prompts for different tasks. This is useful for creating consistent, domain-specific assistants.

### What are Output Styles?

Output styles are reusable system prompt configurations that modify Claude's behavior for specific tasks:
- **Code Review**: Thorough code analysis with security focus
- **Documentation**: Clear, comprehensive documentation writing
- **Testing**: Test-driven development assistance
- **Python Specialist**: Python-specific best practices
- **API Design**: RESTful API design patterns

### Directory Locations

Output styles can be stored in two locations:

1. **User-level** (global): `~/.claude/output-styles/`
   - Available across all projects
   - Good for personal preferences

2. **Project-level** (local): `.claude/output-styles/`
   - Specific to this project
   - Shared with team via git
   - Overrides user-level styles with same name

### File Format

Output style files use Markdown with YAML frontmatter:

```markdown
---
name: Style Name
description: Brief description of what this style does
---

System prompt content goes here.

You can use:
- Bullet points
- Multiple paragraphs
- Code examples
- Any markdown formatting
```

### Creating Output Styles

#### Method 1: Manual Creation

Create a new `.md` file in `.claude/output-styles/`:

**Example:** `.claude/output-styles/code-reviewer.md`

```markdown
---
name: Code Reviewer
description: Thorough code review assistant
---

You are an expert code reviewer.

For every code submission:
1. Check for bugs and security issues
2. Evaluate performance
3. Suggest improvements
4. Rate code quality (1-10)
```

#### Method 2: Using Python Script

Use the provided utility script:

```python
from scripts.create_output_style import create_output_style

await create_output_style(
    'Code Reviewer',
    'Thorough code review assistant',
    """You are an expert code reviewer.

For every code submission:
1. Check for bugs and security issues
2. Evaluate performance
3. Suggest improvements
4. Rate code quality (1-10)"""
)
```

### Using Output Styles

#### In Claude Agent SDK

```python
from claude_agent_sdk import query, ClaudeAgentOptions

# Load output style by name
messages = []
async for message in query(
    prompt="Review this code",
    options=ClaudeAgentOptions(
        output_style="Code Reviewer"
    )
):
    messages.append(message)
```

#### Or use custom system prompts directly:

```python
from claude_agent_sdk import query, ClaudeAgentOptions

custom_prompt = """You are a Python coding specialist.
Follow these guidelines:
- Write clean, well-documented code
- Use type hints for all functions
- Include comprehensive docstrings"""

messages = []
async for message in query(
    prompt="Create a data processing pipeline",
    options=ClaudeAgentOptions(
        system_prompt=custom_prompt
    )
):
    messages.append(message)
```

### Available Output Styles

This project includes the following output styles:

- **code-reviewer.md**: Thorough code review with security focus
- **documentation-writer.md**: Clear, comprehensive documentation
- **test-specialist.md**: Test-driven development assistant
- **python-expert.md**: Python best practices specialist
- **api-designer.md**: RESTful API design patterns

### Best Practices

1. **Naming**: Use lowercase with hyphens (e.g., `my-style.md`)
2. **Description**: Keep it concise (one sentence)
3. **Content**: Be specific about the behavior you want
4. **Examples**: Include examples in the prompt when helpful
5. **Version Control**: Commit project-level styles to share with team

### Example Output Styles

See `.claude/output-styles/` for pre-configured examples:
- Code review specialists
- Documentation writers
- Testing assistants
- Domain-specific experts

## ⚙️ MCP Servers

See [MCP_SETUP.md](./MCP_SETUP.md) for MCP server configuration.

## 🔧 Custom Commands

See `commands/` directory for custom slash command definitions.

## 📚 Settings Files

- **settings.json**: Project-wide settings (committed to git)
- **settings.local.json**: User-specific overrides (gitignored)

## 📖 References

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Claude Agent SDK](https://docs.claude.com/en/docs/claude-agent-sdk)
- [Output Styles Guide](https://docs.claude.com/en/docs/claude-code/output-styles)
