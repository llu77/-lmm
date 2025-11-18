# Feature Development Plugin

A comprehensive workflow plugin that guides you through a structured 7-phase approach to feature development, from exploration to deployment.

## Overview

Building features effectively requires understanding the existing codebase, designing sound architecture, and ensuring quality. This plugin provides:

- **Structured 7-phase workflow** with `/feature-dev`
- **Code Explorer agent** for deep codebase analysis
- **Code Architect agent** for design and planning
- **Code Reviewer agent** for quality assurance

Each phase builds on the previous, ensuring systematic feature development with high quality outcomes.

## The 7-Phase Workflow

### Phase 1: Requirements Clarification
Ensures feature requirements are clear and well-defined.

**Activities:**
- Review feature specifications
- Identify ambiguities and edge cases
- Define success criteria
- List technical constraints
- Document assumptions

**Output:** Requirements document with acceptance criteria

### Phase 2: Codebase Exploration
Uses the Code Explorer agent to understand relevant existing code.

**Activities:**
- Identify similar features or patterns
- Map dependencies and relationships
- Understand data models
- Review API contracts
- Note architectural patterns

**Output:** Codebase analysis report with relevant files and patterns

### Phase 3: Architecture Design
Uses the Code Architect agent to design the feature implementation.

**Activities:**
- Design component structure
- Plan data flow
- Define API contracts
- Identify integration points
- Consider scalability and performance

**Output:** Architecture blueprint with diagrams and specifications

### Phase 4: Implementation Planning
Creates detailed implementation tasks.

**Activities:**
- Break down architecture into tasks
- Estimate effort
- Identify dependencies between tasks
- Plan testing strategy
- Define rollout approach

**Output:** Task breakdown with estimates

### Phase 5: Implementation
Guides through actual code development.

**Activities:**
- Implement tasks incrementally
- Write tests alongside code
- Document as you build
- Review progress against architecture
- Refactor as needed

**Output:** Working implementation with tests

### Phase 6: Review and Refinement
Uses the Code Reviewer agent for comprehensive quality checks.

**Activities:**
- Review code quality
- Verify test coverage
- Check performance
- Validate against requirements
- Refactor based on feedback

**Output:** Reviewed, refined code ready for PR

### Phase 7: Documentation and Handoff
Prepares feature for deployment and team handoff.

**Activities:**
- Write feature documentation
- Update API docs
- Create migration guides (if needed)
- Document deployment steps
- Prepare release notes

**Output:** Complete documentation package

## Features

### Command: `/feature-dev`

Initiates the interactive 7-phase feature development workflow.

**Usage:**
```
/feature-dev                           # Start new feature workflow
/feature-dev --phase 3                 # Resume at specific phase
/feature-dev --feature "User Settings" # Start with feature name
```

**Interactive Flow:**
```
$ /feature-dev

🚀 Feature Development Workflow

What feature are you building?
> User profile settings page

Current Phase: 1 - Requirements Clarification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Let's clarify the requirements...

[Interactive prompts follow for each phase]
```

**Phase Navigation:**
- Progress automatically through phases
- Skip phases if not applicable
- Return to previous phase if needed
- Save progress and resume later

### Agent: Code Explorer

Deeply analyzes existing codebase to inform feature development.

**Capabilities:**
- **Pattern Recognition**: Identifies similar implementations
- **Dependency Mapping**: Traces relationships between components
- **API Discovery**: Finds relevant endpoints and contracts
- **Architecture Analysis**: Understands system design patterns
- **Impact Assessment**: Identifies affected areas

**Usage Example:**
```
# Exploring authentication patterns
Code Explorer analyzing: How is authentication currently implemented?

📊 Analysis Results:

Current Authentication:
- Pattern: JWT-based with refresh tokens
- Location: src/auth/
- Dependencies: jsonwebtoken, bcrypt
- Middleware: src/middleware/auth.ts
- Models: User, Session

Similar Implementations:
1. Password reset flow (src/auth/reset.ts)
   - Uses email verification
   - Token expiration: 1 hour
   
2. OAuth integration (src/auth/oauth.ts)
   - Supports Google, GitHub
   - Uses passport.js

Key Patterns:
- Token validation in middleware
- Refresh token rotation
- Session management with Redis
- Rate limiting on auth endpoints

Recommendations:
- Follow existing JWT pattern
- Reuse token validation middleware
- Consider same rate limiting approach
```

