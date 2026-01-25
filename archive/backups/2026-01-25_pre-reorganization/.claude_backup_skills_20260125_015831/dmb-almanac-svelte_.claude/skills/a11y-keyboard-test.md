---
name: a11y-keyboard-test
description: A11y keyboard/focus test harness for UI components
trigger: /a11y-keyboard
used_by: [semantic-html-engineer, qa-e2e-engineer]
---

# Accessibility Keyboard/Focus Test Harness

Systematically test keyboard navigation and focus management.

## When to Use
- After migrating to native elements
- Validating Gate 2 (Accessibility)
- Testing new interactive components

## Required Inputs
- Component to test
- Expected keyboard behavior
- Focus requirements

## Step-by-Step Procedure

### 1. Test Focus Visibility

For each interactive element:

```
Test: Focus ring visible
1. Tab to element
2. Verify focus indicator is visible
3. Check contrast ratio (should be ≥3:1)
```

### 2. Test Tab Order

```
Test: Logical tab order
1. Start from top of page/component
2. Press Tab repeatedly
3. Verify order follows visual layout
4. Verify no elements are skipped
5. Verify no unexpected elements receive focus
```

### 3. Test Dialog/Modal

```
Test: Modal focus management
┌─────────────────────────────────────────┐
│ 1. Open modal                           │
│    - Press Enter on trigger             │
│    - Focus should move INTO modal       │
│                                         │
│ 2. Focus trap                           │
│    - Tab through all elements           │
│    - After last element, Tab returns    │
│      to first element (no escape)       │
│    - Shift+Tab from first goes to last  │
│                                         │
│ 3. Close modal                          │
│    - Press ESC                          │
│    - Focus returns to trigger element   │
└─────────────────────────────────────────┘
```

### 4. Test Popover/Dropdown

```
Test: Popover behavior
1. Tab to trigger
2. Press Enter/Space to open
3. Focus moves to popover content
4. Tab navigates within popover
5. ESC closes popover
6. Focus returns to trigger
7. Click outside closes (optional)
```

### 5. Test Menu Navigation

```
Test: Menu keyboard navigation
┌────────────────────────────────┐
│ Arrow Down: Next item          │
│ Arrow Up: Previous item        │
│ Home: First item               │
│ End: Last item                 │
│ Enter/Space: Activate item     │
│ ESC: Close menu                │
│ Type character: Jump to item   │
└────────────────────────────────┘
```

### 6. Test Accordion/Details

```
Test: Disclosure behavior
1. Tab to summary/trigger
2. Press Enter/Space to expand
3. Content becomes visible
4. Tab moves into content
5. Press Enter/Space to collapse
```

### 7. Test Tab Panels

```
Test: Tab navigation
┌─────────────────────────────────┐
│ Arrow Left/Right: Switch tabs  │
│ Home: First tab                 │
│ End: Last tab                   │
│ Tab: Move to panel content      │
└─────────────────────────────────┘
```

### 8. Screen Reader Testing

```bash
# macOS VoiceOver
Cmd + F5 to enable VoiceOver
Ctrl + Option + arrows to navigate
Ctrl + Option + Space to activate

# ChromeVox (Chrome extension)
Enable extension
Use Tab and arrow keys
Listen for announcements
```

### 9. Automated Testing

```typescript
// Playwright/Testing Library test example
test('dialog keyboard navigation', async ({ page }) => {
  // Open dialog
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  // Verify focus moved to dialog
  const dialog = page.locator('dialog');
  await expect(dialog).toBeFocused();

  // Test focus trap
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  // Should still be in dialog

  // Close with ESC
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();

  // Verify focus returned
  await expect(page.locator('[data-testid="dialog-trigger"]')).toBeFocused();
});
```

## Checklist Template

```markdown
## Keyboard Accessibility Checklist: [Component]

### Focus Visibility
- [ ] Focus ring visible on all interactive elements
- [ ] Focus contrast ratio ≥3:1
- [ ] Focus indicator not clipped

### Tab Navigation
- [ ] All interactive elements reachable via Tab
- [ ] Tab order follows logical reading order
- [ ] No keyboard traps (except modals)
- [ ] Skip link works (if applicable)

### Component-Specific

#### Dialog/Modal
- [ ] Focus moves to dialog on open
- [ ] Focus trapped within dialog
- [ ] Tab cycles through dialog elements
- [ ] ESC closes dialog
- [ ] Focus returns to trigger on close

#### Popover/Menu
- [ ] Enter/Space opens popover
- [ ] Focus moves to content
- [ ] ESC closes popover
- [ ] Focus returns to trigger

#### Menu Items
- [ ] Arrow keys navigate items
- [ ] Home goes to first item
- [ ] End goes to last item
- [ ] Enter/Space activates item
- [ ] Type-ahead search works (if implemented)

#### Accordion/Details
- [ ] Enter/Space toggles open state
- [ ] Content accessible when open
- [ ] Visual indicator shows state

### Screen Reader
- [ ] Role announced correctly
- [ ] State changes announced
- [ ] Labels/descriptions read
- [ ] No redundant announcements

### Reduced Motion
- [ ] Animations respect prefers-reduced-motion
- [ ] Focus changes instant when reduced motion
```

## Expected Artifacts

| Artifact | Purpose |
|----------|---------|
| Checklist (completed) | Gate 2 evidence |
| Test recordings | Proof of testing |
| Automated tests | Regression prevention |

## Success Criteria
- All checklist items pass
- No keyboard traps
- Focus visible everywhere
- Screen reader announces correctly
- Reduced motion respected
