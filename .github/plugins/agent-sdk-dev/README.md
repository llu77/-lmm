# Agent SDK Development Plugin

A comprehensive plugin for developing Claude Agent SDK applications with streamlined scaffolding and best practice validation.

## Overview

This plugin simplifies the development lifecycle of Claude Agent SDK applications by providing:

- Interactive project scaffolding with `/new-sdk-app`
- Automated verification agents for Python and TypeScript
- Best practice validation and recommendations
- Quick setup for both language ecosystems

## Features

### Command: `/new-sdk-app`

Interactive command that guides you through setting up a new Agent SDK project.

**Usage:**
```
/new-sdk-app
```

**What it does:**
1. Prompts for project details (name, language, features)
2. Creates project structure with appropriate files
3. Sets up dependencies and configuration
4. Initializes version control
5. Provides next steps and documentation links

**Supported Languages:**
- Python (with virtual environment setup)
- TypeScript (with npm/yarn configuration)

### Agent: `agent-sdk-verifier-py`

Specialized agent that validates Python-based Agent SDK applications.

**Validation Checks:**
- Code structure follows SDK conventions
- Dependencies are properly declared
- Environment variables are documented
- Error handling is comprehensive
- Tests exist for critical paths
- Documentation is complete

**Usage:**
The agent automatically activates when working with Python SDK projects or can be explicitly invoked for code review.

### Agent: `agent-sdk-verifier-ts`

Specialized agent that validates TypeScript-based Agent SDK applications.

**Validation Checks:**
- TypeScript configuration is optimal
- Type definitions are properly used
- SDK patterns are followed correctly
- Error handling includes type guards
- Tests cover main functionality
- Build configuration is correct

**Usage:**
The agent automatically activates when working with TypeScript SDK projects or can be explicitly invoked for code review.

## Installation

This plugin is included with Claude Code. To enable it:

1. Open Claude Code in your project
2. Run `/plugin list` to see available plugins
3. Run `/plugin enable agent-sdk-dev` if not already enabled

Or add to your `.claude/settings.json`:

```json
{
  "plugins": {
    "agent-sdk-dev": {
      "enabled": true
    }
  }
}
```

## Examples

### Creating a New Python SDK App

```
/new-sdk-app
# Follow prompts:
# - Project name: my-assistant
# - Language: Python
# - Features: [x] Conversation handling
#           [x] Tool integration
#           [ ] Multi-turn dialogues
```

This creates:
```
my-assistant/
├── src/
│   ├── __init__.py
│   ├── main.py
│   └── tools/
├── tests/
├── requirements.txt
├── pyproject.toml
├── .env.example
└── README.md
```

### Validating an Existing Project

The verification agents automatically activate during:
- Code reviews
- Pre-commit checks
- PR analysis

Or explicitly invoke:
```
/review
# The appropriate verifier (py/ts) will automatically engage
```

## Best Practices

### Python Projects
- Use virtual environments (`venv` or `conda`)
- Pin dependencies in `requirements.txt`
- Follow PEP 8 style guidelines
- Use type hints for better code clarity
- Include comprehensive docstrings

### TypeScript Projects
- Enable strict mode in `tsconfig.json`
- Use interfaces for SDK types
- Implement proper error boundaries
- Leverage async/await patterns
- Document with JSDoc comments

## Configuration

Customize the plugin in `.claude/settings.json`:

```json
{
  "plugins": {
    "agent-sdk-dev": {
      "enabled": true,
      "defaultLanguage": "typescript",
      "scaffolding": {
        "includeTests": true,
        "includeDocker": false,
        "includeCI": true
      },
      "verification": {
        "strictMode": true,
        "autoFix": false
      }
    }
  }
}
```

## Troubleshooting

### Issue: Command not found
**Solution:** Ensure the plugin is enabled via `/plugin enable agent-sdk-dev`

### Issue: Verification fails
**Solution:** Check that your project follows SDK conventions. Run `/new-sdk-app` in a test directory to see the expected structure.

### Issue: Language detection incorrect
**Solution:** Explicitly specify language in settings or ensure your project has proper configuration files (e.g., `package.json` for TypeScript, `requirements.txt` for Python).

## Learn More

- [Agent SDK Documentation](https://docs.claude.com/en/api/agent-sdk/overview)
- [Claude Code Plugins](https://docs.claude.com/en/docs/claude-code/plugins)
- [Best Practices Guide](https://docs.claude.com/en/api/agent-sdk/best-practices)
