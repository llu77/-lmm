#!/usr/bin/env python3
"""
Natural Language Specification 3.0 Validator

This script validates that specification documents conform to the
Natural Language Programming Specification 3.0 standard.

Usage:
    python scripts/validate_spec.py <spec_file_path>
    python scripts/validate_spec.py specs/modules/*.md
    python scripts/validate_spec.py --all  # Validate all specs
"""

import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple
from dataclasses import dataclass
from enum import Enum


class ValidationLevel(Enum):
    """Validation severity levels"""
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


@dataclass
class ValidationResult:
    """Result of a validation check"""
    level: ValidationLevel
    message: str
    line_number: int = 0
    chapter: str = ""


class SpecValidator:
    """Validator for Natural Language Specification 3.0"""

    # Required chapters in order
    REQUIRED_CHAPTERS = [
        "1. Module Overview",
        "2. Interface Definition",
        "3. Core Logic",
        "4. State Management",
        "5. Exception Handling",
        "6. Performance Requirements",
        "7. Security Considerations",
        "8. Dependencies",
        "9. Testing & Verification",
        "10. AI Compiler Directives",
    ]

    # Required sections within chapters
    REQUIRED_SECTIONS = {
        "1. Module Overview": [
            "Functional Positioning",
            "Core Responsibilities",
            "Design Goals",
            "Dependencies",
        ],
        "2. Interface Definition": [
            "Input Specifications",
            "Output Specifications",
            "Data Type Definitions",
        ],
        "3. Core Logic": [
            "Processing Flow",
            "Detailed Step Descriptions",
            "Data Structures",
        ],
        "4. State Management": [
            "Internal State Model",
            "State Transitions",
            "Persistence Strategy",
            "Concurrency Handling",
        ],
        "5. Exception Handling": [
            "Error Classification",
            "Error Handling Strategy",
            "Monitoring & Logging",
        ],
        "6. Performance Requirements": [
            "Response Time Requirements",
            "Throughput Capacity",
            "Resource Constraints",
            "Optimization Strategies",
        ],
        "7. Security Considerations": [
            "Authentication & Authorization",
            "Data Protection",
            "Attack Prevention",
            "Audit Logging",
        ],
        "8. Dependencies": [
            "Upstream Dependencies",
            "External Libraries",
            "Configuration Requirements",
            "Downstream Interfaces",
        ],
        "9. Testing & Verification": [
            "Unit Tests",
            "Integration Tests",
            "Performance Tests",
        ],
        "10. AI Compiler Directives": [
            "Language & Runtime",
            "Code Style Standards",
            "Architecture Patterns",
            "Asynchronous Programming",
        ],
    }

    def __init__(self, spec_path: Path):
        self.spec_path = spec_path
        self.content = ""
        self.lines: List[str] = []
        self.results: List[ValidationResult] = []

    def validate(self) -> Tuple[bool, List[ValidationResult]]:
        """
        Validate the specification file.

        Returns:
            Tuple of (is_valid, validation_results)
        """
        try:
            self.content = self.spec_path.read_text(encoding="utf-8")
            self.lines = self.content.split("\n")
        except Exception as e:
            self.results.append(
                ValidationResult(
                    level=ValidationLevel.ERROR,
                    message=f"Failed to read file: {str(e)}",
                )
            )
            return False, self.results

        # Run validation checks
        self._check_file_header()
        self._check_required_chapters()
        self._check_chapter_sections()
        self._check_chapter_order()
        self._check_code_blocks()
        self._check_data_type_specificity()
        self._check_revision_history()

        # Determine if validation passed
        has_errors = any(r.level == ValidationLevel.ERROR for r in self.results)
        return not has_errors, self.results

    def _check_file_header(self):
        """Check that file has proper header"""
        if not self.content.startswith("#"):
            self.results.append(
                ValidationResult(
                    level=ValidationLevel.ERROR,
                    message="File must start with a markdown header (# Title)",
                    line_number=1,
                )
            )

        # Check for Natural Language Specification 3.0 reference
        if "Natural Language Specification 3.0" not in self.content[:500]:
            self.results.append(
                ValidationResult(
                    level=ValidationLevel.WARNING,
                    message="File should reference 'Natural Language Specification 3.0' in header",
                    line_number=1,
                )
            )

        # Check for AI-Compilable Documentation tag
        if "AI-Compilable" not in self.content[:1000]:
            self.results.append(
                ValidationResult(
                    level=ValidationLevel.INFO,
                    message="Consider adding 'AI-Compilable Documentation' tag in header",
                    line_number=1,
                )
            )

    def _check_required_chapters(self):
        """Check that all 10 required chapters are present"""
        for chapter in self.REQUIRED_CHAPTERS:
            # Match both "## 1. Module Overview" and "## 1. Module Overview" formats
            pattern = re.escape(chapter)
            if not re.search(rf"^##\s+{pattern}", self.content, re.MULTILINE):
                self.results.append(
                    ValidationResult(
                        level=ValidationLevel.ERROR,
                        message=f"Missing required chapter: {chapter}",
                        chapter=chapter,
                    )
                )

    def _check_chapter_sections(self):
        """Check that required sections exist within chapters"""
        for chapter, sections in self.REQUIRED_SECTIONS.items():
            chapter_content = self._extract_chapter_content(chapter)
            if not chapter_content:
                continue  # Already reported as missing in _check_required_chapters

            for section in sections:
                # Match ### Section Name
                pattern = re.escape(section)
                if not re.search(rf"^###\s+{pattern}", chapter_content, re.MULTILINE):
                    self.results.append(
                        ValidationResult(
                            level=ValidationLevel.ERROR,
                            message=f"Missing required section '{section}' in chapter '{chapter}'",
                            chapter=chapter,
                        )
                    )

    def _check_chapter_order(self):
        """Check that chapters appear in correct order"""
        chapter_positions = []
        for chapter in self.REQUIRED_CHAPTERS:
            pattern = re.escape(chapter)
            match = re.search(rf"^##\s+{pattern}", self.content, re.MULTILINE)
            if match:
                chapter_positions.append((chapter, match.start()))

        # Check if positions are in ascending order
        for i in range(len(chapter_positions) - 1):
            if chapter_positions[i][1] > chapter_positions[i + 1][1]:
                self.results.append(
                    ValidationResult(
                        level=ValidationLevel.WARNING,
                        message=f"Chapter '{chapter_positions[i + 1][0]}' appears before '{chapter_positions[i][0]}'",
                    )
                )

    def _check_code_blocks(self):
        """Check for proper code block formatting"""
        # Find all code blocks
        code_blocks = re.findall(r"```(\w*)\n(.*?)```", self.content, re.DOTALL)

        if not code_blocks:
            self.results.append(
                ValidationResult(
                    level=ValidationLevel.WARNING,
                    message="No code blocks found. Consider adding examples for clarity.",
                )
            )

        # Check that code blocks have language specified
        for lang, code in code_blocks:
            if not lang:
                self.results.append(
                    ValidationResult(
                        level=ValidationLevel.INFO,
                        message="Code block without language specification found. Specify language for better syntax highlighting.",
                    )
                )

    def _check_data_type_specificity(self):
        """Check for vague data type descriptions"""
        chapter_2 = self._extract_chapter_content("2. Interface Definition")
        if not chapter_2:
            return

        # Check for vague terms that violate NL Spec 3.0 principles
        vague_terms = [
            (r"\bstring\b(?!\s*-)", "Define string constraints (e.g., 'non-empty string, 1-50 characters')"),
            (r"\bnumber\b(?!\s*-)", "Define number constraints (e.g., 'positive integer', 'max 2 decimal places')"),
            (r"\barray\b(?!\s*<)", "Define array item type and constraints (e.g., 'Array<string>, max 10 items')"),
        ]

        for pattern, suggestion in vague_terms:
            matches = re.finditer(pattern, chapter_2)
            count = sum(1 for _ in matches)
            if count > 3:  # Allow a few, but flag excessive vagueness
                self.results.append(
                    ValidationResult(
                        level=ValidationLevel.WARNING,
                        message=f"Multiple vague type definitions found. {suggestion}",
                        chapter="2. Interface Definition",
                    )
                )

    def _check_revision_history(self):
        """Check for revision history section"""
        if "Revision History" not in self.content:
            self.results.append(
                ValidationResult(
                    level=ValidationLevel.WARNING,
                    message="No 'Revision History' section found. Consider adding version tracking.",
                )
            )

    def _extract_chapter_content(self, chapter_title: str) -> str:
        """Extract content of a specific chapter"""
        # Find chapter start
        pattern = re.escape(chapter_title)
        match = re.search(rf"^##\s+{pattern}\s*$", self.content, re.MULTILINE)
        if not match:
            return ""

        start = match.end()

        # Find next chapter (## heading)
        next_chapter = re.search(r"^##\s+\d+\.", self.content[start:], re.MULTILINE)
        end = next_chapter.start() + start if next_chapter else len(self.content)

        return self.content[start:end]


