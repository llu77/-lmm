# Revenue Management Module - Natural Language Specification 3.0

> **AI-Compilable Documentation**
> This document serves as both human-readable documentation and AI-compilable specification for code generation.

---

## 1. Module Overview

### Functional Positioning
The Revenue Management Module is a core component of the LMM Financial Management System, responsible for tracking, validating, and reporting daily revenue across multiple business branches.

**Purpose**: Enable multi-branch businesses to record daily revenue with automatic validation, employee attribution, and compliance checking.

**Domain**: Financial Operations - Revenue Tracking

**Scope**:
- **Included**: Revenue entry, validation, employee attribution, mismatch detection, PDF reporting
- **Excluded**: Payment processing, invoicing, accounting reconciliation, tax calculation

### Core Responsibilities

1. **Revenue Recording**: Accept and store daily revenue data with cash, network (card), and budget components
2. **Validation & Matching**: Automatically validate revenue consistency and flag mismatches requiring explanation
3. **Employee Attribution**: Track revenue contribution per employee (up to 6 employees per entry)
4. **Multi-Branch Support**: Isolate revenue data by branch with proper access controls
5. **Reporting**: Generate PDF reports for revenue records with monthly aggregation
6. **Audit Trail**: Maintain immutable records with soft-delete capabilities for admin users only

### Design Goals

- **Data Integrity**: Prevent revenue manipulation through multi-layered validation (frontend + backend)
- **Transparency**: Require explicit explanations for any validation mismatches
- **Usability**: Intuitive RTL (Right-to-Left) Arabic interface with real-time feedback
- **Security**: Role-based access control with branch isolation and admin-only deletions
- **Performance**: Support 1000+ daily entries across all branches with sub-100ms response times

### Dependencies

- **Upstream**:
  - Authentication Service (OAuth)
  - Branch Management Service
  - User Role Service (RBAC)
- **Downstream**:
  - Bonus Calculation Module (uses revenue data)
  - Financial Reports Module
  - Payroll Module
- **External**:
  - Cloudflare Workers (backend API)
  - Cloudflare R2 (PDF storage)
  - React 18+ (frontend)
  - Convex Database (data persistence)

---

## 2. Interface Definition

### Input Specifications

#### Function/Method: `createRevenue`

**Parameters**:
- `date`: Date - Revenue entry date
  - **Constraints**: ISO 8601 date string, cannot be future date, max 90 days in past
  - **Required**: Yes

- `cash`: number - Cash (physical currency) amount
  - **Constraints**: Non-negative number, max 2 decimal places, max value 1000000
  - **Required**: Yes

- `network`: number - Network (card payment) amount
  - **Constraints**: Non-negative number, max 2 decimal places, max value 1000000
  - **Required**: Yes

- `budget`: number - Budget allocation amount
  - **Constraints**: Non-negative number, max 2 decimal places, max value 1000000
  - **Default**: 0
  - **Required**: No

- `branchId`: string - Branch identifier
  - **Constraints**: Non-empty string, must match user's authorized branches
  - **Required**: Yes

- `branchName`: string - Branch display name
  - **Constraints**: Non-empty string, 1-100 characters
  - **Required**: Yes

- `employees`: Employee[] - Array of employee revenue attributions
  - **Constraints**: Max 6 employees, sum of employee revenues must equal (cash + network)
  - **Default**: []
  - **Required**: No

- `mismatchReason`: string - Explanation for validation failures
  - **Constraints**: Non-empty string if isMatched=false, 10-500 characters
  - **Required**: Conditional (required when validation fails)

**Employee Interface**:
```typescript
{
  name: string;      // Non-empty, must be from branch employee list
  revenue: number;   // Positive number, max 2 decimals
}
```

**Validation Rules**:
1. `calculatedTotal = cash + network` (always true by definition)
2. `budget must equal network` for matched status
3. If employees provided, `sum(employees.revenue) === (cash + network)`
4. If `!isMatched`, mismatchReason must be provided
5. Date cannot be in future
6. All monetary values must have max 2 decimal places

### Output Specifications

#### Return Format

**Success Response**:
```typescript
{
  success: true;
  data: {
    _id: string;                    // Generated document ID
    date: number;                   // Timestamp (milliseconds)
    cash: number;                   // Cash amount
    network: number;                // Network amount
    budget: number;                 // Budget amount
    total: number;                  // cash + network
    calculatedTotal: number;        // cash + network (same as total)
    isMatched: boolean;             // true if budget === network
    branchId: string;               // Branch identifier
    branchName: string;             // Branch display name
    employees?: Employee[];         // Employee attributions
    mismatchReason?: string;        // Reason if !isMatched
    createdAt: number;              // Timestamp
    createdBy: string;              // User ID
  };
  metadata: {
    timestamp: string;              // ISO 8601
    version: string;                // API version (e.g., "1.0")
  };
}
```

**Error Response**:
```typescript
{
  success: false;
  error: {
    code: string;                   // Error code
    message: string;                // Human-readable error in Arabic
    details?: {
      field?: string;               // Field that failed validation
      expected?: any;               // Expected value/format
      actual?: any;                 // Actual value provided
    };
  };
}
```

