#!/usr/bin/env python
# This wrapper script helps find the right Python interpreter
import os
import sys
import subprocess
import platform

def main():
    # Get the directory of this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Script directory: {script_dir}")
    
    # Path to the main.py script
    main_script = os.path.join(script_dir, 'main.py')
    print(f"Main script path: {main_script}")
    
    # Check if the file exists
    if not os.path.exists(main_script):
        print(f"ERROR: Main script not found at {main_script}")
        sys.exit(1)
    # Print environment info for debugging
    print(f"Python version: {sys.version}")
    print(f"Platform: {platform.platform()}")
    print(f"Current working directory: {os.getcwd()}")
    
    # Environment variables from .env should be loaded by main.py
    
    try:
        # Execute the main script with the current Python interpreter
        print(f"Starting backend with: {sys.executable} {main_script}")
        result = subprocess.run([sys.executable, main_script], check=True)
        sys.exit(result.returncode)
    except Exception as e:
        print(f"Error running backend: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()