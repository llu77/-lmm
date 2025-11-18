# Code Review Plugin

An automated code review plugin that uses multiple specialized AI agents to provide comprehensive, high-confidence feedback on pull requests.

## Overview

This plugin revolutionizes code review by deploying specialized agents that analyze different aspects of code changes:

- Security vulnerabilities and risks
- Performance implications
- Code style and consistency
- Business logic correctness

Each review includes confidence scores (0-100), allowing you to filter for high-confidence issues (≥80) and reduce false positives.

## Features

### Command: `/code-review`

Initiates a comprehensive automated code review of the current PR or specified changes.

**Usage:**
```
/code-review                    # Review current PR
/code-review --pr 123          # Review specific PR
/code-review --files src/      # Review specific directory
/code-review --confidence 80   # Only show issues with ≥80 confidence
```

**What it does:**
1. Analyzes changed files in the PR
2. Deploys specialized review agents in parallel
3. Aggregates findings with confidence scores
4. Posts review comments on GitHub
5. Generates summary report with metrics

**Review Process:**
```
┌─────────────────────────────────────┐
│  Fetch PR Changes                   │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐           ┌────▼───┐
│Security│           │Performance│
│Reviewer│           │ Reviewer  │
└───┬────┘           └────┬───┘
    │                     │
┌───▼────┐           ┌────▼───┐
│ Style  │           │ Logic  │
│Reviewer│           │Reviewer│
└───┬────┘           └────┬───┘
    │                     │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Aggregate Results  │
    │  Filter by Confidence│
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Post Review        │
    └─────────────────────┘
```

### Agent: Security Reviewer

Focuses on identifying security vulnerabilities and risks.

**Checks for:**
- SQL injection vulnerabilities
- Cross-site scripting (XSS) risks
- Authentication/authorization flaws
- Sensitive data exposure
- Insecure dependencies
- Cryptographic weaknesses
- CSRF vulnerabilities
- Input validation issues

**Example Finding:**
```markdown
🔴 Security Issue (Confidence: 95)

**File:** src/api/user.ts:45
**Issue:** SQL Injection vulnerability

**Details:**
Direct string concatenation in SQL query allows injection attacks:
```typescript
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

**Recommendation:**
Use parameterized queries:
```typescript
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

**Impact:** High - Could expose all user data
```

### Agent: Performance Reviewer

Analyzes code changes for performance implications.

**Checks for:**
- N+1 query problems
- Inefficient algorithms
- Memory leaks
- Unnecessary re-renders (React)
- Blocking operations
- Large bundle impacts
- Database query optimization
- Caching opportunities

**Example Finding:**
```markdown
🟡 Performance Warning (Confidence: 88)

**File:** src/components/UserList.tsx:23
**Issue:** N+1 query problem

**Details:**
Loading user details individually in a loop:
```typescript
users.forEach(user => {
  const details = await fetchUserDetails(user.id); // N queries!
});
```

**Recommendation:**
Batch load all user details:
```typescript
const userIds = users.map(u => u.id);
const details = await fetchUserDetailsBatch(userIds); // 1 query
```

**Impact:** Medium - Could slow down page with many users
```

### Agent: Style Reviewer

Ensures code style consistency and best practices.

**Checks for:**
- Code formatting consistency
- Naming convention adherence
- Comment quality
- File organization
- Import statement order
- Unused code
- Complexity metrics
- Duplication

**Example Finding:**
```markdown
🔵 Style Suggestion (Confidence: 75)

**File:** src/utils/helpers.ts:12
**Issue:** Inconsistent naming convention

**Details:**
Function uses camelCase but module uses snake_case:
```typescript
export function parseJSON(data: string) { ... }  // camelCase
export const validate_email = (email: string) => { ... }  // snake_case
```

**Recommendation:**
Stick to camelCase for consistency:
```typescript
export const validateEmail = (email: string) => { ... }
```

**Impact:** Low - Style consistency
```

### Agent: Logic Reviewer

Reviews business logic correctness and code quality.

**Checks for:**
- Logic errors and edge cases
- Incorrect implementations
- Missing error handling
- Race conditions
- State management issues
- API contract violations
- Test coverage gaps
- Documentation accuracy

**Example Finding:**
```markdown
🟠 Logic Error (Confidence: 92)

**File:** src/services/payment.ts:67
**Issue:** Incorrect calculation logic

**Details:**
Discount calculation doesn't account for tax:
```typescript
const finalPrice = price * (1 - discount);
// Tax should be calculated on discounted price
```

**Recommendation:**
Apply discount before tax:
```typescript
const discountedPrice = price * (1 - discount);
const finalPrice = discountedPrice * (1 + taxRate);
```

**Impact:** High - Incorrect pricing could affect revenue
```

