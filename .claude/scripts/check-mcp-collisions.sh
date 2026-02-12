#!/bin/bash
# MCP Server Collision Detector
# Parses all MCP configs and reports server name collisions and broken paths

set -euo pipefail

COLLISIONS=0
BROKEN=0

echo "=== MCP Collision & Health Detector ==="
echo ""

# Extract server names from each config
python3 << 'PYEOF'
import json
import os
import sys

configs = {}
files = [
    os.path.expanduser("~/.claude.json"),
    os.path.expanduser("~/.claude/mcp.json"),
    # .deprecated files excluded — they are inactive
]

for f in files:
    if not os.path.exists(f):
        continue
    try:
        with open(f) as fh:
            data = json.load(fh)
        servers = data.get("mcpServers", {})
        if not servers and "mcpServers" not in data:
            # Might be the top-level mcpServers structure
            continue
        for name in servers:
            if name not in configs:
                configs[name] = []
            configs[name].append(f)
    except (json.JSONDecodeError, KeyError):
        print(f"  WARN: Could not parse {f}")

collisions = 0
for name, sources in sorted(configs.items()):
    if len(sources) > 1:
        print(f"  COLLISION: '{name}' defined in:")
        for s in sources:
            print(f"    - {s}")
        collisions += 1

# Check for broken paths in active config
active_file = os.path.expanduser("~/.claude.json")
if os.path.exists(active_file):
    with open(active_file) as fh:
        data = json.load(fh)
    servers = data.get("mcpServers", {})
    broken = 0
    print()
    print("Checking server paths in ~/.claude.json...")
    for name, config in sorted(servers.items()):
        args = config.get("args", [])
        for arg in args:
            if arg.startswith("/") and not arg.startswith("/-"):
                if not os.path.exists(arg):
                    print(f"  BROKEN: {name} references non-existent path: {arg}")
                    broken += 1

print()
print(f"=== Results ===")
print(f"  Collisions: {collisions}")
print(f"  Broken paths: {broken}")
if collisions > 0 or broken > 0:
    print(f"  STATUS: FAIL")
    sys.exit(1)
else:
    print(f"  STATUS: PASS")
PYEOF
