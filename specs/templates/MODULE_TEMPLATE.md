# [Module Name] - Natural Language Specification 3.0

> **AI-Compilable Documentation**
> This document serves as both human-readable documentation and AI-compilable specification for code generation.

---

## 1. Module Overview

### Functional Positioning
<!-- Describe where this module fits in the overall system architecture -->

**Purpose**: [Brief statement of module's primary purpose]

**Domain**: [Business domain or technical domain this module belongs to]

**Scope**: [What this module does and doesn't do]

### Core Responsibilities
<!-- List 3-7 key responsibilities -->

1. **[Responsibility 1]**: [Description]
2. **[Responsibility 2]**: [Description]
3. **[Responsibility 3]**: [Description]

### Design Goals
<!-- What principles guide this module's design? -->

- **[Goal 1]**: [Description and rationale]
- **[Goal 2]**: [Description and rationale]
- **[Goal 3]**: [Description and rationale]

### Dependencies
<!-- High-level module dependencies -->

- **Upstream**: [Modules this depends on]
- **Downstream**: [Modules that depend on this]
- **External**: [Third-party libraries or services]

---

## 2. Interface Definition

### Input Specifications

#### Function/Method: `[functionName]`

**Parameters**:
- `param1`: [Type] - [Description]
  - **Constraints**: [e.g., "non-empty string, 1-50 characters", "positive integer", "valid email format"]
  - **Default**: [Default value if applicable]
  - **Required**: [Yes/No]

- `param2`: [Type] - [Description]
  - **Constraints**: [Constraints]
  - **Default**: [Default value]
  - **Required**: [Yes/No]

**Validation Rules**:
1. [Validation rule 1]
2. [Validation rule 2]
3. [Validation rule 3]

### Output Specifications

#### Return Format

**Success Response**:
```typescript
{
  success: boolean;          // Always true for success
  data: {                    // Main payload
    [field1]: [Type];        // Description
    [field2]: [Type];        // Description
  };
  metadata?: {               // Optional metadata
    timestamp: string;       // ISO 8601 format
    version: string;         // API version
  };
}
```

**Error Response**:
```typescript
{
  success: boolean;          // Always false for errors
  error: {
    code: string;            // Error code (e.g., "VALIDATION_ERROR")
    message: string;         // Human-readable error message
    details?: any;           // Additional error context
  };
}
```

### Data Type Definitions

```typescript
interface [InterfaceName] {
  // Field definitions with explicit types and constraints
  id: string;                           // UUID v4, non-empty
  name: string;                         // Non-empty string, 1-100 characters
  amount: number;                       // Positive number, max 2 decimal places
  status: 'active' | 'inactive';       // Enum: only these values allowed
  createdAt: Date;                      // ISO 8601 timestamp
  metadata?: Record<string, any>;       // Optional key-value pairs
}
```

---

## 3. Core Logic

### Processing Flow

#### High-Level Algorithm

1. **Input Validation Phase**
   - Validate parameter types and constraints
   - Check required fields are present
   - Sanitize input data
   - If validation fails → throw ValidationError

2. **Data Retrieval Phase**
   - Query required data from [data source]
   - Apply filters and transformations
   - If data not found → throw NotFoundError

3. **Business Logic Phase**
   - Apply business rules
   - Perform calculations/transformations
   - Validate business constraints
   - If business rule violation → throw BusinessError

4. **Persistence Phase**
   - Prepare data for storage
   - Execute transactional operations
   - Handle conflicts and retries
   - If persistence fails → throw PersistenceError

5. **Response Formation Phase**
   - Format output according to interface specs
   - Add metadata
   - Return success response

### Detailed Step Descriptions

#### Step 1: Input Validation
```
FUNCTION validateInput(params)
  FOR EACH param IN params:
    IF param.type != expectedType:
      THROW ValidationError("Invalid type for " + param.name)

    IF param has constraints:
      IF NOT satisfiesConstraints(param):
        THROW ValidationError("Constraint violation for " + param.name)

  RETURN validated_params
END FUNCTION
```

#### Step 2: [Next Step]
<!-- Repeat for each major step -->

### Data Structures

**Internal State Structure**:
```typescript
interface InternalState {
  // Describe internal data structures used during processing
  cache: Map<string, any>;              // LRU cache, max 1000 entries
  processingQueue: Queue<Task>;         // Max 100 concurrent tasks
  metrics: {
    operationCount: number;
    lastExecutionTime: number;
  };
}
```

### Algorithms

**Algorithm Name**: [Name]
- **Complexity**: O([time complexity])
- **Space Usage**: O([space complexity])
- **Description**: [Detailed algorithm description]

---

## 4. State Management

### Internal State Model

**State Lifecycle**:
1. **Initialization** → Load configuration, establish connections
2. **Ready** → Accept and process requests
3. **Busy** → Processing active requests
4. **Degraded** → Operating with limited capacity
5. **Error** → Temporary failure state
6. **Shutdown** → Graceful cleanup and termination

### State Transitions

```
[Initialization] --success--> [Ready]
[Initialization] --failure--> [Error]
[Ready] --request--> [Busy]
[Busy] --complete--> [Ready]
[Busy] --overload--> [Degraded]
[Degraded] --recovery--> [Ready]
[Error] --retry--> [Initialization]
[Any State] --shutdown--> [Shutdown]
```

### Persistence Strategy

**Session State**:
- **Storage**: [In-memory / Database / Cache]
- **Scope**: [Request / Session / Global]
- **TTL**: [Time-to-live specification]

**Persistent State**:
- **Storage**: [Database / File System]
- **Backup**: [Backup strategy]
- **Recovery**: [Recovery procedure]

### Concurrency Handling

- **Thread Safety**: [Thread-safe / Not thread-safe]
- **Lock Strategy**: [Optimistic / Pessimistic / Lock-free]
- **Isolation Level**: [Read uncommitted / Read committed / Repeatable read / Serializable]

---

## 5. Exception Handling

### Error Classification

#### System Errors
**Definition**: Errors from infrastructure or external systems

1. **FileSystemError**
   - **When**: File operations fail (read/write/delete)
   - **Recovery**: Retry with exponential backoff (3 attempts, 2s/4s/8s delays)
   - **Fallback**: Use temporary in-memory storage

2. **NetworkError**
   - **When**: Network requests timeout or fail
   - **Recovery**: Retry with circuit breaker pattern (5 failures → 30s cooldown)
   - **Fallback**: Return cached data if available

3. **DatabaseError**
   - **When**: Database operations fail
   - **Recovery**: Rollback transaction, retry once after 5s
   - **Fallback**: Notify administrator, return graceful error

#### Business Errors
**Definition**: Violations of business rules or constraints

1. **ValidationError**
   - **When**: Input data fails validation rules
   - **Recovery**: Not recoverable, reject request
   - **Response**: HTTP 400 with detailed validation errors

2. **AuthorizationError**
   - **When**: User lacks required permissions
   - **Recovery**: Not recoverable, reject request
   - **Response**: HTTP 403 with permission requirements

3. **ResourceNotFoundError**
   - **When**: Requested resource doesn't exist
   - **Recovery**: Not recoverable
   - **Response**: HTTP 404 with resource identifier

4. **ConflictError**
   - **When**: Operation conflicts with current state
   - **Recovery**: Client should retry with fresh data
   - **Response**: HTTP 409 with conflict details

#### User Errors
**Definition**: Client-side errors or rate limiting

1. **InvalidInputError**
   - **When**: Malformed request data
   - **Recovery**: Client must correct input
   - **Response**: HTTP 400 with correction hints

2. **RateLimitError**
   - **When**: Client exceeds rate limits
   - **Recovery**: Client should implement backoff
   - **Response**: HTTP 429 with retry-after header

3. **QuotaExceededError**
   - **When**: User exceeds usage quota
   - **Recovery**: Upgrade plan or wait for reset
   - **Response**: HTTP 402 with quota details

### Error Handling Strategy

```typescript
TRY:
  // Main operation
  result = performOperation()
  RETURN success(result)

CATCH SystemError as e:
  IF retryable(e) AND attemptCount < maxRetries:
    wait(exponentialBackoff(attemptCount))
    RETRY operation
  ELSE:
    logError(e)
    RETURN degradedOperation() OR errorResponse(e)

CATCH BusinessError as e:
  logWarning(e)
  RETURN errorResponse(e)

CATCH UserError as e:
  RETURN errorResponse(e)

FINALLY:
  cleanup()
```

### Monitoring & Logging

**Error Metrics**:
- Error rate by type
- Recovery success rate
- Mean time to recovery (MTTR)

**Log Levels**:
- **ERROR**: System and unrecoverable business errors
- **WARN**: Business errors and recovered system errors
- **INFO**: Successful operations and state changes
- **DEBUG**: Detailed execution flow

---

## 6. Performance Requirements

### Response Time Requirements

**SLA Commitments**:
- **99th percentile**: Requests complete within [100]ms
- **95th percentile**: Requests complete within [50]ms
- **Average**: Requests complete within [30]ms

**Timeouts**:
- **Operation timeout**: [5]s maximum
- **Database query timeout**: [2]s maximum
- **External API timeout**: [10]s maximum

### Throughput Capacity

**Concurrent Operations**:
- **Target**: Support [1000] concurrent operations
- **Maximum**: Handle up to [2000] concurrent operations (burst)
- **Degradation Point**: Performance degrades beyond [1500] operations

**Request Rate**:
- **Sustained**: [100] requests per second
- **Burst**: [500] requests per second for [30]s
- **Rate Limiting**: [50] requests per minute per user

### Resource Constraints

**Memory**:
- **Normal Operation**: [256]MB maximum
- **Peak Usage**: [512]MB maximum
- **Leak Detection**: Monitor for >10% growth over 1 hour

**CPU**:
- **Normal Operation**: [25]% of single core
- **Peak Usage**: [80]% of single core
- **Throttling**: Reduce processing if >90% sustained

**Storage**:
- **Cache Size**: [100]MB maximum
- **Temporary Files**: [50]MB maximum
- **Database Connections**: [10] maximum

### Optimization Strategies

1. **Object Pooling**
   - Reuse expensive objects (database connections, HTTP clients)
   - Pool size: [10-50] objects
   - Idle timeout: [5] minutes

2. **Caching**
   - **Strategy**: LRU (Least Recently Used)
   - **Size**: [1000] entries maximum
   - **TTL**: [5] minutes default
   - **Invalidation**: On data mutation

3. **Lazy Loading**
   - Load data only when needed
   - Implement pagination for large datasets (max [100] items per page)
   - Use streaming for large file operations

4. **Batch Processing**
   - Batch small operations together
   - Batch size: [50-100] operations
   - Flush interval: [1]s maximum

---

## 7. Security Considerations

### Authentication & Authorization

**Authentication Methods**:
- OAuth 2.0 with JWT tokens
- Token expiration: [1] hour
- Refresh token: [30] days

**Authorization Model**:
- **Type**: Role-Based Access Control (RBAC)
- **Roles**: [admin, manager, user, guest]
- **Permissions**: [create, read, update, delete]

**Permission Matrix**:
```
Operation       | Admin | Manager | User | Guest
----------------|-------|---------|------|-------
Create          |  ✓    |  ✓      |  ✓   |  ✗
Read            |  ✓    |  ✓      |  ✓   |  ✓
Update          |  ✓    |  ✓      |  own |  ✗
Delete          |  ✓    |  own    |  own |  ✗
Admin Panel     |  ✓    |  ✗      |  ✗   |  ✗
```

### Data Protection

**Encryption**:
- **In Transit**: TLS 1.3 minimum
- **At Rest**: AES-256 encryption for sensitive fields
- **Key Management**: Rotate keys every [90] days

**Sensitive Data**:
- Personal Identifiable Information (PII)
- Financial data
- Authentication credentials
- API keys and tokens

**Data Handling**:
- Never log sensitive data
- Mask sensitive fields in responses
- Sanitize data before storage
- Implement data retention policies

### Attack Prevention

**SQL Injection**:
- Use parameterized queries exclusively
- Never concatenate user input into SQL
- Validate input types and lengths

**XSS (Cross-Site Scripting)**:
- Sanitize all user input before display
- Use Content Security Policy (CSP) headers
- Escape HTML entities in output

**CSRF (Cross-Site Request Forgery)**:
- Implement CSRF tokens for state-changing operations
- Validate origin and referer headers
- Use SameSite cookie attribute

**DDoS Protection**:
- Rate limiting per IP: [100] requests/minute
- Request size limits: [10]MB maximum
- Connection limits: [1000] concurrent per IP
- Implement exponential backoff for repeated failures

**Input Validation**:
- Whitelist allowed characters
- Validate data types and ranges
- Sanitize file uploads
- Limit request payload size

### Audit Logging

**Logged Events**:
- Authentication attempts (success/failure)
- Authorization failures
- Data modifications (create/update/delete)
- Administrative actions
- Security events (rate limit violations, suspicious activity)

**Log Format**:
```typescript
{
  timestamp: string;        // ISO 8601
  level: string;           // INFO, WARN, ERROR
  event: string;           // Event type
  userId?: string;         // Actor (if authenticated)
  ipAddress: string;       // Source IP
  action: string;          // Operation performed
  resource: string;        // Affected resource
  result: string;          // Success/failure
  metadata?: object;       // Additional context
}
```

---

## 8. Dependencies

### Upstream Dependencies

**Required Services**:

1. **[Service Name]**
   - **Version**: [X.Y.Z]
   - **Purpose**: [What this service provides]
   - **Interface**: [API endpoint or method]
   - **Fallback**: [What happens if unavailable]

2. **[Another Service]**
   - **Version**: [X.Y.Z]
   - **Purpose**: [Purpose]
   - **Interface**: [Interface]
   - **Fallback**: [Fallback strategy]

### External Libraries

**Production Dependencies**:

```json
{
  "[library-name]": "[version]",
  // Purpose: [Why this library is needed]
  // Alternatives considered: [Other options]
  // License: [License type]
}
```

**Development Dependencies**:

```json
{
  "[dev-library]": "[version]",
  // Purpose: [Purpose]
}
```

### Configuration Requirements

**Environment Variables**:

```bash
# Database Configuration
DATABASE_URL="postgresql://..."      # Required, database connection string
DATABASE_POOL_SIZE="10"              # Optional, default: 10
DATABASE_TIMEOUT_MS="5000"           # Optional, default: 5000

# API Configuration
API_BASE_URL="https://..."           # Required, base URL for API
API_TIMEOUT_MS="10000"               # Optional, default: 10000
API_RETRY_ATTEMPTS="3"               # Optional, default: 3

# Security Configuration
JWT_SECRET="..."                     # Required, secret for JWT signing
JWT_EXPIRATION="3600"                # Optional, default: 3600 (1 hour)
ENCRYPTION_KEY="..."                 # Required for data encryption

# Feature Flags
FEATURE_CACHING="true"               # Optional, default: true
FEATURE_RATE_LIMITING="true"         # Optional, default: true
```

**Configuration File** (`config.json`):
```json
{
  "module": {
    "name": "[module-name]",
    "version": "[version]",
    "settings": {
      "[setting1]": "[value]",
      "[setting2]": "[value]"
    }
  }
}
```

### Downstream Interfaces

**Events Published**:

1. **[EventName]**
   - **When**: [Trigger condition]
   - **Payload**: [Data structure]
   - **Subscribers**: [Who listens to this]

2. **[AnotherEvent]**
   - **When**: [Condition]
   - **Payload**: [Structure]
   - **Subscribers**: [Subscribers]

**Webhooks**:
- **Endpoint**: [URL pattern]
- **Method**: [POST/PUT]
- **Payload**: [Structure]
- **Authentication**: [Method]

---

## 9. Testing & Verification

### Unit Tests

**Test Coverage Requirements**:
- **Minimum**: 80% code coverage
- **Target**: 90% code coverage
- **Critical Paths**: 100% coverage required

#### Test Case 1: [Function Name] - Valid Input

**Input**:
```typescript
{
  param1: "valid-value",
  param2: 123
}
```

**Expected Output**:
```typescript
{
  success: true,
  data: {
    result: "expected-result"
  }
}
```

**Verification**:
- Assert response structure matches interface
- Assert data values are correct
- Assert no side effects occurred

#### Test Case 2: [Function Name] - Invalid Input

**Input**:
```typescript
{
  param1: "",           // Empty string (violates constraints)
  param2: -1            // Negative number (violates constraints)
}
```

**Expected Output**:
```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid input parameters",
    details: [
      { field: "param1", error: "Must be non-empty" },
      { field: "param2", error: "Must be positive" }
    ]
  }
}
```

**Verification**:
- Assert ValidationError is thrown
- Assert error message is descriptive
- Assert no data was persisted

#### Test Case 3: [Edge Case]
<!-- Add more test cases for edge cases, error conditions, etc. -->

### Integration Tests

**Test Scenario 1: Complete Workflow**

**Setup**:
1. Initialize test database with seed data
2. Configure test environment variables
3. Start mock external services

**Steps**:
1. Call API endpoint with valid request
2. Verify database state changed correctly
3. Verify external service was called with correct parameters
4. Verify event was published
5. Verify response matches expectations

**Teardown**:
1. Clean up test data
2. Reset database state
3. Stop mock services

**Success Criteria**:
- All steps complete without errors
- Database state is consistent
- No resource leaks (connections, files, etc.)
- Transaction atomicity maintained

**Test Scenario 2: Error Recovery**

**Steps**:
1. Simulate external service failure
2. Verify retry logic executes correctly
3. Verify fallback behavior activates
4. Verify error is logged appropriately
5. Verify system returns to normal after recovery

**Success Criteria**:
- Graceful degradation occurs
- No data corruption
- System recovers automatically
- Appropriate error messages returned

### Performance Tests

**Load Test**:
- **Scenario**: Sustained load at 80% capacity
- **Duration**: [30] minutes
- **Expected**: All responses < [100]ms, 0% errors

**Stress Test**:
- **Scenario**: Gradually increase load to 150% capacity
- **Expected**: Graceful degradation beyond capacity, no crashes

**Spike Test**:
- **Scenario**: Sudden burst to 200% capacity for [10]s
- **Expected**: System handles burst, recovers within [5]s

**Endurance Test**:
- **Scenario**: Normal load for [24] hours
- **Expected**: No memory leaks, stable performance

**Acceptance Criteria**:
- Response time SLAs met under normal load
- No crashes or data loss under stress
- Resource usage within limits
- Error rate < [0.1]% under normal conditions

### Security Tests

**Penetration Testing**:
- SQL injection attempts
- XSS attempts
- CSRF attacks
- Authentication bypass attempts
- Authorization boundary tests

**Vulnerability Scanning**:
- Dependency vulnerability scan
- Static code analysis
- Dynamic application security testing (DAST)

**Compliance**:
- OWASP Top 10 verification
- [Industry-specific compliance checks]

---

## 10. AI Compiler Directives

### Language & Runtime

**Primary Language**: TypeScript 5.0+
**Runtime**: Node.js 18+ LTS
**Package Manager**: npm 9+ or pnpm 8+

**Compiler Options** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Code Style Standards

**Formatter**: Prettier 3.0+
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

**Linter**: ESLint 8.0+
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": "warn"
  }
}
```

**Naming Conventions**:
- Variables & Functions: `camelCase`
- Classes & Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private Members: `_prefixedCamelCase`
- Type Parameters: Single uppercase letter or `T` prefix (e.g., `T`, `TData`)

### Architecture Patterns

**Design Patterns**:
- **Dependency Injection**: Constructor injection for dependencies
- **Repository Pattern**: Data access layer abstraction
- **Observer Pattern**: Event-driven communication
- **Strategy Pattern**: Pluggable algorithms
- **Factory Pattern**: Object creation abstraction
- **Singleton Pattern**: Shared resource management (use sparingly)

**Project Structure**:
```
src/
├── domain/              # Business logic and entities
│   ├── entities/       # Domain entities
│   ├── services/       # Domain services
│   └── interfaces/     # Domain interfaces
├── application/         # Use cases and application logic
│   ├── usecases/       # Use case implementations
│   └── dtos/           # Data Transfer Objects
├── infrastructure/      # External concerns
│   ├── database/       # Database implementations
│   ├── http/           # HTTP clients
│   └── cache/          # Caching implementations
└── presentation/        # API/UI layer
    ├── controllers/    # Request handlers
    ├── middleware/     # Express middleware
    └── validators/     # Input validation