**Error Codes**:
- `VALIDATION_ERROR`: Input validation failed
- `AUTHORIZATION_ERROR`: User lacks permission
- `BRANCH_ACCESS_DENIED`: User cannot access specified branch
- `EMPLOYEES_SUM_MISMATCH`: Employee revenues don't sum to total
- `MISMATCH_REASON_REQUIRED`: Validation failed but no reason provided
- `FUTURE_DATE_NOT_ALLOWED`: Date is in the future
- `DATE_TOO_OLD`: Date is more than 90 days in past

### Data Type Definitions

```typescript
interface Revenue {
  _id: string;                      // UUID v4, non-empty
  date: number;                     // Unix timestamp in milliseconds
  cash: number;                     // Positive or zero, max 2 decimals
  network: number;                  // Positive or zero, max 2 decimals
  budget: number;                   // Positive or zero, max 2 decimals
  total: number;                    // Calculated: cash + network
  calculatedTotal: number;          // Same as total (for validation)
  isMatched: boolean;               // true if budget === network
  branchId: string;                 // Branch ID, non-empty
  branchName: string;               // Branch name, non-empty, 1-100 chars
  employees: Employee[];            // 0-6 employees
  mismatchReason?: string;          // Required if !isMatched, 10-500 chars
  createdAt: number;                // Creation timestamp
  createdBy: string;                // Creator user ID
  updatedAt?: number;               // Last update timestamp
  updatedBy?: string;               // Last updater user ID
  deletedAt?: number;               // Soft delete timestamp (admin only)
  deletedBy?: string;               // Deleter user ID
  isDeletedPermanently: boolean;    // Hard delete flag (default: false)
}

interface Employee {
  name: string;                     // Employee full name, from branch roster
  revenue: number;                  // Revenue attributed to employee, positive
}

interface RevenueStats {
  totalRevenue: number;             // All-time total revenue for branch
  totalCash: number;                // All-time cash total
  totalNetwork: number;             // All-time network total
  totalBudget: number;              // All-time budget total
  currentMonthTotal: number;        // Current month revenue
  matchedCount: number;             // Count of matched entries
  mismatchedCount: number;          // Count of mismatched entries
  mismatchRate: number;             // Percentage (0-100)
}
```

---

## 3. Core Logic

### Processing Flow

#### High-Level Algorithm: Create Revenue Entry

1. **Input Validation Phase**
   - Validate all parameter types and constraints
   - Check required fields are present and non-empty
   - Validate monetary values (non-negative, max 2 decimals)
   - Validate date constraints (not future, not older than 90 days)
   - If validation fails → throw ValidationError with details

2. **Authentication & Authorization Phase**
   - Verify user is authenticated (valid JWT token)
   - Check user has access to specified branchId
   - Verify user has "create_revenue" permission
   - If authorization fails → throw AuthorizationError

3. **Business Logic Validation Phase**
   - Calculate `total = cash + network`
   - Calculate `isMatched = (budget === network)`
   - If employees provided:
     - Validate each employee name exists in branch roster
     - Calculate `employeesTotal = sum(employees.revenue)`
     - Verify `employeesTotal === total`
     - If mismatch → throw EmployeesSumMismatchError
   - If `!isMatched` and no `mismatchReason`:
     - Throw MismatchReasonRequiredError
   - If `!isMatched` and `mismatchReason` provided:
     - Log mismatch event for audit

4. **Data Enrichment Phase**
   - Add timestamp (`createdAt = Date.now()`)
   - Add creator (`createdBy = currentUser.id`)
   - Generate unique ID (`_id = generateUUID()`)
   - Set `calculatedTotal = total`

5. **Persistence Phase**
   - Begin database transaction
   - Insert revenue record
   - Update branch monthly statistics
   - Commit transaction
   - If persistence fails → rollback and throw PersistenceError

6. **Response Formation Phase**
   - Format output according to success response interface
   - Add metadata (timestamp, version)
   - Return success response

### Detailed Step Descriptions

#### Step 1: Input Validation
```
FUNCTION validateRevenueInput(params):
  // Validate date
  IF params.date is null OR params.date is undefined:
    THROW ValidationError("Date is required")

  dateObj = new Date(params.date)
  IF dateObj > currentDate():
    THROW ValidationError("Future dates not allowed", { field: "date" })

  IF dateObj < (currentDate() - 90 days):
    THROW ValidationError("Date too old (max 90 days)", { field: "date" })

  // Validate monetary values
  FOR EACH field IN [cash, network, budget]:
    value = params[field]

    IF field IN [cash, network] AND value is null:
      THROW ValidationError(field + " is required")

    IF value < 0:
      THROW ValidationError(field + " must be non-negative", { field })

    IF decimalPlaces(value) > 2:
      THROW ValidationError(field + " max 2 decimal places", { field })

    IF value > 1000000:
      THROW ValidationError(field + " exceeds maximum", { field })

  // Validate branch
  IF NOT params.branchId OR params.branchId.trim() === "":
    THROW ValidationError("Branch ID required")

  // Validate employees
  IF params.employees.length > 6:
    THROW ValidationError("Maximum 6 employees allowed")

  FOR EACH emp IN params.employees:
    IF NOT emp.name OR emp.name.trim() === "":
      THROW ValidationError("Employee name required")

    IF emp.revenue <= 0:
      THROW ValidationError("Employee revenue must be positive")

  RETURN validated_params
END FUNCTION
```

