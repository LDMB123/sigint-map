# UX Excellence Skills - Quick Reference

## 6 Core Skills Created

### 1. Focus Management Excellence
**File:** `focus-management.md`
**Problem:** Users can't navigate with keyboard, focus gets lost, modals trap users
**Solution:** Invisible keyboard navigation that feels native and intuitive
**Code Patterns:** `:focus-visible`, focus trapping, focus restoration, skip links, roving tabindex
**Quick Win:** Add proper focus visible styling to all interactive elements

### 2. Loading Experience Mastery
**File:** `loading-experience.md`
**Problem:** Users see blank screens, layouts shift, loading feels slow
**Solution:** Content-first loading with skeleton screens and perceived performance
**Code Patterns:** Skeleton screens, progressive images, optimistic updates, View Transitions
**Quick Win:** Add skeleton screens that match final layout exactly

### 3. Error Elegance
**File:** `error-elegance.md`
**Problem:** Users get cryptic errors, lose form data, don't know how to recover
**Solution:** Graceful failures with clear guidance and data preservation
**Code Patterns:** Inline validation, recovery suggestions, form preservation, undo, offline handling
**Quick Win:** Replace generic error messages with specific guidance

### 4. Micro-Interactions Excellence
**File:** `micro-interactions.md`
**Problem:** Interactions feel dead, unclear, or frustrating
**Solution:** Purposeful animations that communicate and delight
**Code Patterns:** Button press feedback, ripple effects, swipe actions, pull-to-refresh, success celebrations
**Quick Win:** Add ripple effect to buttons and toggle animations

### 5. Responsive Excellence
**File:** `responsive-excellence.md`
**Problem:** Mobile layouts are cramped, breakpoints are brittle, images overflow
**Solution:** Fluid, component-aware responsive design
**Code Patterns:** Container queries, fluid typography (clamp), responsive images, touch adaptation
**Quick Win:** Switch to fluid typography with clamp() function

### 6. Native Feel Excellence
**File:** `native-feel.md`
**Problem:** Web app feels foreign to macOS, disrespects system preferences
**Solution:** Platform-authentic experiences that feel born on the OS
**Code Patterns:** System fonts, dark mode support, keyboard shortcuts, reduced motion respect
**Quick Win:** Add -apple-system font stack and dark mode support

---

## Implementation Roadmap

### Week 1 (Immediate)
**Priority Skills:** Focus Management + Native Feel
- Add focus visible styling
- Implement system font stack
- Add dark mode support
- Fix keyboard shortcuts

**Estimated Time:** 3-4 days

### Week 2 (Content)
**Priority Skills:** Loading Experience + Error Elegance
- Add skeleton screens
- Improve error messages
- Preserve form data on error
- Add real-time validation

**Estimated Time:** 4-5 days

### Week 3 (Polish)
**Priority Skills:** Micro-Interactions + Responsive Excellence
- Add micro-interactions
- Implement container queries
- Optimize for mobile
- Test across viewports

**Estimated Time:** 4-5 days

---

## Quick Code Snippets

### Focus Management
```javascript
// Trap focus in modal
const focusableElements = modal.querySelectorAll(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
);
```

### Loading Experience
```css
/* Fluid typography */
h1 { font-size: clamp(24px, 5vw, 56px); }

/* Skeleton pulse */
@keyframes skeleton-pulse {
  0% { background: #e0e0e0; }
  50% { background: #f0f0f0; }
  100% { background: #e0e0e0; }
}
```

### Error Elegance
```javascript
// Real-time validation
input.addEventListener('input', () => {
  const error = validateInput(input.value);
  showError(input, error);
});
```

### Micro-Interactions
```javascript
// Ripple effect on click
const ripple = document.createElement('span');
ripple.classList.add('ripple');
button.appendChild(ripple);
setTimeout(() => ripple.remove(), 600);
```

### Responsive Excellence
```css
/* Container query */
@container (min-width: 400px) {
  .card { flex-direction: row; }
}

/* Touch-friendly */
@media (hover: none) and (pointer: coarse) {
  button { min-height: 44px; }
}
```

### Native Feel
```css
/* System font */
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

/* Dark mode */
@media (prefers-color-scheme: dark) {
  body { background: #1e1e1e; }
}
```

---

## Quality Checklist Summary

### Focus Management
- [ ] Focus visible on all interactive elements
- [ ] Modal focus trap works
- [ ] Skip link present
- [ ] Tab order is logical

### Loading Experience
- [ ] Skeleton screens match final layout
- [ ] CLS = 0 (no layout shift)
- [ ] Loading states communicated
- [ ] Optimistic updates work