## Installation

This plugin is included with Claude Code. To enable it:

1. Open Claude Code in your project
2. Run `/plugin enable code-review`

Or add to `.claude/settings.json`:

```json
{
  "plugins": {
    "code-review": {
      "enabled": true
    }
  }
}
```

## Configuration

Customize the review process in `.claude/settings.json`:

```json
{
  "plugins": {
    "code-review": {
      "enabled": true,
      "confidenceThreshold": 80,
      "agents": {
        "security": {
          "enabled": true,
          "severity": ["high", "medium", "low"]
        },
        "performance": {
          "enabled": true,
          "checkBundleSize": true
        },
        "style": {
          "enabled": true,
          "enforceConventions": true
        },
        "logic": {
          "enabled": true,
          "requireTests": true
        }
      },
      "output": {
        "format": "github-review",
        "groupByFile": true,
        "includeSummary": true
      },
      "autoPost": false,
      "ignorePatterns": [
        "**/*.test.ts",
        "**/migrations/**",
        "**/*.generated.*"
      ]
    }
  }
}
```

## Confidence Scoring

Each finding includes a confidence score (0-100) based on:

- **90-100**: Very high confidence - clear issues
- **80-89**: High confidence - likely issues
- **70-79**: Medium confidence - probable issues
- **60-69**: Lower confidence - possible issues
- **<60**: Low confidence - uncertain

**Best Practice:** Focus on findings with confidence ≥80 to minimize false positives.

## GitHub Integration

The plugin integrates with GitHub to:

1. **Post Review Comments**
   - Inline comments on specific lines
   - General PR comments for overall feedback
   - Supports GitHub's review API

2. **Review Status**
   - Request changes for high-confidence critical issues
   - Comment for medium-confidence issues
   - Approve if no significant issues found

3. **Labels**
   - Auto-adds labels: `needs-review`, `security`, `performance`
   - Removes labels when issues are resolved

4. **Metrics Dashboard**
   - Issue counts by category
   - Confidence distribution
   - Historical trends

## Best Practices

### When to Use
- Before requesting human review
- As a CI/CD check
- During pair programming
- For learning and mentorship

### Interpreting Results
1. **Start with high-confidence issues** (≥80)
2. **Prioritize by severity**: Security > Logic > Performance > Style
3. **Validate findings** - AI can make mistakes
4. **Consider context** - Some violations may be intentional

### Continuous Improvement
- Review false positives and provide feedback
- Adjust confidence threshold based on your needs
- Customize ignored patterns for your project
- Update conventions in settings

## Examples

### Basic Review

```bash
# Review current PR
/code-review

# Output:
# 🔍 Analyzing PR #123: Add user authentication
# 
# ✓ Security Reviewer: Found 2 issues
# ✓ Performance Reviewer: Found 1 issue
# ✓ Style Reviewer: Found 5 suggestions
# ✓ Logic Reviewer: Found 1 issue
# 
# 📊 Summary:
# - 🔴 Critical: 1 (security)
# - 🟡 Warning: 2 (performance, logic)
# - 🔵 Info: 5 (style)
# 
# High-confidence issues (≥80): 4
# Review posted to GitHub: https://github.com/user/repo/pull/123
```

### Filtered Review

```bash
# Only show high-confidence issues
/code-review --confidence 85

# Output:
# 🔍 Analyzing with confidence threshold: 85
# 
# Found 2 high-confidence issues:
# 
# 1. 🔴 SQL Injection (Confidence: 95)
#    src/api/user.ts:45
# 
# 2. 🟡 N+1 Query Problem (Confidence: 88)
#    src/components/UserList.tsx:23
```

### Targeted Review

```bash
# Review specific files or directories
/code-review --files src/auth/

# Output:
# 🔍 Analyzing files in src/auth/
# 
# Reviewed 8 files:
# - src/auth/login.ts
# - src/auth/register.ts
# - src/auth/middleware.ts
# ...
```

## Metrics and Reporting

The plugin tracks metrics over time:

- **Issue Density**: Issues per 100 lines of code
- **Resolution Rate**: % of issues fixed vs. dismissed
- **Category Distribution**: Security, Performance, Style, Logic
- **Confidence Accuracy**: How often high-confidence issues are valid

View metrics with:
```
/code-review --metrics
```

## Troubleshooting

### Issue: Too many false positives
**Solution:** Increase confidence threshold in settings or disable specific agents.

### Issue: Missing important issues
**Solution:** Lower confidence threshold or enable additional agent checks.

### Issue: Review takes too long
**Solution:** Review specific files/directories or disable less critical agents.

## Learn More

- [Code Review Best Practices](https://docs.claude.com/en/docs/code-review)
- [GitHub Code Review](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests)
- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code/overview)