### Agent: Code Architect

Designs feature architecture and implementation blueprint.

**Capabilities:**
- **Component Design**: Plans component structure
- **Data Modeling**: Designs schemas and relationships
- **API Design**: Defines endpoints and contracts
- **Integration Planning**: Maps system touchpoints
- **Performance Planning**: Considers optimization strategies

**Usage Example:**
```
# Designing user settings feature
Code Architect designing: User profile settings page

📐 Architecture Blueprint:

1. Components Structure:
   ```
   src/features/settings/
   ├── components/
   │   ├── SettingsLayout.tsx      # Main container
   │   ├── ProfileSection.tsx      # Profile editing
   │   ├── PreferencesSection.tsx  # User preferences
   │   └── SecuritySection.tsx     # Password, 2FA
   ├── hooks/
   │   ├── useSettings.ts          # Settings state
   │   └── useValidation.ts        # Form validation
   ├── types/
   │   └── settings.types.ts       # TypeScript types
   └── api/
       └── settings.api.ts         # API client
   ```

2. Data Model:
   ```typescript
   interface UserSettings {
     profile: {
       displayName: string;
       avatar: string;
       bio: string;
     };
     preferences: {
       theme: 'light' | 'dark';
       language: string;
       notifications: boolean;
     };
     security: {
       twoFactorEnabled: boolean;
       lastPasswordChange: Date;
     };
   }
   ```

3. API Endpoints:
   - GET /api/settings - Fetch current settings
   - PATCH /api/settings/profile - Update profile
   - PATCH /api/settings/preferences - Update preferences
   - POST /api/settings/password - Change password
   - POST /api/settings/2fa - Toggle 2FA

4. Integration Points:
   - Auth middleware for protected routes
   - File upload for avatar (existing service)
   - Email service for verification
   - Cache layer for settings (Redis)

5. Performance Considerations:
   - Debounce auto-save (500ms)
   - Lazy load sections
   - Optimize avatar uploads
   - Cache settings in memory

Next Steps:
1. Create component files
2. Implement data layer
3. Build API endpoints
4. Add form validation
5. Write tests
```

### Agent: Code Reviewer

Comprehensive code review for quality and correctness.

**Capabilities:**
- **Bug Detection**: Identifies logic errors and edge cases
- **Quality Assessment**: Evaluates code maintainability
- **Convention Checking**: Ensures adherence to project standards
- **Test Coverage**: Verifies adequate testing
- **Performance Review**: Checks for optimization opportunities

**Usage Example:**
```
# Reviewing settings implementation
Code Reviewer analyzing: User settings feature

📋 Review Results:

✅ Strengths:
- Clear component structure
- Good TypeScript usage
- Comprehensive error handling
- Well-documented API

⚠️ Issues Found:

1. Missing Input Validation (Medium Priority)
   File: src/features/settings/components/ProfileSection.tsx:45
   
   Issue: Display name not validated for length
   Fix: Add max length validation (50 chars)
   
   ```typescript
   // Current
   setDisplayName(value);
   
   // Recommended
   if (value.length <= 50) {
     setDisplayName(value);
   } else {
     showError('Display name too long');
   }
   ```

2. Race Condition (High Priority)
   File: src/features/settings/hooks/useSettings.ts:67
   
   Issue: Multiple simultaneous saves could conflict
   Fix: Implement debouncing or request cancellation
   
   ```typescript
   // Add request cancellation
   const abortControllerRef = useRef<AbortController>();
   
   const saveSettings = async (data) => {
     abortControllerRef.current?.abort();
     abortControllerRef.current = new AbortController();
     // ... save with signal
   };
   ```

3. Missing Test Coverage
   - No tests for preferences section
   - Edge cases not covered in password change
   
   Recommendation: Add tests for:
   - Invalid input handling
   - Concurrent save operations
   - Network error scenarios

📊 Metrics:
- Test Coverage: 78% (target: 80%+)
- Complexity: Low-Medium (good)
- Maintainability: A-
- Documentation: Complete

Overall Assessment: Good implementation with minor issues.
Recommend addressing race condition before merge.
```

