# CSS Modernization Quick Reference (Condensed)

## Goal

Prefer modern CSS/browser primitives over JS-driven UI behavior when it reduces complexity and runtime overhead.

## High-Value Replacements

- Scroll listeners -> scroll-driven animations
- IntersectionObserver reveal patterns -> view timelines (when equivalent)
- ResizeObserver layout logic -> container queries
- Floating UI libraries -> anchor positioning
- Theme-toggle JS -> `light-dark()` and color-scheme
- Class toggling for state styling -> `:has()` patterns where clear and maintainable

## Migration Priorities

1. **High**: anchor positioning, theme simplification, dead fallback removal
2. **Medium**: container queries and state-driven selector cleanup
3. **Low**: advanced conditional CSS (`if()`) where real complexity reduction is proven

## Performance Guardrails

- Prefer compositor-friendly properties (`transform`, `opacity`).
- Keep virtualized list scroll logic where required (do not over-normalize).
- Treat 60fps stability and reduced main-thread callbacks as success criteria.

## Feature Detection Pattern

```css
@supports (animation-timeline: scroll()) {
  /* modern path */
}
@supports not (animation-timeline: scroll()) {
  /* fallback path */
}
```

## Practical Checks

```bash
python3 scripts/check-doc-integrity.py
bash scripts/pristine-check.sh
```

## Canonical References

- Current state: `STATUS.md`
- Chromium audit: `docs/audits/chromium/CHROMIUM_AUDIT_REFERENCE.md`

## Note

This condensed quick reference keeps decision-level migration guidance while removing long code catalogs.