#### Step 3: Business Logic Validation
```
FUNCTION validateBusinessRules(params, user):
  // Calculate totals
  total = params.cash + params.network
  isMatched = (params.budget === params.network)

  // Validate employee sum
  IF params.employees.length > 0:
    employeesTotal = 0
    FOR EACH emp IN params.employees:
      employeesTotal += emp.revenue

    IF employeesTotal !== total:
      THROW EmployeesSumMismatchError(
        "Employees total (" + employeesTotal + ") != revenue total (" + total + ")",
        { expected: total, actual: employeesTotal }
      )

  // Validate mismatch reason
  IF NOT isMatched:
    IF NOT params.mismatchReason OR params.mismatchReason.trim().length < 10:
      THROW MismatchReasonRequiredError(
        "Mismatch reason required (min 10 characters)"
      )

    // Log mismatch for audit
    logAuditEvent({
      type: "REVENUE_MISMATCH",
      userId: user.id,
      branchId: params.branchId,
      reason: params.mismatchReason,
      data: { cash: params.cash, network: params.network, budget: params.budget }
    })

  RETURN { total, isMatched }
END FUNCTION
```

### Data Structures

**Internal State Structure**:
```typescript
interface RevenueModuleState {
  cache: Map<string, RevenueStats>;        // LRU cache for stats, max 100 branches
  validationRules: ValidationRule[];       // Configurable validation rules
  employeeRoster: Map<string, string[]>;   // branchId -> employee names
  metrics: {
    createCount: number;                   // Total creates
    validationErrors: number;              // Validation failure count
    mismatchCount: number;                 // Mismatched entries count
    avgResponseTime: number;               // Average API response time (ms)
  };
}
```

### Algorithms

**Algorithm Name**: Employee Revenue Sum Validation
- **Complexity**: O(n) where n = number of employees (max 6, so O(1) effective)
- **Space Usage**: O(1)
- **Description**: Iterate through employees array once, accumulating revenue totals, then compare to expected total in single operation

---

## 4. State Management

### Internal State Model

**State Lifecycle**:
1. **Initialization** → Load branch employee rosters, initialize cache
2. **Ready** → Accept revenue creation requests
3. **Processing** → Validating and persisting revenue entry
4. **Cached** → Statistics cached for 5 minutes
5. **Invalidated** → Cache cleared after new entry
6. **Error** → Temporary failure, retry logic active

### State Transitions

```
[Initialization] --success--> [Ready]
[Initialization] --failure--> [Error]
[Ready] --request--> [Processing]
[Processing] --success--> [Cached]
[Processing] --failure--> [Ready]
[Cached] --new_entry--> [Invalidated]
[Invalidated] --reload--> [Ready]
[Error] --retry--> [Initialization]
```

### Persistence Strategy

**Session State**:
- **Storage**: In-memory cache (Redis)
- **Scope**: Per-branch statistics
- **TTL**: 5 minutes

**Persistent State**:
- **Storage**: Convex Database (NoSQL document store)
- **Backup**: Automatic daily backups to Cloudflare R2
- **Recovery**: Point-in-time recovery available for 30 days
- **Indexes**:
  - Primary: `_id`
  - Secondary: `branchId + date`
  - Secondary: `createdBy + createdAt`

### Concurrency Handling

- **Thread Safety**: Yes (using database transactions)
- **Lock Strategy**: Optimistic locking with version numbers
- **Isolation Level**: Read committed
- **Conflict Resolution**: Last-write-wins for stats, strict serializability for entries

---

## 5. Exception Handling

### Error Classification

#### System Errors

1. **DatabaseConnectionError**
   - **When**: Database connection pool exhausted or network failure
   - **Recovery**: Retry with exponential backoff (3 attempts, 2s/4s/8s delays)
   - **Fallback**: Return HTTP 503 Service Unavailable

2. **CacheError**
   - **When**: Redis cache unavailable
   - **Recovery**: Bypass cache, read directly from database
   - **Fallback**: Continue operation without cache

3. **StorageError**
   - **When**: PDF generation or R2 upload fails
   - **Recovery**: Retry once after 5s
   - **Fallback**: Generate PDF on-demand instead of pre-caching

#### Business Errors

1. **ValidationError**
   - **When**: Input data fails validation rules
   - **Recovery**: Not recoverable, reject request
   - **Response**: HTTP 400 with detailed validation errors in Arabic

2. **AuthorizationError**
   - **When**: User lacks required permissions or branch access
   - **Recovery**: Not recoverable, reject request
   - **Response**: HTTP 403 with "⚠️ غير مصرح لك بهذا الإجراء"

3. **EmployeesSumMismatchError**
   - **When**: Sum of employee revenues ≠ total revenue
   - **Recovery**: Not recoverable, user must correct input
   - **Response**: HTTP 400 with detailed mismatch breakdown

4. **MismatchReasonRequiredError**
   - **When**: Validation failed (budget ≠ network) but no explanation provided
   - **Recovery**: Not recoverable, user must provide reason
   - **Response**: HTTP 400 with "يرجى إدخال سبب عدم المطابقة"

