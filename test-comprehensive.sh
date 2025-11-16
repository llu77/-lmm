#!/bin/bash

# ================================================
# Comprehensive Login and Pages Test Script
# Tests login functionality and key page APIs
# ================================================

echo "╔════════════════════════════════════════════════════╗"
echo "║   LMM System - Comprehensive Test Script          ║"
echo "║   اختبار شامل لنظام LMM                           ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:4321}"
TEST_DIR="/tmp/lmm-tests"
mkdir -p "$TEST_DIR"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
function test_start() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📝 Test: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

function test_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo ""
}

function test_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    if [ -n "$2" ]; then
        echo -e "${RED}   Error: $2${NC}"
    fi
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo ""
}

function test_info() {
    echo -e "${YELLOW}ℹ️  Info: $1${NC}"
}

# Check if server is running
function check_server() {
    test_start "Server Availability Check"
    
    if curl -s "$BASE_URL/" > /dev/null 2>&1; then
        test_pass "Server is running at $BASE_URL"
        return 0
    else
        test_fail "Server is not running at $BASE_URL" "Please start the development server first"
        return 1
    fi
}

# Test 1: Admin Login
function test_admin_login() {
    test_start "Admin Login Test (admin / Omar101010)"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"Omar101010"}' \
        -c "$TEST_DIR/admin_cookies.txt")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        test_pass "Admin login successful"
        
        # Extract and display user info
        FULLNAME=$(echo "$RESPONSE" | jq -r '.user.fullName')
        ROLE=$(echo "$RESPONSE" | jq -r '.user.role')
        test_info "User: $FULLNAME"
        test_info "Role: $ROLE"
        
        # Save session for later tests
        echo "$RESPONSE" > "$TEST_DIR/admin_session.json"
        return 0
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
        test_fail "Admin login failed" "$ERROR"
        return 1
    fi
}

# Test 2: Supervisor Login (Laban)
function test_supervisor_laban_login() {
    test_start "Supervisor Laban Login (supervisor_laban / laban1010)"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"supervisor_laban","password":"laban1010"}' \
        -c "$TEST_DIR/supervisor_laban_cookies.txt")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        test_pass "Supervisor Laban login successful"
        
        FULLNAME=$(echo "$RESPONSE" | jq -r '.user.fullName')
        BRANCH=$(echo "$RESPONSE" | jq -r '.user.branchName')
        test_info "User: $FULLNAME"
        test_info "Branch: $BRANCH"
        
        echo "$RESPONSE" > "$TEST_DIR/supervisor_laban_session.json"
        return 0
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
        test_fail "Supervisor Laban login failed" "$ERROR"
        return 1
    fi
}

# Test 3: Supervisor Login (Tuwaiq)
function test_supervisor_tuwaiq_login() {
    test_start "Supervisor Tuwaiq Login (supervisor_tuwaiq / tuwaiq2020)"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"supervisor_tuwaiq","password":"tuwaiq2020"}' \
        -c "$TEST_DIR/supervisor_tuwaiq_cookies.txt")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        test_pass "Supervisor Tuwaiq login successful"
        
        FULLNAME=$(echo "$RESPONSE" | jq -r '.user.fullName')
        BRANCH=$(echo "$RESPONSE" | jq -r '.user.branchName')
        test_info "User: $FULLNAME"
        test_info "Branch: $BRANCH"
        
        return 0
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
        test_fail "Supervisor Tuwaiq login failed" "$ERROR"
        return 1
    fi
}

# Test 4: Invalid Login
function test_invalid_login() {
    test_start "Invalid Login Test (wrong password)"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"wrongpassword"}')
    
    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        test_pass "Invalid login correctly rejected"
        ERROR=$(echo "$RESPONSE" | jq -r '.error')
        test_info "Error message: $ERROR"
        return 0
    else
        test_fail "Invalid login was not rejected properly"
        return 1
    fi
}

# Test 5: Session Check
function test_session_check() {
    test_start "Session Check Test"
    
    if [ ! -f "$TEST_DIR/admin_cookies.txt" ]; then
        test_fail "No admin session found" "Please run login tests first"
        return 1
    fi
    
    RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/session" \
        -b "$TEST_DIR/admin_cookies.txt")
    
    if echo "$RESPONSE" | jq -e '.authenticated == true' > /dev/null 2>&1; then
        test_pass "Session is valid"
        return 0
    else
        test_fail "Session is not valid"
        return 1
    fi
}

# Test 6: Revenues List API
function test_revenues_list() {
    test_start "Revenues List API Test"
    
    if [ ! -f "$TEST_DIR/admin_cookies.txt" ]; then
        test_fail "No admin session found" "Please run login tests first"
        return 1
    fi
    
    # Get current month dates
    START_DATE=$(date +%Y-%m-01)
    END_DATE=$(date +%Y-%m-%d)
    
    RESPONSE=$(curl -s -X GET "$BASE_URL/api/revenues/list?startDate=$START_DATE&endDate=$END_DATE" \
        -b "$TEST_DIR/admin_cookies.txt")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        test_pass "Revenues list retrieved successfully"
        
        COUNT=$(echo "$RESPONSE" | jq -r '.count // 0')
        test_info "Revenue records found: $COUNT"
        return 0
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
        test_fail "Failed to retrieve revenues" "$ERROR"
        return 1
    fi
}