### Error Elegance
- [ ] Inline validation works
- [ ] Error messages are helpful (not blaming)
- [ ] Form data preserved on error
- [ ] Undo available for destructive actions

### Micro-Interactions
- [ ] Button press feedback immediate
- [ ] Animations 200-500ms (not too slow)
- [ ] Animations respect prefers-reduced-motion
- [ ] No distracting motion

### Responsive Excellence
- [ ] No horizontal scroll
- [ ] Touch targets ≥44x44px
- [ ] Fluid typography used
- [ ] Tested on real mobile devices

### Native Feel
- [ ] System font stack used
- [ ] Dark mode supported
- [ ] Cmd+S, Cmd+Z work
- [ ] Scrollbars look native

---

## Testing Quick Links

### Browser DevTools
```javascript
// Check system font is used
getComputedStyle(document.body).fontFamily

// Check dark mode detection
window.matchMedia('(prefers-color-scheme: dark)').matches

// Check reduced motion
window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Check all focusable elements
document.querySelectorAll('button, [href], input, select, textarea, [tabindex]')
```

### Real Device Testing
- iPhone 13 mini (375px)
- iPhone 14 Pro (393px)
- iPad (768px)
- MacBook (1440px)

### Keyboard Testing
- Tab through entire page
- Cmd+S (save)
- Cmd+Z (undo)
- Cmd+A (select all)
- Cmd+F (find)

---

## File Structure

```
.claude/skills/ui-ux/
├── INDEX.md                    # This entire skill collection
├── QUICK-REFERENCE.md          # This file
├── focus-management.md         # Skill 1: Keyboard navigation
├── loading-experience.md       # Skill 2: Perceived performance
├── error-elegance.md          # Skill 3: Graceful failures
├── micro-interactions.md      # Skill 4: Interactive details
├── responsive-excellence.md   # Skill 5: Every viewport
└── native-feel.md             # Skill 6: Platform authentic
```

---

## Key Principles (Remember These)

**Focus Management**
> Keyboard users are power users. Design for them first.

**Loading Experience**
> Users don't measure milliseconds. They measure moments of uncertainty.

**Error Elegance**
> Errors aren't failures of the user—they're failures of your design.

**Micro-Interactions**
> Animation is communication. Every frame tells a story.

**Responsive Excellence**
> Design by content, not by device. One user, many screens.

**Native Feel**
> Users know macOS. Your app should feel like it lives there.

---

## Common Implementation Mistakes

### ❌ Focus Management
- Missing focus visible styling
- Positive tabindex values
- Focus trap without escape route

### ❌ Loading Experience
- Skeleton screens that don't match layout
- Layout shift (CLS > 0)
- No loading indicators

### ❌ Error Elegance
- Generic error messages
- Lost form data
- No recovery path

### ❌ Micro-Interactions
- Animations over 1 second
- No animation feedback
- Ignores prefers-reduced-motion

### ❌ Responsive Excellence
- Horizontal scroll on mobile
- Touch targets < 44x44px
- Breakpoint-first instead of content-first

### ❌ Native Feel
- Custom scrollbars that look terrible
- No dark mode support
- Font size too small (< 16px)

---

## Resources by Skill

### Focus Management
- MDN: Keyboard navigable custom components
- WCAG 2.4 Navigable guidelines
- The Dialog element API

### Loading Experience
- Web Vitals Guide (web.dev)
- View Transitions API docs
- Speculation Rules guide

### Error Elegance
- Error Message Design (Smashing Magazine)
- Form Validation Best Practices
- Offline-First Design patterns

### Micro-Interactions
- Material Design Motion Guidelines
- Web Animations API
- Gesture Design patterns

### Responsive Excellence
- Container Queries guide
- Responsive Image techniques
- CSS Grid and Flexbox

### Native Feel
- macOS Human Interface Guidelines
- System Fonts guide
- prefers-color-scheme documentation

---

## Next Action

Pick the skill that addresses your biggest current pain point:

1. **Users can't navigate with keyboard?** → Start with Focus Management
2. **Pages feel slow and jumpy?** → Start with Loading Experience
3. **Error messages confuse users?** → Start with Error Elegance
4. **Interactions feel dead?** → Start with Micro-Interactions
5. **Mobile layouts are broken?** → Start with Responsive Excellence
6. **App doesn't feel like macOS?** → Start with Native Feel

Read the Philosophy, study the code examples, apply the patterns, verify with the checklist.

That's it. Excellence awaits.

---

**Version:** 2026.01 (Updated for macOS 26.2, Chromium 143+)
**Difficulty:** Advanced Implementation
**Estimated Full Implementation:** 2-3 weeks
**Maintenance:** Quarterly review recommended
