#!/bin/bash
# End-to-End Test for Natural Language Specification 3.0 System
# Tests all components to ensure the system is working correctly

# Don't exit on error - we want to run all tests
set +e

echo "=========================================="
echo "Natural Language Specs System Test"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -n "Testing: $test_name... "

    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

# Test 1: Directory structure exists
run_test "Specs directory structure" "test -d specs && test -d specs/templates && test -d specs/examples && test -d specs/modules"

# Test 2: Template file exists and is valid
run_test "Template file exists" "test -f specs/templates/MODULE_TEMPLATE.md && test -s specs/templates/MODULE_TEMPLATE.md"

# Test 3: Example spec exists and is valid
run_test "Example spec exists" "test -f specs/examples/REVENUE_MANAGEMENT_SPEC.md && test -s specs/examples/REVENUE_MANAGEMENT_SPEC.md"

# Test 4: Guide exists
run_test "Guide document exists" "test -f specs/NATURAL_LANGUAGE_SPECS_GUIDE.md && test -s specs/NATURAL_LANGUAGE_SPECS_GUIDE.md"

# Test 5: Validation script exists and is executable
run_test "Validation script exists" "test -x scripts/validate_spec.py"

# Test 6: Python script has valid syntax
run_test "Python script syntax valid" "python3 -m py_compile scripts/validate_spec.py"

# Test 7: Template has all 10 chapters
run_test "Template has 10 chapters" "test \$(grep -c '^## [0-9]\\+\\.' specs/templates/MODULE_TEMPLATE.md) -eq 10"

# Test 8: Example spec has all 10 chapters
run_test "Example spec has 10 chapters" "test \$(grep -c '^## [0-9]\\+\\.' specs/examples/REVENUE_MANAGEMENT_SPEC.md) -eq 10"

# Test 9: Validation script can run
run_test "Validation script runs" "python3 scripts/validate_spec.py --help > /dev/null 2>&1 || python3 scripts/validate_spec.py 2>&1 | grep -q 'Usage'"

# Test 10: Example spec passes validation
echo -n "Testing: Example spec validation... "
if python3 scripts/validate_spec.py specs/examples/REVENUE_MANAGEMENT_SPEC.md 2>&1 | grep -q "VALIDATION PASSED"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

# Test 11: README.md has NL Specs section
run_test "README has NL Specs section" "grep -q 'Natural Language Specifications' README.md"

# Test 12: Key documentation files exist
run_test "Key documentation files exist" "
    test -f specs/examples/REVENUE_MANAGEMENT_SPEC.md &&
    test -f specs/NATURAL_LANGUAGE_SPECS_GUIDE.md &&
    test -f specs/templates/MODULE_TEMPLATE.md
"

# Test 13: Guide has comprehensive content (check for key sections)
run_test "Guide has key sections" "
    grep -q 'Core Concepts' specs/NATURAL_LANGUAGE_SPECS_GUIDE.md &&
    grep -q 'Getting Started' specs/NATURAL_LANGUAGE_SPECS_GUIDE.md &&
    grep -q '10-Chapter Structure' specs/NATURAL_LANGUAGE_SPECS_GUIDE.md
"

# Test 14: modules README exists
run_test "Modules README exists" "test -f specs/modules/README.md"

# Test 15: Implementation summary exists
run_test "Implementation summary exists" "test -f specs/IMPLEMENTATION_SUMMARY.md"

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED - System is working correctly!${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED - Please review the issues above${NC}"
    exit 1
fi
