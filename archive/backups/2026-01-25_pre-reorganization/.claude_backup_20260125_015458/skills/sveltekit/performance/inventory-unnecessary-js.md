# Skill: Inventory Unnecessary JavaScript

**ID**: `inventory-unnecessary-js`
**Category**: Performance / Code Quality
**Agent**: Performance Optimizer / Code Reviewer

---

## When to Use

- Auditing new components before production
- Reviewing existing codebase for modernization opportunities
- After adding new third-party UI libraries
- Optimizing bundle size and runtime performance
- Identifying native web platform alternatives
- Technical debt reduction planning

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| paths | string[] | Yes | Directory or file paths to analyze |
| target_runtime | string | No | Target browser/runtime (default: modern evergreen) |

---

## When JavaScript Can Be Replaced

Modern browsers provide native alternatives for many common JavaScript patterns:

- **State management**: `<details>`, `<dialog>`, popover API
- **Click-outside detection**: Native dialog/popover light dismiss
- **Focus management**: `inert`, `autofocus`, native focus delegation
- **Keyboard handlers**: Native interactive elements handle this
- **Animations**: CSS animations/transitions over JavaScript
- **Form validation**: HTML5 validation attributes
- **Tooltips**: CSS `:hover` with `::before`/`::after`

---

## Steps

### Step 1: Scan for State Management Patterns

```bash
# Find useState/state for open/close patterns
grep -rn "let.*=.*\$state(false)\|let.*=.*\$state(true)" src/lib/components/ --include="*.svelte"

# Find show/hide state variables
grep -rn "isOpen\|setOpen\|visible\|show\|hide" src/lib/components/ --include="*.svelte"

# Find toggle functions
grep -rn "toggle\|Toggle" src/lib/components/ --include="*.svelte" | grep -v "ToggleButton"
```

**What to look for:**
- Boolean state for visibility (can use `<details>` or `popover`)
- Toggle functions (native elements toggle automatically)
- Controlled open/close state (native dialogs handle this)

### Step 2: Scan for Click-Outside Handlers

```bash
# Find click-outside patterns
grep -rn "clickOutside\|click.*outside\|handleClickOutside" src/ --include="*.svelte" --include="*.ts"

# Find document event listeners
grep -rn "document.addEventListener.*click\|document.addEventListener.*mousedown" src/lib/components/ --include="*.svelte"

# Find event listener cleanup
grep -rn "removeEventListener\|cleanup.*listener" src/lib/components/ --include="*.svelte"
```

**What to look for:**
- Manual click-outside detection (use `<dialog>` or `popover` with light dismiss)
- Document-level event listeners (potential memory leaks)
- Complex event handler cleanup logic

### Step 3: Scan for Focus Management

```bash
# Find manual focus calls
grep -rn "\.focus()\|focus\(\)" src/lib/components/ --include="*.svelte" --include="*.ts"

# Find focus trap implementations
grep -rn "focusTrap\|FocusTrap\|trap.*focus" src/lib/components/ --include="*.svelte"

# Find tab key handlers
grep -rn "event.key.*Tab\|Tab.*key" src/lib/components/ --include="*.svelte"

# Find focusable element queries
grep -rn "querySelectorAll.*focusable\|getFocusable" src/lib/components/ --include="*.svelte"
```

**What to look for:**
- Manual focus management (use `autofocus`, `inert`)
- Focus trap implementations (native `<dialog>` handles this)
- Complex tab order management

### Step 4: Scan for Manual Keyboard Handlers

```bash
# Find keyboard event handlers
grep -rn "onkeydown\|onkeyup\|onkeypress" src/lib/components/ --include="*.svelte"

# Find escape key handlers
grep -rn "Escape\|event.key.*Esc" src/lib/components/ --include="*.svelte"

# Find enter/space handlers
grep -rn "Enter.*Space\|event.key.*Enter" src/lib/components/ --include="*.svelte"

# Find arrow key handlers (navigation)
grep -rn "ArrowUp\|ArrowDown\|Arrow.*key" src/lib/components/ --include="*.svelte"
```

**What to look for:**
- Escape to close (native dialogs/popovers handle this)
- Enter/Space for activation (use `<button>`)
- Arrow key navigation (use native `<select>`, radio groups)

### Step 5: Scan for Animation/Transition Logic

```bash
# Find animation state
grep -rn "animate\|animation\|isAnimating" src/lib/components/ --include="*.svelte"

# Find requestAnimationFrame
grep -rn "requestAnimationFrame\|cancelAnimationFrame" src/lib/components/ --include="*.svelte"

# Find transition callbacks
grep -rn "onTransitionEnd\|transitionend" src/lib/components/ --include="*.svelte"
```