5. **RevenueLockedError**
   - **When**: Attempting to delete revenue entry already used in bonus calculation
   - **Recovery**: Not recoverable
   - **Response**: HTTP 409 with "⚠️ لا يمكن حذف إيراد معتمد في البونص"

#### User Errors

1. **FutureDateError**
   - **When**: Revenue date is in the future
   - **Recovery**: User must select valid date
   - **Response**: HTTP 400 with "التاريخ لا يمكن أن يكون في المستقبل"

2. **RateLimitError**
   - **When**: User exceeds 100 requests per minute
   - **Recovery**: Client should implement exponential backoff
   - **Response**: HTTP 429 with retry-after header

### Error Handling Strategy

```typescript
TRY:
  // Main operation
  validateInput(params)
  checkAuthorization(user, params.branchId)
  validateBusinessRules(params, user)
  result = persistRevenue(params)
  RETURN success(result)

CATCH ValidationError as e:
  logWarning('Validation failed', e)
  RETURN errorResponse(400, e)

CATCH AuthorizationError as e:
  logWarning('Authorization denied', e)
  RETURN errorResponse(403, e)

CATCH EmployeesSumMismatchError as e:
  logWarning('Employee sum mismatch', e)
  RETURN errorResponse(400, e)

CATCH DatabaseConnectionError as e:
  IF attemptCount < 3:
    wait(exponentialBackoff(attemptCount))
    RETRY operation
  ELSE:
    logError('Database unavailable', e)
    RETURN errorResponse(503, "الخدمة غير متوفرة مؤقتاً")

CATCH CacheError as e:
  logWarning('Cache unavailable, bypassing', e)
  bypassCache = true
  RETRY operation

FINALLY:
  releaseResources()
  recordMetrics()
```

### Monitoring & Logging

**Error Metrics**:
- Validation error rate (target: <5%)
- Authorization failure rate
- Database error rate (target: <0.1%)
- Average error recovery time

**Log Levels**:
- **ERROR**: Database failures, unhandled exceptions
- **WARN**: Validation failures, authorization denials, mismatched entries
- **INFO**: Successful revenue creation, mismatch reasons
- **DEBUG**: Detailed validation steps, cache hits/misses

---

## 6. Performance Requirements

### Response Time Requirements

**SLA Commitments**:
- **99th percentile**: Revenue creation completes within 200ms
- **95th percentile**: Revenue creation completes within 100ms
- **Average**: Revenue creation completes within 50ms

**Timeouts**:
- **Operation timeout**: 5s maximum (frontend)
- **Database query timeout**: 2s maximum
- **PDF generation timeout**: 30s maximum

### Throughput Capacity

**Concurrent Operations**:
- **Target**: Support 1000 concurrent revenue entries across all branches
- **Maximum**: Handle up to 2000 concurrent operations (burst)
- **Degradation Point**: Performance degrades beyond 1500 operations

**Request Rate**:
- **Sustained**: 100 revenue entries per second (system-wide)
- **Burst**: 500 entries per second for 30s
- **Rate Limiting**: 100 requests per minute per user

### Resource Constraints

**Memory**:
- **Normal Operation**: 128MB per worker
- **Peak Usage**: 256MB per worker
- **Cache Size**: 10MB for stats cache

**CPU**:
- **Normal Operation**: 15% of single core per worker
- **Peak Usage**: 60% of single core per worker

**Storage**:
- **Database**: ~500 bytes per revenue entry
- **PDFs**: ~50KB per monthly report
- **Expected Growth**: 10,000 entries per month = 5MB/month

### Optimization Strategies

1. **Database Indexing**
   - Compound index on `(branchId, date)` for monthly queries
   - Index on `createdBy` for user history queries
   - Partial index on `isMatched=false` for mismatch reports

2. **Caching**
   - **Strategy**: LRU cache for branch statistics
   - **Size**: 100 branches maximum
   - **TTL**: 5 minutes
   - **Invalidation**: On new revenue entry for branch

3. **Batch Operations**
   - Monthly PDF generation batched during off-peak hours
   - Statistics aggregation batched every 5 minutes
   - Audit log writes batched (100 entries)

4. **Frontend Optimizations**
   - Debounce validation checks (300ms)
   - Lazy load revenue history (pagination: 50 entries per page)
   - Virtual scrolling for large datasets

---

## 7. Security Considerations

### Authentication & Authorization

**Authentication Methods**:
- OAuth 2.0 with JWT tokens (Convex Auth)
- Token expiration: 1 hour
- Refresh token: 30 days

**Authorization Model**:
- **Type**: Role-Based Access Control (RBAC) with branch isolation
- **Roles**: admin, branch_manager, accountant, viewer
- **Permissions**: create_revenue, view_revenue, delete_revenue, export_revenue

**Permission Matrix**:
```
Operation        | Admin | Manager | Accountant | Viewer
-----------------|-------|---------|------------|-------
Create Revenue   |  ✓    |  ✓      |  ✓         |  ✗
View Own Branch  |  ✓    |  ✓      |  ✓         |  ✓
View All Branches|  ✓    |  ✗      |  ✗         |  ✗
Delete Revenue   |  ✓    |  ✗      |  ✗         |  ✗
Export PDF       |  ✓    |  ✓      |  ✓         |  ✓
```

### Data Protection