def print_results(spec_path: Path, is_valid: bool, results: List[ValidationResult]):
    """Pretty print validation results"""
    print(f"\n{'=' * 80}")
    print(f"Validating: {spec_path}")
    print(f"{'=' * 80}\n")

    if not results:
        print("✅ No validation issues found!")
        return

    # Group by level
    errors = [r for r in results if r.level == ValidationLevel.ERROR]
    warnings = [r for r in results if r.level == ValidationLevel.WARNING]
    infos = [r for r in results if r.level == ValidationLevel.INFO]

    if errors:
        print(f"❌ ERRORS ({len(errors)}):")
        for result in errors:
            location = f" (Chapter: {result.chapter})" if result.chapter else ""
            print(f"  - {result.message}{location}")
        print()

    if warnings:
        print(f"⚠️  WARNINGS ({len(warnings)}):")
        for result in warnings:
            location = f" (Chapter: {result.chapter})" if result.chapter else ""
            print(f"  - {result.message}{location}")
        print()

    if infos:
        print(f"ℹ️  INFO ({len(infos)}):")
        for result in infos:
            print(f"  - {result.message}")
        print()

    # Summary
    print(f"{'=' * 80}")
    if is_valid:
        print("✅ VALIDATION PASSED (with warnings/info)")
    else:
        print("❌ VALIDATION FAILED")
    print(f"{'=' * 80}\n")


