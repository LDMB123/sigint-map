#!/bin/bash
# Settings Validator — checks for unsafe Claude Code settings
# Run periodically or before commits to prevent regression

set -euo pipefail

FAIL=0
WARN=0

check_file() {
    local file="$1"
    local label="$2"

    if [ ! -f "$file" ]; then
        echo "  SKIP: $label — file not found"
        return
    fi

    echo "  Checking $label..."

    # Check for bypass flags set to true
    for flag in "dangerously-skip-permissions" "skipAllPermissionChecks" "neverAskPermissions" \
                "autoApproveTools" "disablePermissionPrompts" "alwaysAllow"; do
        if python3 -c "
import json, sys
d = json.load(open('$file'))
# Check if flag exists with truthy value (not just present)
val = d.get('$flag')
if val is True:
    sys.exit(0)
# Check nested in permissions
p = d.get('permissions', {})
val = p.get('$flag')
if val is True:
    sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
            echo "    FAIL: Contains bypass flag: $flag = true"
            FAIL=$((FAIL + 1))
        fi
    done

    # Check default is "ask"
    if python3 -c "
import json, sys
d = json.load(open('$file'))
p = d.get('permissions', {})
if p.get('default') == 'allow':
    sys.exit(1)
" 2>/dev/null; then
        :
    else
        if python3 -c "import json; d=json.load(open('$file')); exit(0 if 'permissions' in d else 1)" 2>/dev/null; then
            echo "    FAIL: permissions.default is 'allow' (should be 'ask')"
            FAIL=$((FAIL + 1))
        fi
    fi

    # Check deny list is not empty
    if python3 -c "
import json, sys
d = json.load(open('$file'))
p = d.get('permissions', {})
deny = p.get('deny', [])
if len(deny) == 0 and 'permissions' in d:
    sys.exit(1)
" 2>/dev/null; then
        :
    else
        if python3 -c "import json; d=json.load(open('$file')); exit(0 if 'permissions' in d else 1)" 2>/dev/null; then
            echo "    WARN: Empty deny list"
            WARN=$((WARN + 1))
        fi
    fi

    # Check respectGitignore
    if python3 -c "
import json, sys
d = json.load(open('$file'))
if d.get('respectGitignore') == False:
    sys.exit(1)
" 2>/dev/null; then
        :
    else
        echo "    FAIL: respectGitignore is false"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== Settings Validator ==="
echo ""

# Check for suspicious files
echo "Checking for bypass files..."
for f in "$HOME/.claude/autoexec.json" "$HOME/.claude/cli-flags.json"; do
    if [ -f "$f" ]; then
        echo "  FAIL: Suspicious file exists: $f"
        FAIL=$((FAIL + 1))
    fi
done

if [ -f "$HOME/.claude/init.sh" ]; then
    echo "  FAIL: init.sh exists (should be init.sh.disabled)"
    FAIL=$((FAIL + 1))
fi

# Check disableAllHooks
if python3 -c "
import json, sys
d = json.load(open('$HOME/.claude/settings.json'))
if d.get('disableAllHooks') == True:
    sys.exit(1)
" 2>/dev/null; then
    :
else
    echo "  FAIL: disableAllHooks is true"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "Checking settings files..."
check_file "$HOME/.claude/settings.json" "User settings"

# Check workspace settings if we're in a project
if [ -f ".claude/settings.local.json" ]; then
    check_file ".claude/settings.local.json" "Workspace settings"
fi

echo ""
echo "=== Results ==="
echo "  Failures: $FAIL"
echo "  Warnings: $WARN"

if [ $FAIL -gt 0 ]; then
    echo "  STATUS: FAIL"
    exit 1
else
    echo "  STATUS: PASS"
    exit 0
fi
