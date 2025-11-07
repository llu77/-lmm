# Natural Language Specifications 3.0 - Complete Guide

> **Transform Documentation into Executable Specifications**
>
> This guide explains how to write AI-compilable natural language specifications that serve as both human-readable documentation and machine-executable instructions for code generation.

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Getting Started](#getting-started)
4. [The 10-Chapter Structure](#the-10-chapter-structure)
5. [Writing Specifications](#writing-specifications)
6. [Validation](#validation)
7. [Best Practices](#best-practices)
8. [Examples](#examples)
9. [Integration with Development Workflow](#integration-with-development-workflow)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

### What are Natural Language Specifications?

Natural Language Specifications 3.0 is a framework for writing **AI-compilable documentation** that bridges the gap between human understanding and machine execution. Unlike traditional documentation that merely describes what code does, NL Specs provide precise, structured specifications that AI systems can use to generate executable code directly.

### Key Benefits

- **Dual-Purpose**: Functions as both documentation and code generation blueprint
- **Consistency**: Enforces standardized structure across all modules
- **Completeness**: 10-chapter framework ensures no critical aspects are overlooked
- **Maintainability**: Single source of truth for both docs and implementation
- **AI-Friendly**: Optimized for Claude and other LLM-based code generation tools

### Philosophy

> "Code as documentation, documentation as code."

The Natural Language Spec 3.0 philosophy is that specifications should be precise enough to be executable, yet readable enough to serve as primary documentation for human developers.

---

## Core Concepts

### Semantic Clarity

Every specification must be **semantically unambiguous**. This means:

- **Data types are explicit**: Not just "string", but "non-empty string, 1-50 characters, alphanumeric only"
- **Logic is sequential**: Step-by-step descriptions with clear conditional branches
- **Performance is quantified**: "99% requests under 100ms" instead of "fast"
- **Errors are enumerable**: Complete classification with recovery strategies

### Structural Consistency

All specifications follow the **mandatory 10-chapter structure**:

1. Module Overview
2. Interface Definition
3. Core Logic
4. State Management
5. Exception Handling
6. Performance Requirements
7. Security Considerations
8. Dependencies
9. Testing & Verification
10. AI Compiler Directives

This structure ensures completeness and makes specifications predictable for both humans and AI.

### Compilability

Specifications are "compilable" when they contain enough precision for an AI system to:

1. Generate type definitions
2. Implement business logic
3. Handle errors appropriately
4. Meet performance requirements
5. Pass security audits
6. Generate test cases

---

## Getting Started

### Prerequisites

- Markdown editor (VS Code, Typora, etc.)
- Basic understanding of system architecture
- Knowledge of the module you're documenting
- Python 3.7+ (for validation script)

### Directory Structure

```
specs/
├── templates/
│   └── MODULE_TEMPLATE.md         # Standard template
├── modules/
│   ├── revenue-management.md      # Production specs
│   ├── user-authentication.md
│   └── ...
├── examples/
│   └── REVENUE_MANAGEMENT_SPEC.md # Example implementations
└── NATURAL_LANGUAGE_SPECS_GUIDE.md # This guide
```

### Creating Your First Specification

1. **Copy the template**:
   ```bash
   cp specs/templates/MODULE_TEMPLATE.md specs/modules/my-module.md
   ```

2. **Fill in the module name** in the header

3. **Work through each chapter systematically**

4. **Validate** using the validation script:
   ```bash
   python scripts/validate_spec.py specs/modules/my-module.md
   ```

5. **Iterate** until validation passes

---

## The 10-Chapter Structure

### Chapter 1: Module Overview

**Purpose**: Provide high-level context and positioning of the module within the system.

**Required Sections**:
- **Functional Positioning**: Where does this module fit in the architecture?
- **Core Responsibilities**: What are its 3-7 key responsibilities?
- **Design Goals**: What principles guide its design?
- **Dependencies**: What does it depend on? What depends on it?

**Example**:
```markdown
### Functional Positioning
The Revenue Management Module is a core component of the LMM Financial
Management System, responsible for tracking, validating, and reporting
daily revenue across multiple business branches.
```

---

### Chapter 2: Interface Definition

**Purpose**: Precisely define all inputs, outputs, and data types.

**Required Sections**:
- **Input Specifications**: Every parameter with complete constraints
- **Output Specifications**: Success and error response formats
- **Data Type Definitions**: TypeScript/interface definitions

**Critical**: This is the most important chapter for compilability.

**Data Type Precision**:

❌ **Bad (vague)**:
```typescript
function createUser(name: string, age: number)
```

✅ **Good (precise)**:
```typescript
/**
 * @param name - Non-empty string, 1-100 characters, Unicode letters and spaces only
 * @param age - Positive integer, 0-150, required
 */
function createUser(name: string, age: number)
```

**Constraint Specification**:
- **Strings**: Min/max length, character set, regex pattern
- **Numbers**: Min/max value, integer/float, decimal places
- **Arrays**: Min/max items, item type constraints
- **Objects**: Required fields, optional fields, nested constraints
- **Dates**: Format (ISO 8601), timezone, min/max range

---

### Chapter 3: Core Logic

**Purpose**: Describe the algorithmic behavior of the module.

**Required Sections**:
- **Processing Flow**: High-level algorithm in numbered steps
- **Detailed Step Descriptions**: Pseudocode for each step
- **Data Structures**: Internal data structures used
- **Algorithms**: Time/space complexity analysis

**Writing Effective Pseudocode**:

```
FUNCTION validateInput(params):
  FOR EACH field IN requiredFields:
    IF params[field] is null OR params[field] is undefined:
      THROW ValidationError("Field " + field + " is required")

  IF params.email is not valid_email_format:
    THROW ValidationError("Invalid email format")

  RETURN validated_params
END FUNCTION
```

**Key Principles**:
- Use plain English control structures (IF, FOR, WHILE)
- Be explicit about error conditions
- Show exact error messages
- Include edge cases

---

### Chapter 4: State Management

**Purpose**: Define how the module manages internal and persistent state.

**Required Sections**:
- **Internal State Model**: What state does it maintain?
- **State Transitions**: How does state change?
- **Persistence Strategy**: How is state stored?
- **Concurrency Handling**: Thread safety, locking

**State Lifecycle Example**:

```
[Initialization] --success--> [Ready]
[Ready] --request--> [Processing]
[Processing] --success--> [Complete]
[Processing] --failure--> [Error]
[Error] --retry--> [Processing]
```

---

### Chapter 5: Exception Handling

**Purpose**: Comprehensive error taxonomy and recovery strategies.

**Required Sections**:
- **Error Classification**: System, Business, User errors
- **Error Handling Strategy**: Try/catch pseudocode
- **Monitoring & Logging**: What to log and when

**Error Classification Framework**:

1. **System Errors**:
   - Infrastructure failures (database, network, filesystem)
   - Recovery: Automatic retries with exponential backoff
   - Example: DatabaseConnectionError

2. **Business Errors**:
   - Validation failures, authorization denials
   - Recovery: Not recoverable, return error to client
   - Example: ValidationError, AuthorizationError

3. **User Errors**:
   - Invalid input, rate limiting, quota exceeded
   - Recovery: Client must correct input or wait
   - Example: InvalidInputError, RateLimitError

**Every Error Must Specify**:
- **When**: Trigger condition
- **Recovery**: Automatic recovery strategy
- **Fallback**: What to do if recovery fails
- **Response**: HTTP status code and message

---

### Chapter 6: Performance Requirements

**Purpose**: Quantify performance expectations with SLAs.

**Required Sections**:
- **Response Time Requirements**: P50, P95, P99 latencies
- **Throughput Capacity**: Requests per second
- **Resource Constraints**: Memory, CPU, storage limits
- **Optimization Strategies**: Caching, batching, lazy loading

**SLA Format**:

```markdown
**SLA Commitments**:
- **99th percentile**: Operations complete within 200ms
- **95th percentile**: Operations complete within 100ms
- **Average**: Operations complete within 50ms
```

**Always Quantify**:
- ❌ "Fast response time"
- ✅ "99% of requests complete under 100ms"

- ❌ "Handles many concurrent users"
- ✅ "Supports 1000 concurrent operations, degrades gracefully beyond 1500"

---

### Chapter 7: Security Considerations

**Purpose**: Define security model and attack prevention.

**Required Sections**:
- **Authentication & Authorization**: Who can do what?
- **Data Protection**: Encryption, PII handling
- **Attack Prevention**: SQL injection, XSS, CSRF, etc.
- **Audit Logging**: What security events to log

**Permission Matrix Example**:

```markdown
Operation        | Admin | Manager | User | Guest
-----------------|-------|---------|------|-------
Create           |  ✓    |  ✓      |  ✓   |  ✗
Read             |  ✓    |  ✓      |  ✓   |  ✓
Update           |  ✓    |  ✓      |  own |  ✗
Delete           |  ✓    |  own    |  own |  ✗
```

**Attack Prevention Checklist**:
- [ ] SQL Injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] DDoS mitigation
- [ ] Input validation
- [ ] Rate limiting
- [ ] Authentication bypass prevention
- [ ] Authorization boundary enforcement

---

### Chapter 8: Dependencies

**Purpose**: Document all external dependencies and integration points.

**Required Sections**:
- **Upstream Dependencies**: Services this module depends on
- **External Libraries**: Third-party packages
- **Configuration Requirements**: Environment variables, config files
- **Downstream Interfaces**: Events, webhooks, APIs provided

**Dependency Documentation Format**:

```markdown
1. **[Service Name]**
   - **Version**: X.Y.Z
   - **Purpose**: What this service provides
   - **Interface**: API endpoint or method
   - **Fallback**: What happens if unavailable
```

---

### Chapter 9: Testing & Verification

**Purpose**: Define comprehensive test strategy.

**Required Sections**:
- **Unit Tests**: Test cases with inputs/outputs
- **Integration Tests**: End-to-end scenarios
- **Performance Tests**: Load, stress, endurance tests
- **Security Tests** (optional): Penetration testing

**Test Case Format**:

```markdown
#### Test Case 1: [Function Name] - [Scenario]

**Input**:
```typescript
{
  param1: "value",
  param2: 123
}
```

**Expected Output**:
```typescript
{
  success: true,
  data: { ... }
}
```

**Verification**:
- Assert response structure matches interface
- Assert data values are correct
- Assert no side effects occurred
```

**Coverage Requirements**:
- Minimum: 80% code coverage
- Target: 90% code coverage
- Critical paths: 100% coverage

---

### Chapter 10: AI Compiler Directives

**Purpose**: Provide language-specific implementation guidance for AI.

**Required Sections**:
- **Language & Runtime**: TypeScript/Node.js/Python/etc.
- **Code Style Standards**: Prettier, ESLint, naming conventions
- **Architecture Patterns**: Design patterns to use
- **Asynchronous Programming**: Promise/async-await patterns
- **Performance Optimizations**: Caching, batching strategies
- **Deployment Specifications**: Docker, Kubernetes, serverless

**This Chapter Tells AI**:
- What programming language to use
- What frameworks and libraries to prefer
- What design patterns to implement
- What naming conventions to follow
- How to structure the project
- How to handle async operations
- How to deploy the code

**Example Directive**:

```markdown
**Primary Language**: TypeScript 5.0+
**Runtime**: Node.js 18+ LTS
**Framework**: Express 4.18+

**Design Patterns**:
- Dependency Injection (constructor injection)
- Repository Pattern (data access abstraction)
- Observer Pattern (event-driven communication)

**Naming Conventions**:
- Functions: camelCase
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
```

---

## Writing Specifications

### Step-by-Step Process

#### 1. Research Phase (Before Writing)

- Understand the module's purpose completely
- Identify all inputs and outputs
- Map out the core algorithm
- List all dependencies
- Review similar existing modules
- Identify edge cases and error conditions

#### 2. Drafting Phase

Start with Chapter 1 (Module Overview) and work sequentially:

- **Day 1**: Chapters 1-3 (Overview, Interface, Logic)
- **Day 2**: Chapters 4-6 (State, Errors, Performance)
- **Day 3**: Chapters 7-9 (Security, Dependencies, Testing)
- **Day 4**: Chapter 10 + Revision

#### 3. Validation Phase

Run the validation script:

```bash
python scripts/validate_spec.py specs/modules/my-module.md
```

Fix all errors, address warnings, consider info suggestions.

#### 4. Review Phase

- Self-review: Can you implement code from this spec?
- Peer review: Have a colleague review
- AI test: Ask Claude to generate code from your spec

#### 5. Iteration Phase

Based on feedback:
- Add missing details
- Clarify ambiguous sections
- Add more examples
- Improve data type precision

---

### Writing Tips

#### Be Specific, Not General

❌ **Vague**:
```markdown
The function validates input and returns a result.
```

✅ **Specific**:
```markdown
The function validates that email is a valid email format (RFC 5322),
password is 8-128 characters with at least one uppercase, one lowercase,
one digit, and one special character. Returns { valid: boolean, errors:
string[] } where errors contains specific validation failure messages.
```

#### Use Examples Liberally

Every complex concept should have an example:

- Interface definitions → TypeScript example
- Algorithms → Pseudocode example
- Error handling → Try/catch example
- State transitions → State diagram
- Performance → Concrete numbers

#### Write for AI, Not Just Humans

AI systems need:
- **Explicit types**: "string" → "non-empty string, 1-50 chars"
- **Exact numbers**: "fast" → "< 100ms"
- **Complete enumerations**: List all error types, all states
- **Unambiguous logic**: Step-by-step, not high-level narrative

#### Use Consistent Terminology

Pick one term and stick with it:
- "User" or "Account" (not both)
- "Delete" or "Remove" (not both)
- "ID" or "Identifier" (not both)

---

## Validation

### Using the Validation Script

**Validate Single File**:
```bash
python scripts/validate_spec.py specs/modules/my-module.md
```

**Validate All Specs**:
```bash
python scripts/validate_spec.py --all
```

### Understanding Validation Results

**ERROR** ❌: Must be fixed for spec to be valid
- Missing required chapter
- Missing required section
- Invalid markdown structure

**WARNING** ⚠️: Should be addressed
- Chapters out of order
- Missing revision history
- Vague type definitions

**INFO** ℹ️: Suggestions for improvement
- Code blocks without language
- Consider adding more examples

### Common Validation Errors

**"Missing required chapter: X"**
- Solution: Add the missing chapter heading (## X. Title)

**"Missing required section 'Y' in chapter 'X'"**
- Solution: Add the missing section heading (### Y)

**"Multiple vague type definitions"**
- Solution: Add constraints to your type definitions
- Example: Change "string" to "non-empty string, 1-100 characters"

---

## Best Practices

### Do's ✅

1. **Start with the template**: Don't write from scratch
2. **Work sequentially**: Complete chapters in order
3. **Validate early, validate often**: Run validator after each chapter
4. **Use concrete examples**: Every concept needs an example
5. **Quantify everything**: Numbers over adjectives
6. **Think like an AI**: Would Claude understand this precisely?
7. **Version control**: Commit specs alongside code
8. **Keep specs updated**: Update spec when you change implementation

### Don'ts ❌

1. **Don't skip chapters**: All 10 are required
2. **Don't be vague**: "Fast", "secure", "reliable" need quantification
3. **Don't assume context**: Specs should be self-contained
4. **Don't write implementation**: Describe behavior, not code
5. **Don't skip examples**: Examples clarify abstract concepts
6. **Don't forget edge cases**: Document error conditions thoroughly
7. **Don't ignore validation warnings**: They usually indicate real issues

### Specification Quality Checklist

Use this checklist before marking a spec as complete:

- [ ] All 10 chapters present
- [ ] All required sections in each chapter
- [ ] Data types have explicit constraints
- [ ] All error types documented with recovery strategies
- [ ] Performance requirements quantified (P50, P95, P99)
- [ ] Security attack vectors addressed
- [ ] Test cases with inputs and expected outputs
- [ ] At least 5 code examples throughout
- [ ] Validation script passes without errors
- [ ] Peer reviewed by at least one person
- [ ] Successfully used to generate working code (if applicable)

---

## Examples

### Complete Example Specifications

See `specs/examples/` for complete, production-ready examples:

1. **REVENUE_MANAGEMENT_SPEC.md**
   - Full 10-chapter specification
   - Real module from LMM system
   - Demonstrates all concepts in practice
   - Includes TypeScript interfaces, pseudocode, test cases

### Example Snippets

#### Good Data Type Definition

```markdown
### Input Specifications

#### Function: `createUser`

**Parameters**:
- `email`: string - User's email address
  - **Constraints**: Valid RFC 5322 email format, max 254 characters
  - **Example**: "user@example.com"
  - **Required**: Yes

- `age`: number - User's age in years
  - **Constraints**: Integer, 0-150, no decimal places
  - **Required**: Yes

- `name`: string - User's full name
  - **Constraints**: Non-empty string, 1-100 characters, Unicode letters and spaces
  - **Required**: Yes
```

#### Good Error Classification

```markdown
#### Business Errors

1. **ValidationError**
   - **When**: Input data fails validation rules
   - **Recovery**: Not recoverable, reject request
   - **Response**: HTTP 400 with detailed validation errors
   - **Example**: Email format invalid

2. **AuthorizationError**
   - **When**: User lacks required permissions
   - **Recovery**: Not recoverable, reject request
   - **Response**: HTTP 403 with permission requirements
   - **Example**: Non-admin attempting admin operation
```

#### Good Test Case

```markdown
#### Test Case: createUser - Valid Input

**Input**:
```typescript
{
  email: "test@example.com",
  age: 25,
  name: "John Doe"
}
```

**Expected Output**:
```typescript
{
  success: true,
  data: {
    id: "<generated-uuid>",
    email: "test@example.com",
    age: 25,
    name: "John Doe",
    createdAt: "<timestamp>"
  }
}
```

**Verification**:
- Assert response.success === true
- Assert data.id is valid UUID v4
- Assert data.email === input.email
- Assert user exists in database
- Assert createdAt is within last 1 second
```

---

## Integration with Development Workflow

### Specification-First Development

1. **Write Spec First**: Before any code
2. **Review Spec**: Get team approval
3. **Generate Code**: Use AI (Claude) to generate implementation from spec
4. **Test Against Spec**: Verify implementation matches specification
5. **Update Spec**: If implementation reveals spec issues

### Using Specs with Claude

**Prompt Template**:
```
I have a Natural Language Specification 3.0 document for a module.
Please implement this module following the specification exactly.

[Paste specification here]

Focus on:
1. Matching the interface definition precisely
2. Implementing the core logic as described
3. Handling all error cases from Chapter 5
4. Meeting performance requirements from Chapter 6
5. Following security guidelines from Chapter 7
6. Using the compiler directives from Chapter 10
```

### Keeping Specs in Sync with Code

**Git Hooks**: Add pre-commit hook to remind developers to update specs

```bash
#!/bin/bash
# .git/hooks/pre-commit

changed_files=$(git diff --cached --name-only --diff-filter=ACMR | grep "^src/")

if [ -n "$changed_files" ]; then
    echo "⚠️  Reminder: Did you update the corresponding specification in specs/?"
    echo "Changed files:"
    echo "$changed_files"

    # Don't block commit, just remind
    exit 0
fi
```

**Review Process**:
- Code reviews should reference corresponding specs
- Spec changes require code review
- Code changes should update specs in same PR

---

## Troubleshooting

### Common Issues

#### "My spec is too long"

**Solution**: It's okay! Completeness is more important than brevity. A good spec is often 200-300 lines per module. Complex modules can be 500+ lines.

#### "I don't know what to put in Chapter X"

**Solution**:
1. Review the example (REVENUE_MANAGEMENT_SPEC.md)
2. Read that chapter in this guide
3. Start with minimal content, iterate later
4. Ask AI (Claude) for suggestions

#### "Validation says my types are vague"

**Solution**: Add constraints. For every type, ask:
- What values are allowed?
- What's the min/max?
- What format?
- What happens if null/undefined?

Before: `name: string`
After: `name: string - Non-empty, 1-100 characters, Unicode letters/spaces only`

#### "I have 20+ error types"

**Solution**: That's fine! Good error handling means comprehensive classification. Group them under System/Business/User categories.

#### "Chapter 10 seems redundant with code"

**Solution**: Chapter 10 isn't for developers reading your code—it's for AI generating code from your spec. It tells AI what language, frameworks, patterns to use.

### Getting Help

1. **Review Examples**: Check `specs/examples/` for patterns
2. **Read Template Comments**: The template has helpful hints
3. **Run Validator**: It will point out structural issues
4. **Ask Team**: Share draft for feedback
5. **Iterate**: Specs improve through multiple revisions

---

## Conclusion

Natural Language Specifications 3.0 represents a paradigm shift in how we think about documentation. By writing specifications with enough precision for AI-powered code generation, we create documentation that is:

- **Always Accurate**: Specs define implementation
- **Always Complete**: 10-chapter structure ensures nothing is missed
- **Always Useful**: Serves both humans and AI

### Next Steps

1. **Start Small**: Pick a simple module to specify first
2. **Use the Template**: Don't reinvent structure
3. **Validate Often**: Catch issues early
4. **Get Feedback**: Share specs for review
5. **Generate Code**: Test specs by generating implementations
6. **Iterate**: Specs improve with practice

### Additional Resources

- **Natural Language Spec 3.0 Standard**: [Link to original document]
- **Example Specifications**: `specs/examples/`
- **Template**: `specs/templates/MODULE_TEMPLATE.md`
- **Validation Script**: `scripts/validate_spec.py`

---

## Appendix: Quick Reference

### 10 Chapters (Mandatory)

1. Module Overview - Context and positioning
2. Interface Definition - Inputs, outputs, data types
3. Core Logic - Algorithms and processing flow
4. State Management - Internal and persistent state
5. Exception Handling - Error taxonomy and recovery
6. Performance Requirements - SLAs and optimization
7. Security Considerations - Authentication, authorization, attacks
8. Dependencies - Upstream, downstream, libraries
9. Testing & Verification - Unit, integration, performance tests
10. AI Compiler Directives - Language, style, patterns

### Validation Command

```bash
python scripts/validate_spec.py <file>
python scripts/validate_spec.py --all
```

### Specification Quality Metrics

**Good Spec**:
- ✅ All 10 chapters present
- ✅ Validation passes without errors
- ✅ Data types have constraints
- ✅ 5+ code examples
- ✅ Quantified performance requirements
- ✅ Complete error taxonomy
- ✅ Can generate working code from spec

---

*This guide is maintained alongside the Natural Language Specification 3.0 framework.*
*Last Updated: 2025-11-07*