# Test 7: Create Revenue (if we have permissions)
function test_create_revenue() {
    test_start "Create Revenue API Test"
    
    if [ ! -f "$TEST_DIR/admin_cookies.txt" ]; then
        test_fail "No admin session found" "Please run login tests first"
        return 1
    fi
    
    # Get branch ID from session
    BRANCH_ID=$(jq -r '.user.branchId // "branch_1010"' "$TEST_DIR/admin_session.json")
    TODAY=$(date +%Y-%m-%d)
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/revenues/create" \
        -H "Content-Type: application/json" \
        -b "$TEST_DIR/admin_cookies.txt" \
        -d "{
            \"branchId\": \"$BRANCH_ID\",
            \"date\": \"$TODAY\",
            \"cash\": 1000,
            \"network\": 500,
            \"budget\": 300,
            \"total\": 1800
        }")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        test_pass "Revenue created successfully"
        
        IS_MATCHED=$(echo "$RESPONSE" | jq -r '.revenue.isMatched')
        test_info "Is matched: $IS_MATCHED"
        return 0
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
        test_fail "Failed to create revenue" "$ERROR"
        return 1
    fi
}

# Test 8: Payroll Calculate
function test_payroll_calculate() {
    test_start "Payroll Calculate API Test"
    
    if [ ! -f "$TEST_DIR/admin_cookies.txt" ]; then
        test_fail "No admin session found" "Please run login tests first"
        return 1
    fi
    
    BRANCH_ID=$(jq -r '.user.branchId // "branch_1010"' "$TEST_DIR/admin_session.json")
    MONTH=$(date +%B | tr '[:upper:]' '[:lower:]')
    YEAR=$(date +%Y)
    
    # Map English month to Arabic
    case $MONTH in
        january) MONTH_AR="يناير" ;;
        february) MONTH_AR="فبراير" ;;
        march) MONTH_AR="مارس" ;;
        april) MONTH_AR="أبريل" ;;
        may) MONTH_AR="مايو" ;;
        june) MONTH_AR="يونيو" ;;
        july) MONTH_AR="يوليو" ;;
        august) MONTH_AR="أغسطس" ;;
        september) MONTH_AR="سبتمبر" ;;
        october) MONTH_AR="أكتوبر" ;;
        november) MONTH_AR="نوفمبر" ;;
        december) MONTH_AR="ديسمبر" ;;
        *) MONTH_AR="نوفمبر" ;;
    esac
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/payroll/calculate" \
        -H "Content-Type: application/json" \
        -b "$TEST_DIR/admin_cookies.txt" \
        -d "{
            \"branchId\": \"$BRANCH_ID\",
            \"month\": \"$MONTH_AR\",
            \"year\": $YEAR
        }")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        test_pass "Payroll calculated successfully"
        
        EMPLOYEE_COUNT=$(echo "$RESPONSE" | jq -r '.employeeCount // 0')
        TOTAL_NET=$(echo "$RESPONSE" | jq -r '.totals.totalNetSalary // 0')
        test_info "Employees: $EMPLOYEE_COUNT"
        test_info "Total Net Salary: $TOTAL_NET"
        return 0
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
        test_fail "Failed to calculate payroll" "$ERROR"
        return 1
    fi
}

# Test 9: Employee Requests List
function test_requests_list() {
    test_start "Employee Requests List API Test"
    
    if [ ! -f "$TEST_DIR/admin_cookies.txt" ]; then
        test_fail "No admin session found" "Please run login tests first"
        return 1
    fi
    
    RESPONSE=$(curl -s -X GET "$BASE_URL/api/requests/all" \
        -b "$TEST_DIR/admin_cookies.txt")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        test_pass "Employee requests list retrieved successfully"
        
        COUNT=$(echo "$RESPONSE" | jq -r '.requests | length')
        test_info "Requests found: $COUNT"
        return 0
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
        test_fail "Failed to retrieve requests" "$ERROR"
        return 1
    fi
}

# Test 10: Logout
function test_logout() {
    test_start "Logout Test"
    
    if [ ! -f "$TEST_DIR/admin_cookies.txt" ]; then
        test_fail "No admin session found" "Please run login tests first"
        return 1
    fi
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/logout" \
        -b "$TEST_DIR/admin_cookies.txt")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        test_pass "Logout successful"
        return 0
    else
        test_fail "Logout failed"
        return 1
    fi
}

# Main test execution
function run_all_tests() {
    echo ""
    echo -e "${BLUE}Starting comprehensive system tests...${NC}"
    echo ""
    
    # Server check
    check_server || exit 1
    
    # Authentication tests
    test_admin_login
    test_supervisor_laban_login
    test_supervisor_tuwaiq_login
    test_invalid_login
    test_session_check
    
    # API tests
    test_revenues_list
    test_create_revenue
    test_payroll_calculate
    test_requests_list
    
    # Cleanup
    test_logout
    
    # Print summary
    echo ""
    echo "╔════════════════════════════════════════════════════╗"
    echo "║              Test Summary / ملخص الاختبارات        ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo ""
    echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! / جميع الاختبارات نجحت!${NC}"
        echo ""
        exit 0
    else
        echo -e "${RED}⚠️  Some tests failed! / بعض الاختبارات فشلت!${NC}"
        echo ""
        exit 1
    fi
}

# Run tests
run_all_tests