def validate_file(spec_path: Path) -> bool:
    """Validate a single specification file"""
    if not spec_path.exists():
        print(f"❌ Error: File not found: {spec_path}")
        return False

    if not spec_path.suffix == ".md":
        print(f"⚠️  Warning: File is not a markdown file: {spec_path}")
        return False

    validator = SpecValidator(spec_path)
    is_valid, results = validator.validate()
    print_results(spec_path, is_valid, results)

    return is_valid


def validate_directory(directory: Path) -> Tuple[int, int]:
    """
    Validate all specification files in a directory.

    Returns:
        Tuple of (passed_count, failed_count)
    """
    all_files = list(directory.glob("**/*.md"))

    # Filter out documentation files (guides, READMEs, templates)
    # Only validate actual specifications (in modules/ and examples/)
    spec_files = [
        f for f in all_files
        if not any([
            "GUIDE" in f.name.upper(),
            "README" in f.name.upper(),
            "TEMPLATE" in f.name.upper(),
            "/templates/" in str(f),
        ])
    ]

    if not spec_files:
        print(f"No specification files found in {directory}")
        print(f"(Skipped {len(all_files)} documentation/template files)")
        return 0, 0

    # Show which files are being skipped
    skipped = len(all_files) - len(spec_files)
    if skipped > 0:
        print(f"ℹ️  Skipping {skipped} documentation/template files\n")

    passed = 0
    failed = 0

    for spec_file in spec_files:
        if validate_file(spec_file):
            passed += 1
        else:
            failed += 1

    print(f"\n{'=' * 80}")
    print(f"SUMMARY: {passed} passed, {failed} failed out of {len(spec_files)} files")
    if skipped > 0:
        print(f"         ({skipped} documentation/template files skipped)")
    print(f"{'=' * 80}\n")

    return passed, failed


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python scripts/validate_spec.py <spec_file_path>")
        print("       python scripts/validate_spec.py --all")
        sys.exit(1)

    arg = sys.argv[1]

    if arg == "--all":
        # Validate all specs
        specs_dir = Path("specs")
        if not specs_dir.exists():
            print(f"❌ Error: specs directory not found: {specs_dir}")
            sys.exit(1)

        passed, failed = validate_directory(specs_dir)
        sys.exit(0 if failed == 0 else 1)

    elif arg.startswith("--"):
        print(f"❌ Unknown option: {arg}")
        sys.exit(1)

    else:
        # Validate single file
        spec_path = Path(arg)
        success = validate_file(spec_path)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
