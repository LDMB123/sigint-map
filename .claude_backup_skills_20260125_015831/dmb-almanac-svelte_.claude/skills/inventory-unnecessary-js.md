---
name: inventory-unnecessary-js
description: Create inventory of JS patterns that can be replaced with HTML/CSS
trigger: /inventory-js
used_by: [ui-js-audit-specialist, lead-orchestrator]
---

# Inventory Unnecessary JavaScript

Analyze source files to identify JavaScript that exists only to replicate browser-native behavior.

## When to Use
- Phase 1 audit of new components
- Reviewing existing UI components for modernization
- After adding new third-party UI libraries

## Required Inputs
- Directory or file paths to analyze
- Target runtime capabilities (Chromium 143)

## Step-by-Step Procedure

### 1. Scan for State Management Patterns
```bash
# Find useState for open/close state
grep -rn "useState.*false\|useState.*true" src/components/ui/ --include="*.tsx"

# Find show/hide patterns
grep -rn "isOpen\|setOpen\|visible\|setVisible" src/components/ --include="*.tsx"

# Find controlled component patterns
grep -rn "controlledOpen\|uncontrolledOpen" src/components/ --include="*.tsx"
```

### 2. Scan for Click-Outside Handlers
```bash
# Find click outside patterns
grep -rn "clickOutside\|ClickOutside\|mousedown\|pointerdown" src/ --include="*.tsx"

# Find document event listeners
grep -rn "document.addEventListener" src/components/ --include="*.tsx"
```

### 3. Scan for Focus Management
```bash
# Find focus-related code
grep -rn "\.focus()\|querySelectorAll.*focusable\|tabIndex" src/components/ --include="*.tsx"

# Find focus trap implementations
grep -rn "focusTrap\|FocusTrap\|Tab.*key" src/components/ --include="*.tsx"
```

### 4. Scan for Manual Keyboard Handlers
```bash
# Find keyboard event handlers
grep -rn "onKeyDown\|event.key\|keyCode" src/components/ --include="*.tsx"

# Find escape key handlers
grep -rn "Escape\|Esc" src/components/ --include="*.tsx"
```

### 5. Categorize Each Finding

For each pattern found, document:

| Field | Description |
|-------|-------------|
| File | Path and line numbers |
| Pattern | What the JS does |
| Why JS | Why it was originally implemented in JS |
| Replacement | Native HTML/CSS that can replace it |
| A11y Impact | How replacement affects accessibility |
| Risk | LOW/MEDIUM/HIGH |
| Rollback | Steps to revert if needed |

### 6. Prioritize Findings

Classify into:
- **Quick Wins**: Low risk, clear native replacement
- **Medium Wins**: Moderate complexity, good payoff
- **Defer**: High risk or complex migration

## Expected Artifacts

| Artifact | Location |
|----------|----------|
| Full Inventory | `.migration/reports/ui-js-elimination-audit.md` |
| Quick Wins List | Section in audit report |
| Risk Assessment | Section in audit report |

## Output Template

```markdown
## Unnecessary JS Inventory

### Category: [Show/Hide State | Click-Outside | Focus | Keyboard | Animation]

#### Pattern: [Name]
**Location**: `src/components/ui/[file].tsx:XX-YY`
**Current Code**:
```typescript
// snippet
```
**Why JS**: [explanation]
**Replacement**: [native pattern]
**A11y Impact**: [assessment]
**Risk**: LOW/MEDIUM/HIGH
**Rollback**: [steps]
```

## Success Criteria
- All UI components in scope analyzed
- Each JS pattern categorized
- Replacement patterns identified
- Risk ratings assigned
- Rollback plans documented
