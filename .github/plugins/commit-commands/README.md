# Commit Commands Plugin

A workflow automation plugin that simplifies git operations with intelligent commands for committing, pushing, and managing branches.

## Overview

This plugin streamlines your git workflow by providing convenient commands that handle common git operations intelligently:

- Smart commit message generation with `/commit`
- One-command commit-push-PR workflow with `/commit-push-pr`
- Automatic cleanup of stale branches with `/clean_gone`

## Features

### Command: `/commit`

Creates a git commit with an automatically generated, context-aware commit message.

**Usage:**
```
/commit
```

**What it does:**
1. Analyzes staged changes (or stages all changes if none staged)
2. Generates a descriptive commit message based on:
   - File changes
   - Code patterns
   - Project conventions
3. Shows the proposed message for review
4. Commits with confirmation

**Options:**
```
/commit --amend         # Amend the last commit
/commit --all          # Stage all changes before committing
/commit --message "Custom message"  # Use custom message
```

**Example:**
```bash
# After making changes to authentication code
/commit

# Generated message:
# "feat(auth): Add password reset functionality
# 
# - Implement password reset email flow
# - Add reset token generation and validation
# - Update user model with reset fields"
```

### Command: `/commit-push-pr`

The ultimate workflow shortcut: commits changes, pushes to remote, and creates a pull request in one command.

**Usage:**
```
/commit-push-pr
```

**What it does:**
1. Analyzes and commits changes (like `/commit`)
2. Pushes to remote branch
3. Opens PR creation dialog with:
   - Pre-filled title and description
   - Suggested reviewers
   - Appropriate labels
   - Link to CI/CD status

**Options:**
```
/commit-push-pr --draft        # Create as draft PR
/commit-push-pr --target main  # Specify target branch
/commit-push-pr --reviewers @user1,@user2  # Request specific reviewers
```

**Example:**
```bash
# After implementing a feature
/commit-push-pr

# Output:
# ✓ Committed: feat(api): Add rate limiting middleware
# ✓ Pushed to origin/feature/rate-limiting
# ✓ Pull Request #123 created: https://github.com/user/repo/pull/123
```

### Command: `/clean_gone`

Cleans up local branches that have been deleted on remote (marked as `[gone]` by git).

**Usage:**
```
/clean_gone
```

**What it does:**
1. Identifies local branches tracking deleted remote branches
2. Lists branches to be deleted
3. Requests confirmation
4. Safely deletes local branches

**Options:**
```
/clean_gone --dry-run  # Show what would be deleted without deleting
/clean_gone --force    # Skip confirmation prompt
```

**Example:**
```bash
/clean_gone

# Output:
# Found 3 stale branches:
#   - feature/old-feature [gone]
#   - bugfix/fixed-issue [gone]
#   - hotfix/temporary [gone]
# 
# Delete these branches? (y/N): y
# ✓ Deleted 3 branches
```

## Installation

This plugin is included with Claude Code. To enable it:

1. Open Claude Code in your project
2. The plugin is enabled by default
3. Verify with `/plugin list`

Or configure in `.claude/settings.json`:

```json
{
  "plugins": {
    "commit-commands": {
      "enabled": true
    }
  }
}
```

## Configuration

Customize behavior in `.claude/settings.json`:

```json
{
  "plugins": {
    "commit-commands": {
      "enabled": true,
      "commit": {
        "conventionalCommits": true,
        "signOff": false,
        "autoStage": true,
        "template": "conventional"
      },
      "pr": {
        "defaultBranch": "main",
        "autoLabels": true,
        "requestReviewers": true,
        "includeCIStatus": true
      },
      "cleanup": {
        "requireConfirmation": true,
        "protectedBranches": ["main", "develop", "staging"]
      }
    }
  }
}
```

## Commit Message Conventions

The plugin supports multiple commit message formats:

### Conventional Commits (default)
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

### Custom Templates

Define your own template in settings:

```json
{
  "commit": {
    "template": "[{ticket}] {type}: {description}\n\n{body}"
  }
}
```

## Best Practices

### When to use `/commit`
- Quick commits during development
- When you want AI-generated commit messages
- For consistent message formatting

### When to use `/commit-push-pr`
- Completing a feature or bug fix
- Ready for code review
- Want to streamline the entire process

### When to use `/clean_gone`
- After merging PRs
- Periodic repository maintenance
- Before starting new work

## Troubleshooting

### Issue: Permission denied on push
**Solution:** Ensure you have write access to the repository and your git credentials are configured.

### Issue: PR creation fails
**Solution:** Check that:
- You have GitHub CLI (`gh`) installed and authenticated
- Or the repository remote is properly configured
- You have permission to create PRs

### Issue: `/clean_gone` doesn't find branches
**Solution:** Run `git fetch --prune` first to update remote tracking information.

## Integration with GitHub

The plugin integrates seamlessly with GitHub:

- Uses GitHub CLI for PR creation when available
- Respects GitHub's branch protection rules
- Adds appropriate labels based on commit type
- Links commits to issues using keywords (fixes #123)

## Examples

### Complete Feature Workflow

```bash
# 1. Create feature branch
git checkout -b feature/user-dashboard

# 2. Make changes and commit frequently
/commit
/commit
/commit

# 3. Ready for review? Push and create PR in one step
/commit-push-pr

# 4. After PR is merged, clean up
git checkout main
git pull
/clean_gone
```

### Quick Bug Fix

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug

# 2. Fix and ship immediately
/commit-push-pr

# Output:
# ✓ Committed: fix(auth): Prevent null pointer in login validation
# ✓ Pushed to origin/hotfix/critical-bug
# ✓ Pull Request #456 created with label: hotfix
```

## Learn More

- [Git Best Practices](https://git-scm.com/book/en/v2)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code/overview)
