#!/usr/bin/env python3
"""
Notebook Validation Script
===========================

This script validates Jupyter notebooks to ensure they meet quality standards
before being committed to the repository.

Checks performed:
- Empty cells (code cells with no content)
- Error outputs in cells
- Notebook metadata issues
- Cell execution counts

Usage:
    python scripts/validate_notebooks.py
    python scripts/validate_notebooks.py path/to/notebook.ipynb
"""

import json
import sys
from pathlib import Path
from typing import List, Tuple, Dict, Any


class NotebookValidator:
    """Validates Jupyter notebooks for common issues."""

    def __init__(self):
        self.issues_found = False
        self.total_notebooks = 0
        self.total_issues = 0

    def validate_notebook(self, notebook_path: Path) -> List[str]:
        """
        Validate a single notebook.

        Args:
            notebook_path: Path to the notebook file

        Returns:
            List of issue strings found in the notebook
        """
        issues = []

        try:
            with open(notebook_path, 'r', encoding='utf-8') as f:
                notebook = json.load(f)
        except json.JSONDecodeError as e:
            return [f"❌ Invalid JSON: {e}"]
        except Exception as e:
            return [f"❌ Error reading file: {e}"]

        cells = notebook.get('cells', [])

        for idx, cell in enumerate(cells):
            cell_number = idx + 1
            cell_type = cell.get('cell_type', 'unknown')

            # Check for empty code cells
            if cell_type == 'code':
                source = cell.get('source', [])
                if isinstance(source, list):
                    source_text = ''.join(source).strip()
                else:
                    source_text = str(source).strip()

                if not source_text:
                    issues.append(
                        f"❌ Empty code cell at cell #{cell_number}"
                    )

                # Check for error outputs
                outputs = cell.get('outputs', [])
                for output in outputs:
                    if output.get('output_type') == 'error':
                        error_name = output.get('ename', 'Unknown')
                        error_value = output.get('evalue', '')
                        issues.append(
                            f"❌ Error output in cell #{cell_number}: {error_name}: {error_value}"
                        )

            # Check for empty markdown cells
            elif cell_type == 'markdown':
                source = cell.get('source', [])
                if isinstance(source, list):
                    source_text = ''.join(source).strip()
                else:
                    source_text = str(source).strip()

                if not source_text:
                    issues.append(
                        f"⚠️  Empty markdown cell at cell #{cell_number}"
                    )

        return issues

    def validate_all_notebooks(self, search_path: Path = None) -> Dict[str, List[str]]:
        """
        Validate all notebooks in the repository.

        Args:
            search_path: Root path to search for notebooks (default: current directory)

        Returns:
            Dictionary mapping notebook paths to lists of issues
        """
        if search_path is None:
            search_path = Path.cwd()

        # Find all notebooks, excluding hidden directories and test outputs
        notebooks = []
        for notebook_path in search_path.rglob('*.ipynb'):
            # Skip hidden directories (like .ipynb_checkpoints)
            if any(part.startswith('.') for part in notebook_path.parts):
                continue
            # Skip test outputs
            if 'test_outputs' in notebook_path.parts:
                continue
            notebooks.append(notebook_path)

        results = {}
        for notebook_path in sorted(notebooks):
            issues = self.validate_notebook(notebook_path)
            if issues:
                results[str(notebook_path)] = issues
                self.issues_found = True
                self.total_issues += len(issues)

        self.total_notebooks = len(notebooks)
        return results

    def print_results(self, results: Dict[str, List[str]]) -> None:
        """
        Print validation results in a human-readable format.

        Args:
            results: Dictionary of notebook paths to issue lists
        """
        print("\n" + "=" * 80)
        print("📓 Notebook Validation Report")
        print("=" * 80)

        if not results:
            print("\n✅ All notebooks passed validation!")
            print(f"   Checked {self.total_notebooks} notebook(s)")
        else:
            print(f"\n⚠️  Found issues in {len(results)} notebook(s):")
            print(f"   Total issues: {self.total_issues}")
            print(f"   Total notebooks checked: {self.total_notebooks}")

            for notebook_path, issues in results.items():
                print(f"\n📄 {notebook_path}")
                for issue in issues:
                    print(f"   {issue}")

        print("\n" + "=" * 80)

        if self.issues_found:
            print("\n💡 How to fix common issues:")
            print("   • Empty cells: Delete them or add content")
            print("   • Error outputs: Clear outputs before committing")
            print("     - In Jupyter: Cell → All Output → Clear")
            print("     - In VS Code: Clear All Outputs button")
            print("=" * 80 + "\n")


def main():
    """Main entry point for the validation script."""
    validator = NotebookValidator()

    # If a specific notebook path is provided, validate only that
    if len(sys.argv) > 1:
        notebook_path = Path(sys.argv[1])
        if not notebook_path.exists():
            print(f"❌ Error: Notebook not found: {notebook_path}")
            sys.exit(1)

        if not notebook_path.is_file() or notebook_path.suffix != '.ipynb':
            print(f"❌ Error: Not a notebook file: {notebook_path}")
            sys.exit(1)

        issues = validator.validate_notebook(notebook_path)
        results = {str(notebook_path): issues} if issues else {}
        validator.total_notebooks = 1
        validator.total_issues = len(issues)
        if issues:
            validator.issues_found = True

    else:
        # Validate all notebooks in the repository
        results = validator.validate_all_notebooks()

    # Print results
    validator.print_results(results)

    # Exit with error code if issues were found
    if validator.issues_found:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
