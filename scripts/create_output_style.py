#!/usr/bin/env python3
"""
Output Style Creator Utility

This script provides functions to programmatically create Claude Code output styles.
Output styles are reusable system prompt configurations that modify Claude's behavior
for specific tasks.

Usage:
    # As a library
    from scripts.create_output_style import create_output_style

    create_output_style(
        'Code Reviewer',
        'Thorough code review assistant',
        'You are an expert code reviewer...'
    )

    # As a CLI
    python scripts/create_output_style.py --name "My Style" --description "..." --prompt "..."
"""

import argparse
import sys
from pathlib import Path
from typing import Optional


def create_output_style(
    name: str,
    description: str,
    prompt: str,
    location: str = "project"
) -> Path:
    """
    Create a new output style file.

    Args:
        name: The name of the output style (e.g., "Code Reviewer")
        description: Brief description of what this style does
        prompt: The system prompt content for this style
        location: Where to save the style - "project" (.claude/output-styles)
                  or "user" (~/.claude/output-styles)

    Returns:
        Path to the created file

    Raises:
        ValueError: If name or description is empty
        FileExistsError: If a style with this name already exists

    Examples:
        >>> create_output_style(
        ...     'Code Reviewer',
        ...     'Thorough code review assistant',
        ...     'You are an expert code reviewer...'
        ... )
        PosixPath('.claude/output-styles/code-reviewer.md')
    """
    # Validate inputs
    if not name or not name.strip():
        raise ValueError("Style name cannot be empty")

    if not description or not description.strip():
        raise ValueError("Style description cannot be empty")

    if not prompt or not prompt.strip():
        raise ValueError("Style prompt cannot be empty")

    # Determine output directory based on location
    if location == "user":
        output_styles_dir = Path.home() / '.claude' / 'output-styles'
    elif location == "project":
        output_styles_dir = Path('.claude') / 'output-styles'
    else:
        raise ValueError(f"Invalid location: {location}. Must be 'project' or 'user'")

    # Create directory if it doesn't exist
    output_styles_dir.mkdir(parents=True, exist_ok=True)

    # Create frontmatter content
    content = f"""---
name: {name.strip()}
description: {description.strip()}
---

{prompt.strip()}
"""

    # Generate filename from name (lowercase with hyphens)
    file_name = name.lower().strip().replace(' ', '-')
    # Remove any characters that aren't alphanumeric or hyphens
    file_name = ''.join(c for c in file_name if c.isalnum() or c == '-')
    file_name = f"{file_name}.md"

    file_path = output_styles_dir / file_name

    # Check if file already exists
    if file_path.exists():
        raise FileExistsError(
            f"Output style already exists at {file_path}. "
            f"Delete it first or choose a different name."
        )

    # Write the file
    file_path.write_text(content, encoding='utf-8')

    print(f"✅ Created output style: {file_path}")
    return file_path


def list_output_styles(location: Optional[str] = None) -> dict:
    """
    List all available output styles.

    Args:
        location: Filter by location - "project", "user", or None for both

    Returns:
        Dictionary mapping style names to file paths

    Examples:
        >>> styles = list_output_styles()
        >>> print(styles.keys())
        dict_keys(['code-reviewer', 'documentation-writer', ...])
    """
    styles = {}

    locations = []
    if location is None or location == "project":
        locations.append(Path('.claude') / 'output-styles')
    if location is None or location == "user":
        locations.append(Path.home() / '.claude' / 'output-styles')

    for output_dir in locations:
        if not output_dir.exists():
            continue

        for file_path in output_dir.glob('*.md'):
            # Read the file to get the name from frontmatter
            content = file_path.read_text(encoding='utf-8')

            # Parse frontmatter to get the name
            if content.startswith('---'):
                parts = content.split('---', 2)
                if len(parts) >= 3:
                    frontmatter = parts[1]
                    for line in frontmatter.split('\n'):
                        if line.strip().startswith('name:'):
                            name = line.split(':', 1)[1].strip()
                            styles[file_path.stem] = {
                                'name': name,
                                'path': file_path,
                                'location': 'user' if '.claude' in str(file_path.parent.parent) and 'home' in str(file_path) else 'project'
                            }
                            break

    return styles


def delete_output_style(name: str, location: str = "project") -> bool:
    """
    Delete an output style.

    Args:
        name: The name or filename (without .md) of the style to delete
        location: Where to look for the style - "project" or "user"

    Returns:
        True if deleted successfully, False if not found

    Examples:
        >>> delete_output_style('code-reviewer')
        True
    """
    if location == "user":
        output_styles_dir = Path.home() / '.claude' / 'output-styles'
    else:
        output_styles_dir = Path('.claude') / 'output-styles'

    # Generate filename from name
    file_name = name.lower().strip().replace(' ', '-')
    file_name = ''.join(c for c in file_name if c.isalnum() or c == '-')
    if not file_name.endswith('.md'):
        file_name = f"{file_name}.md"

    file_path = output_styles_dir / file_name

    if not file_path.exists():
        print(f"❌ Output style not found: {file_path}")
        return False

    file_path.unlink()
    print(f"🗑️  Deleted output style: {file_path}")
    return True


def main():
    """CLI interface for output style management."""
    parser = argparse.ArgumentParser(
        description='Create and manage Claude Code output styles',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create a new output style
  python scripts/create_output_style.py create \\
    --name "Code Reviewer" \\
    --description "Thorough code review assistant" \\
    --prompt "You are an expert code reviewer..."

  # Create a user-level style
  python scripts/create_output_style.py create \\
    --name "My Style" \\
    --description "Personal coding style" \\
    --prompt "..." \\
    --location user

  # List all styles
  python scripts/create_output_style.py list

  # Delete a style
  python scripts/create_output_style.py delete --name "code-reviewer"
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # Create command
    create_parser = subparsers.add_parser('create', help='Create a new output style')
    create_parser.add_argument('--name', required=True, help='Name of the output style')
    create_parser.add_argument('--description', required=True, help='Brief description')
    create_parser.add_argument('--prompt', required=True, help='System prompt content')
    create_parser.add_argument(
        '--location',
        choices=['project', 'user'],
        default='project',
        help='Where to save the style (default: project)'
    )

    # List command
    list_parser = subparsers.add_parser('list', help='List all output styles')
    list_parser.add_argument(
        '--location',
        choices=['project', 'user'],
        help='Filter by location'
    )

    # Delete command
    delete_parser = subparsers.add_parser('delete', help='Delete an output style')
    delete_parser.add_argument('--name', required=True, help='Name of the style to delete')
    delete_parser.add_argument(
        '--location',
        choices=['project', 'user'],
        default='project',
        help='Where to look for the style (default: project)'
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    try:
        if args.command == 'create':
            create_output_style(
                args.name,
                args.description,
                args.prompt,
                args.location
            )

        elif args.command == 'list':
            styles = list_output_styles(args.location)
            if not styles:
                print("No output styles found.")
                return

            print(f"\n📚 Available Output Styles ({len(styles)}):\n")
            for key, info in styles.items():
                location_badge = "👤 User" if info['location'] == 'user' else "📁 Project"
                print(f"  {location_badge} {info['name']}")
                print(f"    File: {info['path']}")
                print()

        elif args.command == 'delete':
            delete_output_style(args.name, args.location)

    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