**What to look for:**
- JavaScript animations that could be CSS
- Complex transition orchestration
- Frame-based animations for simple effects

### Step 6: Categorize Each Finding

For each pattern found, create an entry:

| Field | Description | Example |
|-------|-------------|---------|
| File | Path and line numbers | `src/lib/components/Modal.svelte:45-67` |
| Pattern | What the JavaScript does | "useState for open/close, click-outside handler" |
| Why JS | Original reason for JS implementation | "Required before dialog element was widely supported" |
| Replacement | Native alternative | `<dialog>` with `showModal()` / `close()` |
| A11y Impact | Accessibility considerations | "Native dialog has better focus management" |
| Bundle Impact | Estimated JS savings | "~200 bytes, plus remove useClickOutside hook" |
| Risk | Migration risk level | LOW/MEDIUM/HIGH |
| Rollback | How to revert if needed | "Git revert, restore old Modal component" |

### Step 7: Analyze Third-Party Dependencies

```bash
# Check for UI libraries that might be replaceable
grep -rn "import.*from.*'radix-ui\|import.*from.*'@headlessui" src/lib/components/ --include="*.svelte"

# Check for animation libraries
grep -rn "import.*from.*'framer-motion\|import.*from.*'gsap" src/lib/components/ --include="*.svelte"

# Check for form libraries
grep -rn "import.*from.*'react-hook-form\|import.*from.*'formik" src/lib/components/ --include="*.svelte"
```

### Step 8: Create Prioritized Inventory

Classify findings into:

**Quick Wins** (Low risk, clear native replacement):
- Boolean state for `<details>` elements
- Click-outside for dialog/popover
- Escape key handlers where native exists

**Medium Wins** (Moderate complexity, good payoff):
- Custom dropdown to `<select>` or native `<selectmenu>`
- Custom tooltips to CSS-only
- Focus traps to `<dialog>`

**Defer** (High risk or complex):
- Custom date pickers (wait for native)
- Complex animations with state
- Advanced accessibility patterns not fully supported

---

## Native Web Platform Alternatives

### Modals and Dialogs

**Before (JavaScript):**
```svelte
<script>
  let isOpen = $state(false);

  function close() {
    isOpen = false;
  }

  function handleClickOutside(event) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  });

  function handleEscape(event) {
    if (event.key === 'Escape') close();
  }
</script>

{#if isOpen}
  <div class="overlay" onclick={handleClickOutside}>
    <div class="modal">
      <slot />
      <button onclick={close}>Close</button>
    </div>
  </div>
{/if}
```

**After (Native):**
```svelte
<script>
  let dialog: HTMLDialogElement;

  export function open() {
    dialog?.showModal();
  }

  export function close() {
    dialog?.close();
  }
</script>

<dialog bind:this={dialog}>
  <slot />
  <button onclick={close}>Close</button>
</dialog>

<style>
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
</style>
```

**Savings:** ~150 bytes, removes click-outside and escape handlers

### Accordions/Collapsible

**Before (JavaScript):**
```svelte
<script>
  let isOpen = $state(false);
</script>

<button onclick={() => isOpen = !isOpen}>
  Toggle
</button>
{#if isOpen}
  <div>Content</div>
{/if}
```

**After (Native):**
```html
<details>
  <summary>Toggle</summary>
  <div>Content</div>
</details>
```

**Savings:** All state management removed

### Tooltips

**Before (JavaScript):**
```svelte
<script>
  let showTooltip = $state(false);
</script>

<button
  onmouseenter={() => showTooltip = true}
  onmouseleave={() => showTooltip = false}
>
  Hover me
  {#if showTooltip}
    <span class="tooltip">Tooltip text</span>
  {/if}
</button>
```

**After (CSS):**
```html
<button data-tooltip="Tooltip text">
  Hover me
</button>

<style>
  [data-tooltip] {
    position: relative;
  }

  [data-tooltip]::after {
    content: attr(data-tooltip);
    position: absolute;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
  }

  [data-tooltip]:hover::after {
    opacity: 1;
  }
</style>
```

**Savings:** All JavaScript removed

---

## Expected Artifacts

| Artifact | Location | Description |
|----------|----------|-------------|
| Full Inventory | `.claude/artifacts/js-elimination-inventory.md` | Complete analysis |
| Quick Wins List | Section in inventory | Prioritized easy wins |
| Migration Plan | `.claude/artifacts/js-elimination-plan.md` | Step-by-step migration |
| Risk Assessment | Section in inventory | Risk analysis per item |