```

### Asynchronous Programming

**Promise-Based**:
- All async operations return Promises
- Use `async/await` syntax exclusively
- Avoid callback patterns
- Handle rejections with try/catch

**Error Handling**:
```typescript
async function operation(): Promise<Result> {
  try {
    const data = await fetchData();
    return { success: true, data };
  } catch (error) {
    logger.error('Operation failed', error);
    throw new ApplicationError('Operation failed', error);
  }
}
```

**Concurrency Control**:
- Limit concurrent operations to [10] using semaphore pattern
- Use Promise.allSettled() for parallel independent operations
- Implement request queuing for rate-limited resources

### Performance Optimizations

**Caching Strategy**:
```typescript
// LRU Cache implementation
const cache = new LRUCache<string, any>({
  max: 1000,              // Maximum 1000 entries
  ttl: 1000 * 60 * 5,    // 5 minute TTL
  updateAgeOnGet: true,   // Refresh on access
});
```

**Database Optimizations**:
- Use connection pooling (10-50 connections)
- Implement query result caching
- Use database indices on frequently queried fields
- Batch operations when possible (50-100 items per batch)

**Memory Management**:
- Stream large files instead of loading into memory
- Implement pagination for large datasets
- Clear unused references explicitly
- Monitor for memory leaks in long-running processes

### Deployment Specifications

**Build Command**:
```bash
npm run build
# Compiles TypeScript to JavaScript
# Generates source maps
# Bundles for production
```

**Environment**:
- **Development**: Local Node.js with hot reload
- **Staging**: Docker container with environment parity
- **Production**: Kubernetes pods with auto-scaling

**Health Checks**:
- **Liveness**: `/health/live` - Returns 200 if process is running
- **Readiness**: `/health/ready` - Returns 200 if ready to serve traffic
- **Startup**: 30s grace period for initialization

**Monitoring**:
- Instrument with OpenTelemetry
- Export metrics to Prometheus
- Send traces to distributed tracing system
- Log structured JSON to stdout

**Containerization** (`Dockerfile`):
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
USER node
CMD ["node", "dist/index.js"]
```

### Testing Directives

**Test Framework**: Jest 29+ or Vitest 1.0+
**Coverage Tool**: Istanbul/c8
**Mocking Library**: jest.mock() or vi.mock()

**Test File Naming**:
- Unit tests: `[module].spec.ts`
- Integration tests: `[module].integration.spec.ts`
- E2E tests: `[feature].e2e.spec.ts`

**Test Structure**:
```typescript
describe('[Module/Function Name]', () => {
  describe('[Method Name]', () => {
    it('should [expected behavior]', async () => {
      // Arrange
      const input = createTestInput();

      // Act
      const result = await functionUnderTest(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

### Documentation Generation

**API Documentation**: Generate from OpenAPI/Swagger annotations
**Code Documentation**: JSDoc comments for all public APIs
**Architecture Docs**: Generated from code using tools like TypeDoc

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 3.0.0 | YYYY-MM-DD | [Author] | Initial specification using NL Spec 3.0 |

---

## Notes

<!-- Additional notes, considerations, or future enhancements -->

---

*This specification follows Natural Language Programming Specification 3.0 standards for AI-compilable documentation.*