**Encryption**:
- **In Transit**: TLS 1.3 for all API calls
- **At Rest**: AES-256 encryption for database (managed by Convex)
- **Sensitive Fields**: mismatchReason encrypted at application level

**Data Retention**:
- Active records: Indefinite retention
- Soft-deleted records: 90 days before permanent deletion
- Audit logs: 7 years retention (compliance requirement)

**PII Handling**:
- Employee names are PII
- Branch names may contain PII
- Never log monetary values with user identifiers
- Mask sensitive data in error messages

### Attack Prevention

**SQL Injection**:
- N/A (using NoSQL document database with parameterized queries)
- Input validation prevents injection attacks

**Input Validation Attacks**:
- Whitelist validation for all numeric fields
- Maximum length enforcement (branchName: 100 chars)
- Sanitize employee names (remove special characters)
- Validate date ranges strictly

**CSRF (Cross-Site Request Forgery)**:
- CSRF tokens required for all state-changing operations
- SameSite=Strict cookie attribute
- Validate Origin and Referer headers

**Authorization Bypass**:
- Every API call verifies branch access
- User's authorized branches checked against request branchId
- Admin-only operations double-checked at database level

**Data Manipulation**:
- Frontend calculates total, backend recalculates and verifies
- Employee sum validation on both frontend and backend
- Immutable audit trail for all changes

**DDoS Protection**:
- Rate limiting: 100 requests/minute per user
- Cloudflare DDoS protection at edge
- Request size limit: 10KB maximum
- Connection limits: 1000 concurrent per IP

### Audit Logging

**Logged Events**:
- All revenue creation attempts (success + failure)
- All deletion attempts (admin only)
- Authorization failures (wrong branch access)
- Validation failures (mismatched entries)
- PDF export operations

**Log Format**:
```typescript
{
  timestamp: string;        // ISO 8601
  level: "INFO" | "WARN" | "ERROR";
  event: "REVENUE_CREATED" | "REVENUE_DELETED" | "VALIDATION_FAILED" | ...,
  userId: string;           // Actor
  ipAddress: string;        // Source IP (hashed for privacy)
  action: string;           // Operation performed
  resource: "revenue",
  resourceId: string;       // Revenue entry ID
  branchId: string;         // Affected branch
  result: "success" | "failure";
  metadata: {
    isMatched?: boolean;
    mismatchReason?: string;  // Truncated to 100 chars
    total?: number;           // Only for successful creates
  };
}
```

---

## 8. Dependencies

### Upstream Dependencies

**Required Services**:

1. **Convex Auth Service**
   - **Version**: Latest
   - **Purpose**: User authentication and session management
   - **Interface**: React hooks (`useConvexAuth()`)
   - **Fallback**: Show login screen if unavailable

2. **Branch Management Service**
   - **Version**: 1.0
   - **Purpose**: Provide branch information and access control
   - **Interface**: `useBranch()` hook
   - **Fallback**: Cannot proceed without branch selection

3. **User RBAC Service**
   - **Version**: 1.0
   - **Purpose**: Role-based permissions checking
   - **Interface**: REST API `/api/auth/check-permission`
   - **Fallback**: Deny access if service unavailable (fail-secure)

### External Libraries

**Production Dependencies**:

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@tanstack/react-query": "^4.0.0",     // Data fetching
  "date-fns": "^2.30.0",                  // Date manipulation
  "sonner": "^1.0.0",                     // Toast notifications
  "lucide-react": "^0.400.0",             // Icons
  "@radix-ui/react-dialog": "^1.0.0",    // Modal dialogs
  "@radix-ui/react-select": "^2.0.0",    // Dropdown selects
}
```

**Development Dependencies**:

```json
{
  "typescript": "^5.0.0",
  "@types/react": "^18.3.0",
  "vite": "^5.0.0",
  "tailwindcss": "^3.4.0"
}
```

### Configuration Requirements

**Environment Variables**:

```bash
# Convex Configuration
VITE_CONVEX_URL="https://..."           # Required, Convex deployment URL
CONVEX_DEPLOY_KEY="..."                  # Required for deployment only

# API Configuration
VITE_API_BASE_URL="https://..."          # Required, Cloudflare Worker URL
VITE_API_TIMEOUT_MS="10000"              # Optional, default: 10000

# Feature Flags
VITE_ENABLE_EMPLOYEE_ATTRIBUTION="true"  # Optional, default: true
VITE_MAX_EMPLOYEES_PER_ENTRY="6"         # Optional, default: 6
VITE_ENABLE_PDF_EXPORT="true"            # Optional, default: true

