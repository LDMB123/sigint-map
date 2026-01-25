# CSS Modernization Quick Reference - DMB Almanac

## At a Glance

| Feature | Status | Action | Time | Risk |
|---------|--------|--------|------|------|
| **@scope** | Ready | Activate (1 line!) | 5 min | None |
| **CSS if()** | 20% done | Expand to 8 components | 2 hrs | Low |
| **Media Queries** | 40% done | Find & replace (21x) | 1.5 hrs | None |
| **Container Queries** | 70% done | Add style() conditions | 1 hr | Very Low |
| **Anchor Positioning** | 80% done | Custom @position-try | 1 hr | Very Low |

---

## Phase 1: The 5-Minute Win

**File:** `dmb-almanac-svelte/src/app.css` (after line 18)

```css
/* Add this ONE line */
@import './lib/styles/scoped-patterns.css';
```

Save, test, done! ✅

---

## Phase 2: CSS if() Template

Copy-paste for each component:

```css
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .component {
    padding: if(style(--mode: compact), 0.5rem, 1rem);
    font-size: if(style(--size: large), 1.25rem, 1rem);
  }
}

@supports not (width: if(style(--x: 1), 10px, 20px)) {
  .component {
    padding: 1rem;
    font-size: 1rem;
  }
}
```

**Usage:**
```svelte
<div style:--mode={compactMode ? 'compact' : 'normal'}>
  <Component />
</div>
```

---

## Phase 3: Find & Replace Media Queries

### VS Code Regex Patterns

**Replace (min-width):**
```
Find:    @media \(min-width:\s+
Replace: @media (width >=
```

**Replace (max-width):**
```
Find:    @media \(max-width:\s+
Replace: @media (width <
```

---

## Components to Update

- [ ] Badge.svelte
- [ ] StatCard.svelte
- [ ] Pagination.svelte
- [ ] ShowCard.svelte
- [ ] Table.svelte
- [ ] Tooltip.svelte
- [ ] Header.svelte
- [ ] EmptyState.svelte

---

## Documentation Files

Located in: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/`

1. **CSS_MODERNIZATION_REPORT.md** - Detailed analysis
2. **CSS_MODERNIZATION_IMPLEMENTATION.md** - Step-by-step guide
3. **CSS_MODERNIZATION_SUMMARY.md** - Executive summary
4. **This file** - Quick reference

---

## Timeline

- Phase 1 (Activate @scope): **5 min**
- Phase 2 (CSS if() expansion): **2 hours**
- Phase 3 (Media queries): **1.5 hours**
- Phase 4-5 (Enhancements): **2 hours**
- Phase 6 (Testing): **1 hour**

**Total: ~8 hours**

---

## Success Checklist

- [ ] Phase 1 complete (1 line added)
- [ ] Tests pass
- [ ] No visual regressions
- [ ] Phase 2 started (8 components)
- [ ] Phase 3 complete (21 find & replace)
- [ ] Media queries modernized
- [ ] Performance verified

---

**Ready? Start Phase 1 now!** 🚀
