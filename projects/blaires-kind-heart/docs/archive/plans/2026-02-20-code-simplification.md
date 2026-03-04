# Wave 10: Code Simplification Pass

- Archive Path: `docs/archive/plans/2026-02-20-code-simplification.md`
- Normalized On: `2026-03-04`
- Source Title: `Wave 10: Code Simplification Pass`

## Summary
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

## Context
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Remove dead CSS, define missing CSS variables, strip unnecessary `-webkit-` prefixes for Safari 26.2, and remove a dead CSS selector — making the codebase cleaner and smaller without changing any functionality.

**Architecture:** Pure CSS cleanup pass. No Rust changes — the dead-code audit confirmed all Rust modules and functions are actively used. The only dead code is in CSS files: one unreachable selector, one undefined-but-used CSS variable, and several vendor prefixes that Safari 26.2 doesn't need.

**Tech Stack:** CSS (Safari 26.2 only), Trunk build system

**Git state:** Branch `main`, HEAD `ccd4e45`, build passes with 0 warnings, SW cache at v13

---

### Task 1: Define Missing `--color-text-muted` CSS Variable

**Files:**
- Modify: `src/styles/tokens.css` — add `--color-text-muted` to the `:root` variables

**Context:** 5 CSS files reference `var(--color-text-muted)` but it's never defined in `tokens.css`. Two of those references have inline fallbacks (`#999`, `#888`), two don't. The intended color is a lighter text shade for secondary content. The existing token `--color-text-light` is `#5C4560` (dark purple-gray) — this is the *secondary* text color, not truly "muted". The `--color-text-muted` references use light gray (`#999`, `#888`), suggesting a much lighter shade for de-emphasized content.

**Step 1:** In `src/styles/tokens.css`, find the `:root` block where text colors are defined. Near `--color-text-light: #5C4560;` (line 29), add:

```css
  --color-text-muted: #999;
```

**Step 2:** Now standardize the 5 references — remove inconsistent inline fallbacks since the variable is now defined:

In `src/styles/app.css`, line 318 — already has no fallback, leave as-is:
```css
color: var(--color-text-muted);
```

In `src/styles/tracker.css`, line 396 — remove redundant fallback:
```css
/* Change from: */
color: var(--color-text-muted, #999);
/* To: */
color: var(--color-text-muted);
```

In `src/styles/progress.css`, lines 490 and 523 — remove redundant fallbacks:
```css
/* Change from: */
color: var(--color-text-muted, #888);
/* To: */
color: var(--color-text-muted);
```

In `src/styles/home.css`, line 629 — remove redundant fallback:
```css
/* Change from: */
color: var(--color-text-muted, #999);
/* To: */
color: var(--color-text-muted);
```

**Step 3:** Run `trunk build --release` — verify 0 errors.

**Step 4:** Commit: `fix: define missing --color-text-muted CSS variable, remove redundant fallbacks`

---

### Task 2: Remove Dead `.home-btn:nth-child(4)` CSS Selector

**Files:**
- Modify: `src/styles/scroll-effects.css` — remove lines 115-117

**Context:** `index.html` has only 3 `.home-btn` elements (tracker, adventures, mystuff). The CSS selector `.home-btn:nth-child(4)` on line 115 of `scroll-effects.css` will never match anything.

**Step 1:** In `src/styles/scroll-effects.css`, remove the dead selector block:

```css
/* Remove this: */
.home-btn:nth-child(4) {
  animation-range: entry 30% entry 100%;
}
```

**Step 2:** Commit: `chore: remove dead .home-btn:nth-child(4) CSS selector`

---

### Task 3: Remove Unnecessary `-webkit-mask-image` Prefixes

**Files:**
- Modify: `src/styles/home.css` — remove line 188 (`-webkit-mask-image`)
- Modify: `src/styles/quests.css` — remove line 307 (`-webkit-mask-image`)

**Context:** Safari 15+ (2021) supports unprefixed `mask-image`. Since this project targets Safari 26.2 only, the `-webkit-` prefixed duplicates are unnecessary bloat. Both instances already have the unprefixed `mask-image` property.

**Step 1:** In `src/styles/home.css`, find the `-webkit-mask-image` line (around line 188). Verify the unprefixed `mask-image` exists on the line above. Remove only the `-webkit-` prefixed line.