# Validation Configuration
VITE_MAX_REVENUE_ENTRY_AGE_DAYS="90"     # Optional, default: 90
VITE_REQUIRE_MISMATCH_REASON="true"      # Optional, default: true
```

**Branch Employee Configuration** (`config/branch-employees.json`):
```json
{
  "1010": ["عبدالحي جلال", "محمود عمارة", "علاء ناصر", "السيد محمد", "عمرو"],
  "2020": ["محمد إسماعيل", "محمد ناصر", "فارس محمد"]
}
```

### Downstream Interfaces

**Events Published**:

1. **RevenueCreated**
   - **When**: New revenue entry successfully persisted
   - **Payload**: Full revenue object
   - **Subscribers**: Bonus Calculation Module, Financial Reports Module

2. **RevenueMismatchDetected**
   - **When**: Revenue entry fails validation (budget ≠ network)
   - **Payload**: { revenueId, branchId, reason, amounts }
   - **Subscribers**: Audit Service, Admin Notification Service

3. **RevenueDeleted**
   - **When**: Admin deletes revenue entry
   - **Payload**: { revenueId, branchId, deletedBy }
   - **Subscribers**: Bonus Calculation Module (rollback), Audit Service

**API Endpoints Provided**:
- `POST /api/revenues/create` - Create revenue entry
- `GET /api/revenues/list` - List revenues (with filters)
- `GET /api/revenues/stats` - Get branch statistics
- `POST /api/revenues/remove` - Delete revenue (admin only)
- `POST /api/revenues/export-pdf` - Generate PDF report

---

## 9. Testing & Verification

### Unit Tests

**Test Coverage Requirements**:
- **Minimum**: 85% code coverage
- **Target**: 95% code coverage
- **Critical Paths**: 100% coverage (validation logic, authorization checks)

#### Test Case 1: `createRevenue` - Valid Matched Entry

**Input**:
```typescript
{
  date: "2025-11-05",
  cash: 5000,
  network: 3000,
  budget: 3000,
  branchId: "1010",
  branchName: "الفرع الرئيسي",
  employees: [
    { name: "عبدالحي جلال", revenue: 4000 },
    { name: "محمود عمارة", revenue: 4000 }
  ]
}
```

**Expected Output**:
```typescript
{
  success: true,
  data: {
    _id: "<generated-uuid>",
    date: 1730764800000,
    cash: 5000,
    network: 3000,
    budget: 3000,
    total: 8000,
    calculatedTotal: 8000,
    isMatched: true,
    branchId: "1010",
    branchName: "الفرع الرئيسي",
    employees: [
      { name: "عبدالحي جلال", revenue: 4000 },
      { name: "محمود عمارة", revenue: 4000 }
    ],
    createdAt: "<timestamp>",
    createdBy: "<user-id>"
  }
}
```

**Verification**:
- Assert response.success === true
- Assert data.total === 8000 (5000 + 3000)
- Assert data.isMatched === true
- Assert data.employees.length === 2
- Assert sum(data.employees.revenue) === 8000

#### Test Case 2: `createRevenue` - Employee Sum Mismatch

**Input**:
```typescript
{
  date: "2025-11-05",
  cash: 5000,
  network: 3000,
  budget: 3000,
  branchId: "1010",
  branchName: "الفرع الرئيسي",
  employees: [
    { name: "عبدالحي جلال", revenue: 4000 },
    { name: "محمود عمارة", revenue: 3000 }  // Sum = 7000, expected 8000
  ]
}
```

**Expected Output**:
```typescript
{
  success: false,
  error: {
    code: "EMPLOYEES_SUM_MISMATCH",
    message: "⚠️ خطأ: مجموع إيرادات الموظفين (7000 ر.س) لا يساوي المجموع الإجمالي (8000 ر.س)",
    details: {
      expected: 8000,
      actual: 7000
    }
  }
}
```

**Verification**:
- Assert response.success === false
- Assert error.code === "EMPLOYEES_SUM_MISMATCH"
- Assert error.details.expected === 8000
- Assert error.details.actual === 7000
- Assert no database record was created

#### Test Case 3: `createRevenue` - Mismatched Without Reason

**Input**:
```typescript
{
  date: "2025-11-05",
  cash: 5000,
  network: 3000,
  budget: 2500,  // Does not match network (3000)
  branchId: "1010",
  branchName: "الفرع الرئيسي",
  // mismatchReason: missing!
}
```

**Expected Output**:
```typescript
{
  success: false,
  error: {
    code: "MISMATCH_REASON_REQUIRED",
    message: "يرجى إدخال سبب عدم المطابقة",
    details: {
      field: "mismatchReason"
    }
  }
}
```

**Verification**:
- Assert response.success === false
- Assert error.code === "MISMATCH_REASON_REQUIRED"
- Assert no database record was created

#### Test Case 4: `createRevenue` - Future Date

**Input**:
```typescript
{
  date: "2026-12-31",  // Future date
  cash: 5000,
  network: 3000,
  budget: 3000,
  branchId: "1010",
  branchName: "الفرع الرئيسي"
}
```

**Expected Output**:
```typescript
{
  success: false,
  error: {
    code: "FUTURE_DATE_NOT_ALLOWED",
    message: "التاريخ لا يمكن أن يكون في المستقبل",
    details: {
      field: "date"
    }
  }
}
```

**Verification**:
- Assert response.success === false
- Assert error.code === "FUTURE_DATE_NOT_ALLOWED"

#### Test Case 5: `deleteRevenue` - Non-Admin User

**Input**:
```typescript
{
  revenueId: "<existing-revenue-id>",
  userId: "<non-admin-user-id>",
  userRole: "accountant"
}
```

**Expected Output**:
```typescript
{
  success: false,
  error: {
    code: "AUTHORIZATION_ERROR",
    message: "⚠️ غير مصرح لك بحذف الإيرادات - صلاحيات أدمن فقط"
  }
}
```

**Verification**:
- Assert response.success === false
- Assert error.code === "AUTHORIZATION_ERROR"
- Assert revenue still exists in database

### Integration Tests

**Test Scenario 1: Complete Revenue Entry Workflow**

**Setup**:
1. Create test user with accountant role
2. Assign user to branch "1010"
3. Clear revenue records for test date

**Steps**:
1. User logs in (OAuth flow)
2. User selects branch "1010"
3. User submits valid revenue entry
4. Verify database record created
5. Verify branch statistics updated
6. Verify RevenueCreated event published
7. Verify audit log entry created
8. User views revenue list and sees new entry

**Teardown**:
1. Delete test revenue record
2. Reset branch statistics
3. Clean up test user

**Success Criteria**:
- All steps complete without errors
- Database consistency verified
- Statistics accurately reflect new entry
- Event published to message bus
- Audit log contains complete trail

**Test Scenario 2: Authorization Boundary Testing**

**Steps**:
1. Create user with branch "1010" access
2. Attempt to create revenue for branch "2020"
3. Verify request rejected with AUTHORIZATION_ERROR
4. Verify no database record created
5. Verify authorization failure logged

**Success Criteria**:
- Authorization check prevents cross-branch access
- No data leakage between branches
- Appropriate error message returned

### Performance Tests

**Load Test**:
- **Scenario**: 1000 concurrent users creating revenues
- **Duration**: 10 minutes
- **Expected**:
  - 95th percentile < 100ms
  - 99th percentile < 200ms
  - 0% error rate

**Stress Test**:
- **Scenario**: Gradually increase to 2000 concurrent users
- **Expected**:
  - Graceful degradation beyond 1500 users
  - No crashes or data corruption
  - Proper error messages when capacity exceeded

**Endurance Test**:
- **Scenario**: 100 requests/second for 24 hours
- **Expected**:
  - Stable memory usage (no leaks)
  - Consistent response times
  - No database connection exhaustion

**Acceptance Criteria**:
- All SLA commitments met under normal load
- No data loss under stress conditions
- Resource usage within defined limits
- Error rate < 0.1% under normal conditions

### Security Tests

**Penetration Testing Scenarios**:
1. **SQL Injection**: Attempt malicious input in all string fields
2. **Authorization Bypass**: Attempt to access other branches' data
3. **Employee Sum Manipulation**: Submit mismatched employee totals
4. **Date Manipulation**: Attempt extremely old/future dates
5. **Decimal Overflow**: Submit values with excessive decimal places
6. **Max Employees Bypass**: Attempt to submit >6 employees

**Vulnerability Scanning**:
- npm audit for dependency vulnerabilities
- Static code analysis with ESLint security rules
- OWASP dependency check

**Compliance**:
- OWASP Top 10 verification
- PCI DSS compliance (financial data handling)
- GDPR compliance (PII handling)

---

## 10. AI Compiler Directives

### Language & Runtime

**Primary Language**: TypeScript 5.0+
**Runtime**:
- Frontend: Browser (ES2022+)
- Backend: Node.js 18+ (Cloudflare Workers runtime)
**Package Manager**: npm 9+

**Frontend TypeScript Configuration** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
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
  "singleQuote": false,
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
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "react/react-in-jsx-scope": "off",
    "no-console": ["warn", { "allow": ["error"] }]
  }
}
```