## Installation

This plugin is included with Claude Code. To enable it:

```bash
/plugin enable feature-dev
```

Or add to `.claude/settings.json`:

```json
{
  "plugins": {
    "feature-dev": {
      "enabled": true
    }
  }
}
```

## Configuration

Customize the workflow in `.claude/settings.json`:

```json
{
  "plugins": {
    "feature-dev": {
      "enabled": true,
      "workflow": {
        "autoProgress": false,
        "saveProgress": true,
        "phaseChecklist": true
      },
      "explorer": {
        "searchDepth": 3,
        "includeTests": true,
        "includeDocs": true
      },
      "architect": {
        "includeTypeDefs": true,
        "generateDiagrams": true,
        "detailLevel": "comprehensive"
      },
      "reviewer": {
        "strictMode": true,
        "minCoverage": 80,
        "checkPerformance": true,
        "enforceConventions": true
      }
    }
  }
}
```

## Best Practices

### Requirements Phase
- Be specific about what success looks like
- Document edge cases early
- Get stakeholder alignment before coding

### Exploration Phase
- Look for existing patterns to reuse
- Understand why things are done certain ways
- Note technical debt to avoid

### Architecture Phase
- Design for maintainability first
- Consider future extensibility
- Document key decisions and tradeoffs

### Implementation Phase
- Work in small, testable increments
- Commit frequently with clear messages
- Review your own code as you go

### Review Phase
- Address high-priority issues first
- Don't skip test coverage
- Refactor for clarity

### Documentation Phase
- Write for your future self
- Include examples
- Document the "why", not just the "what"

## Examples

### Complete Feature Development

```bash
# Start new feature
/feature-dev

# Phase 1: Requirements
What feature? User notification preferences
What should it do? Allow users to customize email/push notifications
Success criteria? 
- Users can toggle notification types
- Preferences persist across sessions
- Changes take effect immediately

# Phase 2: Exploration (automatic)
🔍 Code Explorer analyzing notification system...
Found: Existing notification service (src/services/notify/)
Pattern: Event-driven with subscribers

# Phase 3: Architecture (automatic)
📐 Code Architect designing...
Blueprint created: 
- New PreferencesComponent
- PATCH /api/users/:id/notification-preferences
- Preference schema added to User model

# Phase 4: Planning
Breaking down into tasks:
1. Create preference schema [2h]
2. Build API endpoint [3h]
3. Create UI component [4h]
4. Add tests [2h]
5. Documentation [1h]
Total: 12h

# Phase 5: Implementation
Ready to implement? (Y/n) Y
Creating files...
✓ src/features/notifications/types.ts
✓ src/api/preferences.ts
✓ src/components/NotificationPreferences.tsx

# Phase 6: Review (automatic)
🔍 Code Reviewer analyzing...
Found 1 issue: Missing validation
Fixed? (Y/n) Y

# Phase 7: Documentation
Generating documentation...
✓ API documentation updated
✓ Component props documented
✓ README updated

✅ Feature complete!
Next: Create PR and request review
```

## Integration with Development Tools

The plugin integrates with:

- **Git**: Automatic branching and commits
- **GitHub**: PR templates and issue linking
- **Testing Frameworks**: Test generation and coverage
- **Documentation**: Auto-generated docs
- **CI/CD**: Quality gate configurations

## Troubleshooting

### Issue: Phase stuck or not progressing
**Solution:** Use `--phase N` to skip to specific phase or restart workflow.

### Issue: Explorer not finding relevant code
**Solution:** Increase searchDepth in settings or provide hints about related files.

### Issue: Architect design doesn't match conventions
**Solution:** Update project conventions in settings or provide example implementations.

## Learn More

- [Feature Development Best Practices](https://docs.claude.com/en/docs/development/features)
- [Software Architecture Patterns](https://www.patterns.dev/)
- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code/overview)
