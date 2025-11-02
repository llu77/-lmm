#!/usr/bin/env python
"""
Development setup script using uv for fast dependency management
"""
import subprocess
import sys

def run_uv_command(cmd):
    """Run uv command with error handling"""
    try:
        result = subprocess.run(
            ["uv"] + cmd.split(),
            check=True,
            capture_output=True,
            text=True
        )
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.stderr}", file=sys.stderr)
        return False

def main():
    print("🚀 Setting up development environment with uv...")
    
    # Install Python dependencies (if any)
    if run_uv_command("pip install pytest black ruff"):
        print("✅ Python tools installed")
    
    # Install Node dependencies
    print("\n📦 Installing Node.js dependencies...")
    subprocess.run(["npm", "install"], check=True)
    
    print("\n✅ Development environment ready!")
    print("\nNext steps:")
    print("  - Run: npm run dev")
    print("  - Or: wrangler dev")

if __name__ == "__main__":
    main()