**Naming Conventions**:
- React Components: `PascalCase` (e.g., `RevenuesContent`)
- Functions & Variables: `camelCase` (e.g., `handleSubmit`, `currentMonth`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `BRANCH_EMPLOYEES`)
- Types & Interfaces: `PascalCase` (e.g., `Employee`, `Revenue`)
- CSS Classes: `kebab-case` with Tailwind utilities

### Architecture Patterns

**Frontend Architecture**:
- **Component Structure**: Functional components with hooks
- **State Management**: React hooks (useState, useEffect) + React Query for server state
- **Form Handling**: Controlled components with manual validation
- **Routing**: React Router (implicit from page structure)

**Design Patterns**:
- **Presentational vs Container**: Separate UI (`Revenues`) from logic (`RevenuesContent`)
- **Composition**: Small reusable UI components (`Card`, `Button`, `Input`)
- **Custom Hooks**: Extract reusable logic (`useBranch`, `useAuth`)
- **Error Boundaries**: Wrap components for graceful error handling

**Project Structure**:
```
src/
├── pages/
│   └── revenues/
│       └── page.tsx            # Revenue management page
├── components/
│   ├── ui/                     # Reusable UI components
│   │   ├── card.tsx
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── navbar.tsx              # Global navigation
│   └── branch-selector.tsx     # Branch selection component
├── hooks/
│   ├── use-auth.tsx            # Authentication hook
│   └── use-branch.ts           # Branch management hook
├── lib/
│   ├── api-client.ts           # HTTP client
│   └── utils.ts                # Utility functions
└── types/
    └── revenue.ts              # Revenue type definitions
```

### Asynchronous Programming

**Promise-Based with async/await**:
```typescript
// All async operations use async/await
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    await apiClient.post('/api/revenues/create', data);
    toast.success("تم إضافة الإيراد بنجاح");
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "حدث خطأ أثناء إضافة الإيراد";
    toast.error(errorMessage);
  }
};
```

