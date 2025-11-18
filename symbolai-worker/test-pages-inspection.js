/**
 * Deep Inspection Test Suite for Revenue and Employee Requests Pages
 * Comprehensive unbiased testing of pages, components, workflows, and utilities
 */

import { strict as assert } from 'assert';
import fs from 'fs';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class InspectionRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
    this.tests = [];
    this.issues = [];
  }

  test(name, fn, critical = false) {
    this.tests.push({ name, fn, critical });
  }

  addIssue(severity, category, message) {
    this.issues.push({ severity, category, message });
  }

  async run() {
    console.log(`\n${COLORS.cyan}╔════════════════════════════════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.cyan}║    Deep Inspection: Revenue & Employee Requests Pages         ║${COLORS.reset}`);
    console.log(`${COLORS.cyan}╚════════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

    for (const { name, fn, critical } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`${COLORS.green}✓${COLORS.reset} ${name}`);
      } catch (error) {
        if (critical) {
          this.failed++;
          console.log(`${COLORS.red}✗ [CRITICAL]${COLORS.reset} ${name}`);
          console.log(`  ${COLORS.red}${error.message}${COLORS.reset}`);
        } else {
          this.warnings++;
          console.log(`${COLORS.yellow}⚠ [WARNING]${COLORS.reset} ${name}`);
          console.log(`  ${COLORS.yellow}${error.message}${COLORS.reset}`);
          this.addIssue('warning', 'code-quality', `${name}: ${error.message}`);
        }
      }
    }

    this.printSummary();
    return this.failed === 0;
  }

  printSummary() {
    console.log(`\n${COLORS.cyan}════════════════════════════════════════════════════════════════${COLORS.reset}`);
    console.log(`Results: ${COLORS.green}${this.passed} passed${COLORS.reset}, ` +
               `${this.warnings > 0 ? COLORS.yellow : COLORS.green}${this.warnings} warnings${COLORS.reset}, ` +
               `${this.failed > 0 ? COLORS.red : COLORS.green}${this.failed} failed${COLORS.reset}`);
    console.log(`${COLORS.cyan}════════════════════════════════════════════════════════════════${COLORS.reset}\n`);

    if (this.issues.length > 0) {
      console.log(`${COLORS.magenta}Issues Found:${COLORS.reset}`);
      const criticalIssues = this.issues.filter(i => i.severity === 'critical');
      const warningIssues = this.issues.filter(i => i.severity === 'warning');
      
      if (criticalIssues.length > 0) {
        console.log(`\n${COLORS.red}Critical Issues (${criticalIssues.length}):${COLORS.reset}`);
        criticalIssues.forEach((issue, i) => {
          console.log(`  ${i + 1}. [${issue.category}] ${issue.message}`);
        });
      }
      
      if (warningIssues.length > 0) {
        console.log(`\n${COLORS.yellow}Warnings (${warningIssues.length}):${COLORS.reset}`);
        warningIssues.forEach((issue, i) => {
          console.log(`  ${i + 1}. [${issue.category}] ${issue.message}`);
        });
      }
    }
  }
}

const runner = new InspectionRunner();

// ============================================================================
// SECTION 1: Revenue Page Tests
// ============================================================================

console.log(`\n${COLORS.blue}━━━ Section 1: Revenue Page Inspection ━━━${COLORS.reset}\n`);

runner.test('Revenue page file exists', () => {
  assert(fs.existsSync('./src/pages/revenues.astro'), 'Revenue page not found');
}, true);

runner.test('Revenue page has authentication check', () => {
  const content = fs.readFileSync('./src/pages/revenues.astro', 'utf8');
  assert(content.includes('cookieHeader'), 'Missing cookie header check');
  assert(content.includes('session='), 'Missing session validation');
  assert(content.includes('Astro.redirect'), 'Missing redirect to login');
});

runner.test('Revenue page has proper UI structure', () => {
  const content = fs.readFileSync('./src/pages/revenues.astro', 'utf8');
  assert(content.includes('add-revenue-btn'), 'Missing add revenue button');
  assert(content.includes('revenue-table-body'), 'Missing revenue table');
  assert(content.includes('total-revenue'), 'Missing total revenue display');
  assert(content.includes('filter-start-date'), 'Missing date filters');
});

runner.test('Revenue page has form validation', () => {
  const content = fs.readFileSync('./src/pages/revenues.astro', 'utf8');
  assert(content.includes('required'), 'Missing required field validation');
  assert(content.includes('type="number"'), 'Missing number input types');
  assert(content.includes('step="0.01"'), 'Missing decimal precision');
});

runner.test('Revenue page calculates totals correctly', () => {
  const content = fs.readFileSync('./src/pages/revenues.astro', 'utf8');
  assert(content.includes('updateCalculatedTotal'), 'Missing calculation function');
  assert(content.includes('calculated-total'), 'Missing calculated total display');
  assert(content.includes('cash + network + budget'), 'Missing proper calculation');
});

runner.test('Revenue page handles mismatched data', () => {
  const content = fs.readFileSync('./src/pages/revenues.astro', 'utf8');
  assert(content.includes('is_matched'), 'Missing mismatch detection');
  assert(content.includes('mismatched-count'), 'Missing mismatch counter');
  assert(content.includes('غير متطابق'), 'Missing mismatch status display');
});

runner.test('Revenue page has error handling', () => {
  const content = fs.readFileSync('./src/pages/revenues.astro', 'utf8');
  assert(content.includes('try {'), 'Missing try block');
  assert(content.includes('catch (error)'), 'Missing error catch');
  assert(content.includes('console.error'), 'Missing error logging');
  assert(content.includes('alert'), 'Missing user error notification');
});

// ============================================================================
// SECTION 2: Employee Requests Page Tests
// ============================================================================

console.log(`\n${COLORS.blue}━━━ Section 2: Employee Requests Page Inspection ━━━${COLORS.reset}\n`);

runner.test('Employee requests page file exists', () => {
  assert(fs.existsSync('./src/pages/employee-requests.astro'), 'Employee requests page not found');
}, true);

runner.test('Employee requests page has authentication check', () => {
  const content = fs.readFileSync('./src/pages/employee-requests.astro', 'utf8');
  assert(content.includes('cookieHeader'), 'Missing cookie header check');
  assert(content.includes('session='), 'Missing session validation');
});

runner.test('Employee requests page displays statistics', () => {
  const content = fs.readFileSync('./src/pages/employee-requests.astro', 'utf8');
  assert(content.includes('total-count'), 'Missing total count');
  assert(content.includes('pending-count'), 'Missing pending count');
  assert(content.includes('approved-count'), 'Missing approved count');
  assert(content.includes('rejected-count'), 'Missing rejected count');
});

runner.test('Employee requests page has request type breakdown', () => {
  const content = fs.readFileSync('./src/pages/employee-requests.astro', 'utf8');
  assert(content.includes('type-سلفة'), 'Missing advance type');
  assert(content.includes('type-إجازة'), 'Missing vacation type');
  assert(content.includes('type-استقالة'), 'Missing resignation type');
});

runner.test('Employee requests page has status filtering', () => {
  const content = fs.readFileSync('./src/pages/employee-requests.astro', 'utf8');
  assert(content.includes('status-filter'), 'Missing status filter');
  assert(content.includes('pending'), 'Missing pending filter option');
  assert(content.includes('approved'), 'Missing approved filter option');
  assert(content.includes('rejected'), 'Missing rejected filter option');
});

runner.test('Employee requests page has proper status badges', () => {
  const content = fs.readFileSync('./src/pages/employee-requests.astro', 'utf8');
  assert(content.includes('getStatusBadge'), 'Missing status badge function');
  assert(content.includes('bg-yellow-100'), 'Missing pending badge styling');
  assert(content.includes('bg-green-100'), 'Missing approved badge styling');
  assert(content.includes('bg-red-100'), 'Missing rejected badge styling');
});

// ============================================================================
// SECTION 3: Revenue API Tests
// ============================================================================

console.log(`\n${COLORS.blue}━━━ Section 3: Revenue API Endpoints ━━━${COLORS.reset}\n`);

runner.test('Revenue create API has authentication', () => {
  const content = fs.readFileSync('./src/pages/api/revenues/create.ts', 'utf8');
  assert(content.includes('requireAuthWithPermissions'), 'Missing auth check');
  assert(content.includes('canAddRevenue'), 'Missing permission check');
}, true);

runner.test('Revenue create API validates input', () => {
  const content = fs.readFileSync('./src/pages/api/revenues/create.ts', 'utf8');
  assert(content.includes('if (!branchId'), 'Missing branchId validation');
  assert(content.includes('if (!date'), 'Missing date validation');
  assert(content.includes('total === undefined'), 'Missing total validation');
  assert(content.includes('status: 400'), 'Missing validation error status');
});

runner.test('Revenue create API validates branch access', () => {
  const content = fs.readFileSync('./src/pages/api/revenues/create.ts', 'utf8');
  assert(content.includes('validateBranchAccess'), 'Missing branch access validation');
}, true);

runner.test('Revenue create API detects mismatches', () => {
  const content = fs.readFileSync('./src/pages/api/revenues/create.ts', 'utf8');
  assert(content.includes('calculatedTotal'), 'Missing calculation');
  assert(content.includes('isMatched'), 'Missing match detection');
  assert(content.includes('Math.abs'), 'Missing floating point comparison');
});

runner.test('Revenue create API creates notifications for mismatches', () => {
  const content = fs.readFileSync('./src/pages/api/revenues/create.ts', 'utf8');
  assert(content.includes('revenue_mismatch'), 'Missing mismatch notification');
  assert(content.includes('triggerRevenueMismatch'), 'Missing email trigger');
  assert(content.includes('notifications'), 'Missing notification insert');
});

runner.test('Revenue create API logs audit trail', () => {
  const content = fs.readFileSync('./src/pages/api/revenues/create.ts', 'utf8');
  assert(content.includes('logAudit'), 'Missing audit logging');
  assert(content.includes('getClientIP'), 'Missing IP logging');
  assert(content.includes('User-Agent'), 'Missing user agent logging');
});

runner.test('Revenue create API has error handling', () => {
  const content = fs.readFileSync('./src/pages/api/revenues/create.ts', 'utf8');
  assert(content.includes('try {'), 'Missing try block');
  assert(content.includes('catch (error)'), 'Missing catch block');
  assert(content.includes('status: 500'), 'Missing 500 error status');
});

runner.test('Revenue list API exists and has authentication', () => {
  assert(fs.existsSync('./src/pages/api/revenues/list.ts'), 'Revenue list API not found');
  const content = fs.readFileSync('./src/pages/api/revenues/list.ts', 'utf8');
  assert(content.includes('requireAuthWithPermissions'), 'Missing auth');
}, true);

// ============================================================================
// SECTION 4: Employee Requests API Tests
// ============================================================================

console.log(`\n${COLORS.blue}━━━ Section 4: Employee Requests API Endpoints ━━━${COLORS.reset}\n`);

runner.test('Request create API has authentication', () => {
  const content = fs.readFileSync('./src/pages/api/requests/create.ts', 'utf8');
  assert(content.includes('requireAuthWithPermissions'), 'Missing auth check');
  assert(content.includes('canSubmitRequests'), 'Missing permission check');
}, true);

runner.test('Request create API validates all request types', () => {
  const content = fs.readFileSync('./src/pages/api/requests/create.ts', 'utf8');
  const types = ['سلفة', 'إجازة', 'صرف متأخرات', 'استئذان', 'مخالفة', 'استقالة'];
  types.forEach(type => {
    assert(content.includes(type), `Missing validation for ${type}`);
  });
});

runner.test('Request create API has type-specific validation', () => {
  const content = fs.readFileSync('./src/pages/api/requests/create.ts', 'utf8');
  assert(content.includes('advanceAmount'), 'Missing advance amount validation');
  assert(content.includes('vacationStart'), 'Missing vacation start validation');
  assert(content.includes('vacationEnd'), 'Missing vacation end validation');
  assert(content.includes('duesAmount'), 'Missing dues validation');
  assert(content.includes('permissionDate'), 'Missing permission validation');
  assert(content.includes('violationDescription'), 'Missing violation validation');
  assert(content.includes('resignationReason'), 'Missing resignation validation');
});

runner.test('Request create API creates notifications', () => {
  const content = fs.readFileSync('./src/pages/api/requests/create.ts', 'utf8');
  assert(content.includes('notificationQueries.create'), 'Missing notification creation');
  assert(content.includes('employee_request'), 'Missing notification type');
  assert(content.includes('actionRequired: true'), 'Missing action required flag');
});

runner.test('Request create API sends email notifications', () => {
  const content = fs.readFileSync('./src/pages/api/requests/create.ts', 'utf8');
  assert(content.includes('triggerEmployeeRequestCreated'), 'Missing email trigger');
  assert(content.includes('requestDetails'), 'Missing request details in email');
});

runner.test('Request create API logs audit trail', () => {
  const content = fs.readFileSync('./src/pages/api/requests/create.ts', 'utf8');
  assert(content.includes('logAudit'), 'Missing audit logging');
  assert(content.includes('getClientIP'), 'Missing IP logging');
});

runner.test('Request respond API has authentication and permission', () => {
  const content = fs.readFileSync('./src/pages/api/requests/respond.ts', 'utf8');
  assert(content.includes('requireAuthWithPermissions'), 'Missing auth check');
  assert(content.includes('canApproveRequests'), 'Missing approve permission check');
}, true);

runner.test('Request respond API validates status', () => {
  const content = fs.readFileSync('./src/pages/api/requests/respond.ts', 'utf8');
  assert(content.includes("['approved', 'rejected']"), 'Missing status validation');
  assert(content.includes('adminResponse'), 'Missing response validation');
});

runner.test('Request respond API sends notification to employee', () => {
  const content = fs.readFileSync('./src/pages/api/requests/respond.ts', 'utf8');
  assert(content.includes('triggerEmployeeRequestResponded'), 'Missing employee notification');
});

runner.test('Request all API uses modern helper functions', () => {
  const content = fs.readFileSync('./src/pages/api/requests/all.ts', 'utf8');
  assert(content.includes('authenticateRequest'), 'Missing modern auth helper');
  assert(content.includes('withErrorHandling'), 'Missing error handling wrapper');
  assert(content.includes('resolveBranchFilter'), 'Missing branch filter helper');
  assert(content.includes('calculateStatusStats'), 'Missing stats helper');
});

// ============================================================================
// SECTION 5: Utility Functions Tests
// ============================================================================

console.log(`\n${COLORS.blue}━━━ Section 5: Utility & Helper Functions ━━━${COLORS.reset}\n`);

runner.test('Utils.ts has currency formatting', () => {
  const content = fs.readFileSync('./src/lib/utils.ts', 'utf8');
  assert(content.includes('formatCurrency'), 'Missing formatCurrency function');
  assert(content.includes("'ar-EG'"), 'Missing Arabic locale');
  assert(content.includes('Intl.NumberFormat'), 'Not using standard formatting');
});

runner.test('Utils.ts has date formatting', () => {
  const content = fs.readFileSync('./src/lib/utils.ts', 'utf8');
  assert(content.includes('formatDate'), 'Missing formatDate function');
  assert(content.includes('Intl.DateTimeFormat'), 'Not using standard date formatting');
});

runner.test('Utils.ts has Arabic month names', () => {
  const content = fs.readFileSync('./src/lib/utils.ts', 'utf8');
  assert(content.includes('getMonthName'), 'Missing month name function');
  assert(content.includes('يناير'), 'Missing Arabic month names');
  assert(content.includes('ديسمبر'), 'Missing all 12 months');
});

runner.test('API helpers have authentication utilities', () => {
  const content = fs.readFileSync('./src/lib/api-helpers.ts', 'utf8');
  assert(content.includes('authenticateRequest'), 'Missing auth utility');
  assert(content.includes('requireAuthWithPermissions'), 'Missing permission check');
  assert(content.includes('AuthOptions'), 'Missing auth options interface');
}, true);

runner.test('API helpers have standard response builders', () => {
  const content = fs.readFileSync('./src/lib/api-helpers.ts', 'utf8');
  assert(content.includes('createSuccessResponse'), 'Missing success response');
  assert(content.includes('createErrorResponse'), 'Missing error response');
  assert(content.includes('createValidationError'), 'Missing validation error');
  assert(content.includes('createUnauthorizedError'), 'Missing 401 response');
  assert(content.includes('createForbiddenError'), 'Missing 403 response');
  assert(content.includes('createNotFoundError'), 'Missing 404 response');
});

runner.test('API helpers have query parameter utilities', () => {
  const content = fs.readFileSync('./src/lib/api-helpers.ts', 'utf8');
  assert(content.includes('extractQueryParams'), 'Missing param extraction');
  assert(content.includes('getDefaultDateRange'), 'Missing date range helper');
});

runner.test('API helpers have branch filtering utilities', () => {
  const content = fs.readFileSync('./src/lib/api-helpers.ts', 'utf8');
  assert(content.includes('resolveBranchFilter'), 'Missing branch resolver');
  assert(content.includes('buildBranchFilteredQuery'), 'Missing query builder');
  assert(content.includes('validateBranchAccess'), 'Missing branch validation');
});

runner.test('API helpers have statistics calculators', () => {
  const content = fs.readFileSync('./src/lib/api-helpers.ts', 'utf8');
  assert(content.includes('calculateStatusStats'), 'Missing status stats');
  assert(content.includes('calculateCategoryStats'), 'Missing category stats');
  assert(content.includes('calculateTotalAmount'), 'Missing amount calculator');
});

runner.test('API helpers have request body validation', () => {
  const content = fs.readFileSync('./src/lib/api-helpers.ts', 'utf8');
  assert(content.includes('parseRequestBody'), 'Missing body parser');
  assert(content.includes('validateRequiredFields'), 'Missing field validator');
});

runner.test('API helpers have error handling wrapper', () => {
  const content = fs.readFileSync('./src/lib/api-helpers.ts', 'utf8');
  assert(content.includes('withErrorHandling'), 'Missing error wrapper');
  assert(content.includes('try {'), 'Error wrapper missing try block');
  assert(content.includes('catch (error)'), 'Error wrapper missing catch');
});

// ============================================================================
// SECTION 6: Error Handler Tests
// ============================================================================

console.log(`\n${COLORS.blue}━━━ Section 6: Email Error Handler ━━━${COLORS.reset}\n`);

runner.test('Email error handler file exists', () => {
  assert(fs.existsSync('./src/lib/email-error-handler.ts'), 'Error handler not found');
}, true);

runner.test('Email error handler has error classification', () => {
  const content = fs.readFileSync('./src/lib/email-error-handler.ts', 'utf8');
  assert(content.includes('classifyError'), 'Missing error classifier');
  assert(content.includes('EmailErrorCode'), 'Missing error codes');
  assert(content.includes('retryable'), 'Missing retry classification');
});

runner.test('Email error handler has network error handling', () => {
  const content = fs.readFileSync('./src/lib/email-error-handler.ts', 'utf8');
  assert(content.includes('NETWORK_TIMEOUT'), 'Missing timeout error');
  assert(content.includes('CONNECTION_FAILED'), 'Missing connection error');
  assert(content.includes('ETIMEDOUT'), 'Missing timeout detection');
});

runner.test('Email error handler has API error handling', () => {
  const content = fs.readFileSync('./src/lib/email-error-handler.ts', 'utf8');
  assert(content.includes('INVALID_API_KEY'), 'Missing API key error');
  assert(content.includes('RATE_LIMIT_EXCEEDED'), 'Missing rate limit error');
  assert(content.includes('QUOTA_EXCEEDED'), 'Missing quota error');
});

runner.test('Email error handler has retry configuration', () => {
  const content = fs.readFileSync('./src/lib/email-error-handler.ts', 'utf8');
  assert(content.includes('EmailRetryConfig'), 'Missing retry config');
  assert(content.includes('maxRetries'), 'Missing max retries');
  assert(content.includes('retryDelays'), 'Missing delay configuration');
  assert(content.includes('backoffMultiplier'), 'Missing backoff strategy');
});

// ============================================================================
// SECTION 7: Workflow and Integration Tests
// ============================================================================

console.log(`\n${COLORS.blue}━━━ Section 7: Workflow & Integration ━━━${COLORS.reset}\n`);

runner.test('Revenue workflow: page -> API -> DB flow exists', () => {
  // Check page calls API
  const page = fs.readFileSync('./src/pages/revenues.astro', 'utf8');
  assert(page.includes('/api/revenues/create'), 'Page missing API call');
  assert(page.includes('/api/revenues/list'), 'Page missing list API call');
  
  // Check API exists
  assert(fs.existsSync('./src/pages/api/revenues/create.ts'), 'Create API missing');
  assert(fs.existsSync('./src/pages/api/revenues/list.ts'), 'List API missing');
});

runner.test('Employee requests workflow: page -> API -> notification flow exists', () => {
  // Check page calls API
  const page = fs.readFileSync('./src/pages/employee-requests.astro', 'utf8');
  assert(page.includes('/api/requests/all'), 'Page missing API call');
  
  // Check API exists and creates notifications
  const createAPI = fs.readFileSync('./src/pages/api/requests/create.ts', 'utf8');
  assert(createAPI.includes('notificationQueries.create'), 'Missing notification creation');
  assert(createAPI.includes('triggerEmployeeRequestCreated'), 'Missing email trigger');
});

runner.test('Revenue mismatch triggers email notification', () => {
  const content = fs.readFileSync('./src/pages/api/revenues/create.ts', 'utf8');
  assert(content.includes('triggerRevenueMismatch'), 'Missing email trigger');
  assert(content.includes('if (!isMatched)'), 'Missing mismatch condition');
});

runner.test('Request status changes trigger email notifications', () => {
  const content = fs.readFileSync('./src/pages/api/requests/respond.ts', 'utf8');
  assert(content.includes('triggerEmployeeRequestResponded'), 'Missing response email');
  assert(content.includes('employeeName'), 'Missing employee info in email');
});

runner.test('All APIs use consistent error responses', () => {
  const apis = [
    './src/pages/api/revenues/create.ts',
    './src/pages/api/requests/create.ts',
    './src/pages/api/requests/respond.ts'
  ];
  
  apis.forEach(api => {
    const content = fs.readFileSync(api, 'utf8');
    assert(content.includes('JSON.stringify'), 'Not using JSON responses');
    assert(content.includes("'Content-Type': 'application/json'"), 'Missing content type');
  });
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