---

## Output Template

```markdown
## Unnecessary JavaScript Inventory

### Date: [YYYY-MM-DD]
### Scope: [paths analyzed]
### Target Runtime: [browser/version]

---

### Summary
- Total patterns found: [N]
- Quick wins: [N]
- Medium complexity: [N]
- Deferred: [N]
- Estimated total JS savings: [X]KB

---

### Category: State Management (Dialogs/Modals)

#### Pattern: Manual Open/Close State
**Location**: `src/lib/components/Modal.svelte:12-45`

**Current Code:**
```typescript
let isOpen = $state(false);
function toggle() { isOpen = !isOpen; }
```

**Why JS**: Before `<dialog>` was widely supported

**Replacement**: Native `<dialog>` element
```html
<dialog>...</dialog>
<script>
  dialog.showModal(); // Open
  dialog.close();     // Close
</script>
```

**A11y Impact**: Improved - native focus management, escape handling

**Bundle Impact**: ~150 bytes saved, removes state and handlers

**Risk**: LOW - well-supported, easy rollback

**Rollback**: Restore previous Modal component from git

---

### Category: Click-Outside Detection

#### Pattern: Document Event Listener
**Location**: `src/lib/components/Dropdown.svelte:34-50`

**Current Code:**
```typescript
document.addEventListener('click', handleClickOutside);
// Cleanup required
```

**Why JS**: To close dropdown when clicking outside

**Replacement**: Native popover API or `<dialog>` light dismiss

**A11y Impact**: Neutral - native handles this better

**Bundle Impact**: ~100 bytes, removes event handler logic

**Risk**: LOW

**Rollback**: Keep old component as `DropdownLegacy.svelte`

---

### Quick Wins (Priority 1)

1. **Modal dialogs → `<dialog>`** (5 instances)
   - Files: Modal.svelte, ConfirmDialog.svelte, etc.
   - Savings: ~750 bytes total
   - Risk: LOW
   - Effort: 2 hours

2. **Accordions → `<details>`** (8 instances)
   - Files: FAQ.svelte, Accordion.svelte
   - Savings: ~400 bytes total
   - Risk: LOW
   - Effort: 1 hour

3. **CSS tooltips** (12 instances)
   - Files: Various components
   - Savings: ~600 bytes total
   - Risk: LOW
   - Effort: 3 hours

**Total Quick Wins**: ~1.75KB saved, 6 hours effort

---

### Medium Complexity (Priority 2)

1. **Custom dropdown → native select** (3 instances)
   - Risk: MEDIUM (styling limitations)
   - Effort: 4 hours
   - Deferred until better native styling support

---

### Deferred (Low Priority)

1. **Date picker** - Wait for native `<input type="date">` improvements
2. **Complex animations** - Keep for now, requires design review

---

### Migration Plan

**Phase 1** (Week 1): Quick wins
- Migrate all dialogs to `<dialog>`
- Convert accordions to `<details>`
- Test accessibility

**Phase 2** (Week 2): Medium complexity
- Evaluate native select styling
- Create fallback strategy

**Phase 3** (Week 3): Testing
- Cross-browser testing
- Accessibility audit
- Performance measurement

---

### Testing Checklist

For each migration:
- [ ] Visual appearance matches original
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Focus management correct
- [ ] All interactions functional
- [ ] Cross-browser tested
- [ ] Performance improved (or neutral)
- [ ] Bundle size reduced

---

### Success Criteria

- All patterns identified and categorized
- Native replacements documented
- Risk assessment complete
- Migration plan with timeline
- Rollback strategy for each change
- Expected bundle size reduction calculated
```

---

## Browser Support Checklist

Before migrating, verify support for:

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| `<dialog>` | 37+ | 15.4+ | 98+ | 79+ |
| Popover API | 114+ | 17+ | 125+ | 114+ |
| `inert` attribute | 102+ | 15.5+ | 112+ | 102+ |
| CSS `:has()` | 105+ | 15.4+ | 121+ | 105+ |
| Container queries | 105+ | 16+ | 110+ | 105+ |

---

## Success Criteria

- Complete inventory of JavaScript patterns analyzed
- Each pattern categorized by replacement opportunity
- Native alternatives identified and documented
- Risk ratings assigned (LOW/MEDIUM/HIGH)
- Bundle size impact estimated
- Migration plan with phases created
- Rollback strategies documented
- Testing checklist prepared