**Error Handling**:
- Use try/catch for all async operations
- Provide user-friendly error messages in Arabic
- Log errors to console for debugging
- Display toast notifications for user feedback

### Performance Optimizations

**React Optimizations**:
```typescript
// Memoize expensive calculations
const calculatedTotal = useMemo(
  () => parseFloat(cash) + parseFloat(network),
  [cash, network]
);

// Debounce validation checks
const debouncedValidate = useMemo(
  () => debounce(validateInput, 300),
  []
);

// Lazy load components
const PDFViewer = lazy(() => import('./PDFViewer'));
```

**Data Fetching**:
- Implement pagination (50 entries per page)
- Cache frequently accessed data (branch stats: 5min TTL)
- Prefetch next page on scroll
- Implement optimistic updates for better UX

**Bundle Optimization**:
- Code splitting by route
- Tree shaking unused dependencies
- Lazy load heavy components (PDF viewer, charts)
- Compress images and assets

### Deployment Specifications

**Build Command**:
```bash
npm run build
# Compiles TypeScript to JavaScript
# Bundles with Vite
# Generates optimized production build
```

**Frontend Deployment**:
- **Platform**: Cloudflare Pages
- **Build Output**: `dist/`
- **Environment**: Edge network (global CDN)

**Backend Deployment**:
- **Platform**: Cloudflare Workers
- **Runtime**: V8 isolates
- **Regions**: Global edge locations

**Health Checks**:
- **Frontend**: Check if app loads within 3s
- **Backend**: `/health` endpoint returns 200

**Monitoring**:
- **Frontend**: Web Vitals (LCP, FID, CLS)
- **Backend**: Request duration, error rate, throughput
- **Logging**: Structured JSON to Cloudflare Logs

**Environment-Specific Configuration**:
```typescript
// Development
const config = {
  apiUrl: 'http://localhost:8787',
  debug: true
};

// Production
const config = {
  apiUrl: 'https://api.lmm.com',
  debug: false
};
```

### Testing Directives

**Test Framework**: Vitest 1.0+
**Testing Library**: React Testing Library
**Coverage Tool**: c8

**Test File Naming**:
- Unit tests: `[module].test.tsx`
- Integration tests: `[feature].integration.test.tsx`

**Test Structure**:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RevenuesContent from './page';

describe('RevenuesContent', () => {
  describe('Revenue Creation', () => {
    it('should create revenue with valid matched entry', async () => {
      // Arrange
      const mockCreate = vi.fn().mockResolvedValue({ success: true });

      render(<RevenuesContent branchId="1010" branchName="Test Branch" />);

      // Act
      fireEvent.change(screen.getByLabelText('الكاش'), { target: { value: '5000' } });
      fireEvent.change(screen.getByLabelText('الشبكة'), { target: { value: '3000' } });
      fireEvent.change(screen.getByLabelText('الموازنة'), { target: { value: '3000' } });
      fireEvent.click(screen.getByText('حفظ الإيراد'));

      // Assert
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
          cash: 5000,
          network: 3000,
          budget: 3000,
          isMatched: true
        }));
      });
    });

    it('should show error when employee sum mismatches', async () => {
      // Test implementation...
    });
  });
});
```

### Documentation Generation

**Component Documentation**: JSDoc comments for all exported functions
**Type Documentation**: Inline TypeScript interface documentation
**API Documentation**: OpenAPI specification for backend endpoints

**Example Documentation**:
```typescript
/**
 * Creates a new revenue entry with validation and authorization checks.
 *
 * @param {RevenueCreateInput} input - Revenue entry data
 * @param {User} user - Authenticated user performing the operation
 * @returns {Promise<RevenueCreateResponse>} Created revenue entry
 * @throws {ValidationError} If input validation fails
 * @throws {AuthorizationError} If user lacks permissions
 * @throws {EmployeesSumMismatchError} If employee revenues don't sum to total
 *
 * @example
 * ```typescript
 * const revenue = await createRevenue({
 *   date: '2025-11-05',
 *   cash: 5000,
 *   network: 3000,
 *   budget: 3000,
 *   branchId: '1010',
 *   branchName: 'Main Branch'
 * }, currentUser);
 * ```
 */
async function createRevenue(
  input: RevenueCreateInput,
  user: User
): Promise<RevenueCreateResponse> {
  // Implementation...
}
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 3.0.0 | 2025-11-07 | Claude Code | Initial specification using NL Spec 3.0 based on existing LMM Revenue Management implementation |

---

## Notes

### RTL (Right-to-Left) Considerations
- All UI text in Arabic
- Use Tailwind RTL utilities (`ps-4`, `pe-4` instead of `pl-4`, `pr-4`)
- Ensure proper text alignment with `text-right` for Arabic content
- Icons positioned appropriately for RTL layout

### Future Enhancements
- Multi-currency support
- Automated reconciliation with banking data
- Machine learning for anomaly detection in revenue patterns
- Mobile app for on-the-go revenue entry
- Real-time collaboration (multi-user editing with conflict resolution)

### Known Limitations
- Maximum 6 employees per revenue entry (business constraint)
- 90-day limit for backdated entries (prevents historical manipulation)
- PDF generation limited to monthly reports (not date-range arbitrary)

---

*This specification follows Natural Language Programming Specification 3.0 standards for AI-compilable documentation.*
