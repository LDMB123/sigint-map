#!/bin/bash
# Command/Skill Collision Detector
# Finds name collisions across skills, commands, agents, and plugins
# Uses Python for macOS compatibility (bash 3.2 lacks associative arrays)

set -euo pipefail

echo "=== Command/Skill Collision Detector ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

python3 - "$WORKSPACE_ROOT" << 'PYEOF'
import os
import sys

names = {}  # name -> source description
collisions = 0

def add_dirs(directory, source):
    global collisions
    if not os.path.isdir(directory):
        return
    for entry in sorted(os.listdir(directory)):
        path = os.path.join(directory, entry)
        if not os.path.isdir(path) or entry == "_archived":
            continue
        if entry in names:
            print(f"  COLLISION: '{entry}' found in:")
            print(f"    - {names[entry]}")
            print(f"    - {source} ({directory})")
            collisions += 1
        else:
            names[entry] = f"{source} ({directory})"

def add_md_files(directory, source):
    if not os.path.isdir(directory):
        return
    for f in sorted(os.listdir(directory)):
        if f.endswith(".md") and os.path.isfile(os.path.join(directory, f)):
            name = f[:-3]  # strip .md
            names[name] = f"{source} ({directory})"

home = os.path.expanduser("~")
workspace = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/ClaudeCodeProjects")

print("Scanning user commands...")
add_md_files(os.path.join(home, ".claude/commands"), "user-command")

print("Scanning user skills...")
add_dirs(os.path.join(home, ".claude/skills"), "user-skill")

print("Scanning workspace skills...")
add_dirs(os.path.join(workspace, ".claude/skills"), "workspace-skill")

print("Scanning user agents...")
add_dirs(os.path.join(home, ".claude/agents"), "user-agent")

print("Scanning workspace agents...")
add_dirs(os.path.join(workspace, ".claude/agents"), "workspace-agent")

print()
print("=== Results ===")
print(f"  Collisions found: {collisions}")

if collisions > 0:
    print("  STATUS: FAIL")
    sys.exit(1)
else:
    print("  STATUS: PASS")
PYEOF