**Step 2:** In `src/styles/quests.css`, find the `-webkit-mask-image` line (around line 307). Verify the unprefixed `mask-image` exists on the line above. Remove only the `-webkit-` prefixed line.

**Step 3:** Commit: `chore: remove -webkit-mask-image prefix (Safari 26.2 supports unprefixed)`

---

### Task 4: Remove Unnecessary `-webkit-backdrop-filter` Prefix

**Files:**
- Modify: `src/styles/tracker.css` — remove the `-webkit-backdrop-filter` line (around line 336)

**Context:** Safari 18+ supports unprefixed `backdrop-filter`. Check that the unprefixed property exists alongside it. If only the prefixed version exists, replace it with the unprefixed version (don't just delete it).

**Step 1:** In `src/styles/tracker.css`, find `-webkit-backdrop-filter: blur(12px);` around line 336. If an unprefixed `backdrop-filter: blur(12px);` exists nearby, remove the prefixed line. If only the prefixed version exists, replace `-webkit-backdrop-filter` with `backdrop-filter`.

**Step 2:** Commit: `chore: remove -webkit-backdrop-filter prefix (Safari 26.2 supports unprefixed)`

---

### Task 5: Remove Unnecessary `-webkit-overflow-scrolling` Property

**Files:**
- Modify: `src/styles/progress.css` — remove the `-webkit-overflow-scrolling: touch;` line (around line 498)

**Context:** `-webkit-overflow-scrolling: touch` was needed for smooth scrolling on iOS Safari before Safari 13. Since iOS 13 (2019), momentum scrolling is always enabled. On Safari 26.2, this property is a no-op.

**Step 1:** In `src/styles/progress.css`, remove `-webkit-overflow-scrolling: touch;` around line 498. This is a no-op on Safari 26.2.

**Step 2:** Commit: `chore: remove -webkit-overflow-scrolling (no-op on Safari 26.2)`

---

### Task 6: Clean Up `-webkit-text-fill-color` and `-webkit-text-stroke` Usage

**Files:**
- Modify: `src/styles/home.css` — check lines 125, 133
- Modify: `src/styles/games.css` — check lines 531, 1479

**Context:** `-webkit-text-fill-color` and `-webkit-text-stroke` are still prefixed-only properties even in Safari 26.2 (no unprefixed version exists in any browser). These MUST be kept. However, check if each usage is paired correctly with `background-clip: text` for gradient text effects.

**Step 1:** In `src/styles/home.css`:
- Line 123: `-webkit-background-clip: text;` — verify unprefixed `background-clip: text;` exists on adjacent line. If not, add it. If both exist, remove the `-webkit-` prefixed one (Safari 14+ supports unprefixed `background-clip: text`).
- Line 125: `-webkit-text-fill-color: transparent;` — KEEP (no unprefixed equivalent)
- Line 133: `-webkit-text-stroke: 0.5px ...;` — KEEP (no unprefixed equivalent)

**Step 2:** In `src/styles/games.css`:
- Lines 530-531: `-webkit-background-clip: text;` with `-webkit-text-fill-color: transparent;` — Add unprefixed `background-clip: text;` if missing, then remove `-webkit-background-clip`.
- Lines 1478-1479: Same pattern.

**Step 3:** In `src/styles/progress.css`:
- Lines 196-197: Both unprefixed and prefixed `background-clip: text` exist. Remove the `-webkit-` prefixed duplicate.

**Step 4:** Commit: `chore: replace -webkit-background-clip with unprefixed (Safari 26.2)`

---

### Task 7: Remove `-webkit-user-select` Prefix Duplicates

**Files:**
- Modify: `src/styles/home.css` — line 383
- Modify: `src/styles/games.css` — lines 664, 1283, 1643

**Context:** Safari 14.1+ supports unprefixed `user-select`. Check if each `-webkit-user-select` has a corresponding unprefixed `user-select` nearby. If both exist, remove the prefixed one. If only the prefixed one exists, replace it with unprefixed.

**Step 1:** For each occurrence of `-webkit-user-select: none;`:
- Check if unprefixed `user-select: none;` exists on an adjacent line
- If yes: remove the `-webkit-` prefixed line
- If no: replace `-webkit-user-select: none;` with `user-select: none;`

**Step 2:** Commit: `chore: replace -webkit-user-select with unprefixed (Safari 26.2)`

---

### Task 8: Remove `-webkit-tap-highlight-color` and `-webkit-text-size-adjust` Prefixes

**Files:**
- Modify: `src/styles/app.css` — lines 15-16

**Context:**
- `-webkit-text-size-adjust: 100%` → Safari 26.2 supports unprefixed `text-size-adjust`. Replace with unprefixed.
- `-webkit-tap-highlight-color: transparent` → This is still a `-webkit-`-only property with no unprefixed standard. KEEP it.

**Step 1:** In `src/styles/app.css`:
- Line 15: Replace `-webkit-text-size-adjust: 100%;` with `text-size-adjust: 100%;`
- Line 16: KEEP `-webkit-tap-highlight-color: transparent;` (no standard equivalent)

**Step 2:** Commit: `chore: replace -webkit-text-size-adjust with unprefixed (Safari 26.2)`

---

## Actions
_No actions recorded._

## Validation
**Files:**
- Modify: `public/sw.js` — bump `CACHE_VERSION` from v13 to v14

**Step 1:** Run `trunk build --release` — verify **0 errors, 0 warnings**.

**Step 2:** Bump `CACHE_NAME` in `public/sw.js` from `'kindheart-v13'` to `'kindheart-v14'` with comment `// Wave 10: code simplification pass`.

**Step 3:** Commit: `chore: bump SW cache to v14 for Wave 10 simplification pass`

---

1. `trunk build --release` — **0 errors, 0 warnings**
2. All CSS variables defined (no undefined var references without fallbacks)
3. No `-webkit-` prefixes where Safari 26.2 supports unprefixed
4. No dead CSS selectors
5. All existing visual appearance unchanged
6. Gradient text effects still work (kept `-webkit-text-fill-color` and `-webkit-text-stroke`)

---

### Critical Files

| File | Changes |
|------|---------|
| `src/styles/tokens.css` | Define `--color-text-muted` |
| `src/styles/scroll-effects.css` | Remove dead `.home-btn:nth-child(4)` |
| `src/styles/home.css` | Remove `-webkit-mask-image`, fix `--purple-300`, clean prefixes |
| `src/styles/quests.css` | Remove `-webkit-mask-image` |
| `src/styles/tracker.css` | Remove `-webkit-backdrop-filter`, `--color-text-muted` fallback |
| `src/styles/progress.css` | Remove `-webkit-overflow-scrolling`, `-webkit-background-clip`, `--color-text-muted` fallbacks |
| `src/styles/games.css` | Replace `-webkit-background-clip`, `-webkit-user-select` |
| `src/styles/app.css` | Replace `-webkit-text-size-adjust`, `--color-text-muted` |
| `public/sw.js` | Bump cache v13 → v14 |

### What We Didn't Touch (and Why)

- **Rust code**: Dead-code audit confirmed all modules and functions are actively used. `native_apis`, `adaptive_quests`, `skill_progression`, `utils` — all verified as live code with grep.
- **`-webkit-text-fill-color`**: No unprefixed standard exists in any browser. Must keep.
- **`-webkit-text-stroke`**: No unprefixed standard exists in any browser. Must keep.
- **`-webkit-tap-highlight-color`**: No unprefixed standard exists. Must keep.
- **`-webkit-background-clip: padding-box, border-box`**: This is the standard `background-clip` with multiple values — the `-webkit-` prefix may be needed here for Safari's gradient border trick. Leave for separate investigation.
- **JS files**: Already cleaned in Wave 9. Only `clearEvents()` in `runtime-diagnostics.js` is unused but it's a debug utility — intentionally kept.
- **Game card hardcoded colors**: Functional but not design-system compliant. A theming task, not simplification.

## References
**Files:**
- Modify: `src/styles/home.css` — line 674

**Context:** `var(--purple-300, #c084fc)` references a non-existent variable. The fallback `#c084fc` is being used. Design system defines `--color-purple-light`. Replace with the correct token.

**Step 1:** In `src/styles/home.css`, line 674, change:
```css
border: 2px solid var(--purple-300, #c084fc);
```
To:
```css
border: 2px solid var(--color-purple-light, #c084fc);
```

**Step 2:** Commit: `fix: use correct --color-purple-light token instead of undefined --purple-300`

---

