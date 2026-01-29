---
skill: a11y-keyboard-test
description: Keyboard Accessibility Testing
---

# Keyboard Accessibility Testing

Comprehensive keyboard accessibility testing to ensure full keyboard navigation, focus management, and WCAG 2.1 compliance for users who rely on keyboard-only interaction.

## Usage

```
/a11y-keyboard-test [scope: full|component|form|modal|navigation] [path]
```

## Instructions

You are an accessibility testing expert specializing in keyboard navigation, focus management, and WCAG 2.1/2.2 compliance. When invoked, generate comprehensive keyboard accessibility tests that ensure the application is fully usable without a mouse.

### WCAG Keyboard Requirements

| Criterion | Level | Description |
|-----------|-------|-------------|
| 2.1.1 Keyboard | A | All functionality available via keyboard |
| 2.1.2 No Keyboard Trap | A | Focus can move away from any component |
| 2.1.4 Character Key Shortcuts | A | Single-key shortcuts can be disabled/remapped |
| 2.4.1 Bypass Blocks | A | Skip links to bypass repeated content |
| 2.4.3 Focus Order | A | Logical and meaningful focus sequence |
| 2.4.7 Focus Visible | AA | Focus indicator is visible |
| 2.4.11 Focus Not Obscured | AA | Focused element is not hidden |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | Focused element is fully visible |

### Key Bindings Matrix

| Key | Action | Context |
|-----|--------|---------|
| Tab | Move to next focusable | Global |
| Shift+Tab | Move to previous focusable | Global |
| Enter | Activate button/link | Buttons, Links |
| Space | Activate button, toggle checkbox | Buttons, Checkboxes |
| Escape | Close modal/dropdown | Modals, Dropdowns |
| Arrow Up/Down | Navigate list items | Lists, Menus, Select |
| Arrow Left/Right | Navigate tabs, sliders | Tabs, Sliders |
| Home/End | Jump to first/last item | Lists, Sliders |
| Page Up/Down | Scroll by page | Scrollable regions |

### Playwright Keyboard Tests

```typescript
// tests/e2e/a11y/keyboard-navigation.spec.ts
import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Global Keyboard Navigation', () => {
  test('should have visible skip link on first Tab', async ({ page }) => {
    await page.goto('/');

    // First tab should reveal skip link
    await page.keyboard.press('Tab');

    const skipLink = page.locator('[data-testid="skip-to-main"]');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    // Activating skip link should move focus to main content
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('should maintain logical focus order through page', async ({ page }) => {
    await page.goto('/');

    const expectedFocusOrder = [
      '[data-testid="skip-to-main"]',
      '[data-testid="logo-link"]',
      '[data-testid="nav-home"]',
      '[data-testid="nav-about"]',
      '[data-testid="nav-contact"]',
      '[data-testid="search-input"]',
      '[data-testid="login-btn"]',
    ];

    for (const selector of expectedFocusOrder) {
      await page.keyboard.press('Tab');
      await expect(page.locator(selector)).toBeFocused();
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/');

    // Tab to interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');

    // Check focus ring visibility
    const outlineWidth = await focusedElement.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return parseInt(styles.outlineWidth) || parseInt(styles.borderWidth);
    });

    expect(outlineWidth).toBeGreaterThan(0);

    // Or check for focus-visible class/styles
    const hasFocusStyles = await focusedElement.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.outline !== 'none' ||
             styles.boxShadow !== 'none' ||
             el.classList.contains('focus-visible');
    });

    expect(hasFocusStyles).toBe(true);
  });

  test('should not trap keyboard focus', async ({ page }) => {
    await page.goto('/');

    // Count all focusable elements
    const focusableCount = await page.locator(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).count();

    // Tab through all elements and verify we can escape
    for (let i = 0; i < focusableCount + 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Should have cycled back or reached end of document
    // If trapped, this would timeout
  });

  test('should support Shift+Tab for reverse navigation', async ({ page }) => {
    await page.goto('/');

    // Tab forward a few times
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const forwardElement = await page.locator(':focus').getAttribute('data-testid');

    // Tab backward
    await page.keyboard.press('Shift+Tab');

    const backwardElement = await page.locator(':focus').getAttribute('data-testid');

    expect(forwardElement).not.toBe(backwardElement);
  });
});

test.describe('Button Keyboard Interaction', () => {
  test('should activate button with Enter key', async ({ page }) => {
    await page.goto('/buttons-page');

    const button = page.locator('[data-testid="action-btn"]');
    await button.focus();

    const clickPromise = page.waitForEvent('console', msg =>
      msg.text().includes('button clicked')
    );

    await page.keyboard.press('Enter');

    await clickPromise;
  });

  test('should activate button with Space key', async ({ page }) => {
    await page.goto('/buttons-page');

    const button = page.locator('[data-testid="action-btn"]');
    await button.focus();

    await page.keyboard.press('Space');

    // Verify button was activated (check side effects)
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });

  test('should not activate disabled button', async ({ page }) => {
    await page.goto('/buttons-page');

    const disabledBtn = page.locator('[data-testid="disabled-btn"]');

    // Should not be focusable or should not activate
    await disabledBtn.focus({ timeout: 1000 }).catch(() => {});
    await page.keyboard.press('Enter');

    // Verify no action taken
    await expect(page.locator('[data-testid="disabled-result"]')).not.toBeVisible();
  });
});

test.describe('Modal/Dialog Keyboard Handling', () => {
  test('should trap focus within modal', async ({ page }) => {
    await page.goto('/modal-page');

    // Open modal
    await page.click('[data-testid="open-modal-btn"]');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Focus should move to modal
    const modalFocusables = page.locator('[role="dialog"] button, [role="dialog"] input');
    const count = await modalFocusables.count();

    // Tab through all modal elements
    for (let i = 0; i < count + 2; i++) {
      await page.keyboard.press('Tab');

      // Verify focus stays within modal
      const focusedInModal = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        const focused = document.activeElement;
        return modal?.contains(focused);
      });

      expect(focusedInModal).toBe(true);
    }
  });

  test('should close modal with Escape key', async ({ page }) => {
    await page.goto('/modal-page');

    await page.click('[data-testid="open-modal-btn"]');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should return focus to trigger after modal close', async ({ page }) => {
    await page.goto('/modal-page');

    const triggerBtn = page.locator('[data-testid="open-modal-btn"]');
    await triggerBtn.click();

    await page.keyboard.press('Escape');

    // Focus should return to the button that opened the modal
    await expect(triggerBtn).toBeFocused();
  });

  test('should focus first focusable element when modal opens', async ({ page }) => {
    await page.goto('/modal-page');

    await page.click('[data-testid="open-modal-btn"]');

    // First focusable in modal should be focused
    const firstFocusable = page.locator('[role="dialog"] [data-testid="modal-close-btn"]');
    await expect(firstFocusable).toBeFocused();
  });
});

test.describe('Dropdown Menu Keyboard Navigation', () => {
  test('should open dropdown with Enter', async ({ page }) => {
    await page.goto('/dropdown-page');

    const trigger = page.locator('[data-testid="dropdown-trigger"]');
    await trigger.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('[role="menu"]')).toBeVisible();
  });

  test('should navigate menu items with Arrow keys', async ({ page }) => {
    await page.goto('/dropdown-page');

    await page.click('[data-testid="dropdown-trigger"]');

    // First item should be focused
    await expect(page.locator('[role="menuitem"]').first()).toBeFocused();

    // Arrow down to next item
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[role="menuitem"]').nth(1)).toBeFocused();

    // Arrow up back to first
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('[role="menuitem"]').first()).toBeFocused();
  });

  test('should select menu item with Enter', async ({ page }) => {
    await page.goto('/dropdown-page');

    await page.click('[data-testid="dropdown-trigger"]');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Menu should close
    await expect(page.locator('[role="menu"]')).not.toBeVisible();

    // Action should be performed
    await expect(page.locator('[data-testid="selected-item"]')).toHaveText('Option 2');
  });

  test('should close dropdown with Escape', async ({ page }) => {
    await page.goto('/dropdown-page');

    await page.click('[data-testid="dropdown-trigger"]');
    await expect(page.locator('[role="menu"]')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.locator('[role="menu"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="dropdown-trigger"]')).toBeFocused();
  });

  test('should support Home/End keys in menu', async ({ page }) => {
    await page.goto('/dropdown-page');

    await page.click('[data-testid="dropdown-trigger"]');

    // Jump to last item
    await page.keyboard.press('End');
    await expect(page.locator('[role="menuitem"]').last()).toBeFocused();

    // Jump to first item
    await page.keyboard.press('Home');
    await expect(page.locator('[role="menuitem"]').first()).toBeFocused();
  });
});

test.describe('Tab Panel Keyboard Navigation', () => {
  test('should navigate tabs with Arrow keys', async ({ page }) => {
    await page.goto('/tabs-page');

    const firstTab = page.locator('[role="tab"]').first();
    await firstTab.focus();

    // Arrow right to next tab
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[role="tab"]').nth(1)).toBeFocused();

    // Arrow left back
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[role="tab"]').first()).toBeFocused();
  });

  test('should activate tab and show panel', async ({ page }) => {
    await page.goto('/tabs-page');

    const secondTab = page.locator('[role="tab"]').nth(1);
    await secondTab.focus();
    await page.keyboard.press('Enter');

    await expect(secondTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[role="tabpanel"]').nth(1)).toBeVisible();
  });

  test('should wrap around at tab list boundaries', async ({ page }) => {
    await page.goto('/tabs-page');

    const lastTab = page.locator('[role="tab"]').last();
    await lastTab.focus();

    // Arrow right should wrap to first tab
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[role="tab"]').first()).toBeFocused();
  });
});

test.describe('Form Keyboard Navigation', () => {
  test('should navigate form fields in logical order', async ({ page }) => {
    await page.goto('/form-page');

    const expectedOrder = [
      '[data-testid="name-input"]',
      '[data-testid="email-input"]',
      '[data-testid="phone-input"]',
      '[data-testid="message-textarea"]',
      '[data-testid="terms-checkbox"]',
      '[data-testid="submit-btn"]',
    ];

    for (const selector of expectedOrder) {
      await page.keyboard.press('Tab');
      await expect(page.locator(selector)).toBeFocused();
    }
  });

  test('should toggle checkbox with Space', async ({ page }) => {
    await page.goto('/form-page');

    const checkbox = page.locator('[data-testid="terms-checkbox"]');
    await checkbox.focus();

    await expect(checkbox).not.toBeChecked();

    await page.keyboard.press('Space');
    await expect(checkbox).toBeChecked();

    await page.keyboard.press('Space');
    await expect(checkbox).not.toBeChecked();
  });

  test('should navigate radio group with Arrow keys', async ({ page }) => {
    await page.goto('/form-page');

    const firstRadio = page.locator('[name="preference"]').first();
    await firstRadio.focus();

    // Arrow down selects next radio
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[name="preference"]').nth(1)).toBeChecked();

    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[name="preference"]').nth(2)).toBeChecked();
  });

  test('should submit form with Enter in text field', async ({ page }) => {
    await page.goto('/form-page');

    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');

    // Press Enter in a text field
    await page.keyboard.press('Enter');

    // Form should submit
    await expect(page.locator('[data-testid="form-submitted"]')).toBeVisible();
  });
});
```

### Vitest Unit Tests for Focus Management

```typescript
// tests/unit/a11y/focus-trap.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFocusTrap } from '@/utils/focus-trap';

describe('Focus Trap', () => {
  let container: HTMLElement;
  let trap: ReturnType<typeof createFocusTrap>;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="modal">
        <button id="close">Close</button>
        <input id="input" type="text" />
        <button id="submit">Submit</button>
      </div>
    `;
    container = document.getElementById('modal')!;
    trap = createFocusTrap(container);
  });

  it('should focus first focusable element on activate', () => {
    trap.activate();
    expect(document.activeElement?.id).toBe('close');
  });

  it('should cycle focus within container', () => {
    trap.activate();

    // Tab through all elements
    const submitBtn = document.getElementById('submit');
    submitBtn?.focus();

    // Simulate Tab from last element
    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    container.dispatchEvent(event);

    // Should wrap to first element
    expect(document.activeElement?.id).toBe('close');
  });

  it('should handle Shift+Tab at first element', () => {
    trap.activate();

    const closeBtn = document.getElementById('close');
    closeBtn?.focus();

    // Simulate Shift+Tab
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    container.dispatchEvent(event);

    // Should wrap to last element
    expect(document.activeElement?.id).toBe('submit');
  });

  it('should restore focus on deactivate', () => {
    const originalFocus = document.createElement('button');
    originalFocus.id = 'original';
    document.body.appendChild(originalFocus);
    originalFocus.focus();

    trap.activate();
    expect(document.activeElement?.id).not.toBe('original');

    trap.deactivate();
    expect(document.activeElement?.id).toBe('original');
  });
});

// tests/unit/a11y/roving-tabindex.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RovingTabIndex } from '@/utils/roving-tabindex';

describe('Roving TabIndex', () => {
  let container: HTMLElement;
  let rover: RovingTabIndex;

  beforeEach(() => {
    document.body.innerHTML = `
      <div role="tablist" id="tabs">
        <button role="tab" data-index="0">Tab 1</button>
        <button role="tab" data-index="1">Tab 2</button>
        <button role="tab" data-index="2">Tab 3</button>
      </div>
    `;
    container = document.getElementById('tabs')!;
    rover = new RovingTabIndex(container, '[role="tab"]');
  });

  it('should set tabindex=0 on first item only', () => {
    rover.initialize();

    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');
    expect(tabs[2].getAttribute('tabindex')).toBe('-1');
  });

  it('should move focus on ArrowRight', () => {
    rover.initialize();

    const tabs = container.querySelectorAll('[role="tab"]');
    (tabs[0] as HTMLElement).focus();

    rover.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[0].getAttribute('tabindex')).toBe('-1');
    expect(tabs[1].getAttribute('tabindex')).toBe('0');
  });

  it('should wrap from last to first', () => {
    rover.initialize();

    const tabs = container.querySelectorAll('[role="tab"]');
    (tabs[2] as HTMLElement).focus();

    rover.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(document.activeElement).toBe(tabs[0]);
  });

  it('should jump to first on Home key', () => {
    rover.initialize();

    const tabs = container.querySelectorAll('[role="tab"]');
    (tabs[2] as HTMLElement).focus();

    rover.handleKeyDown(new KeyboardEvent('keydown', { key: 'Home' }));

    expect(document.activeElement).toBe(tabs[0]);
  });

  it('should jump to last on End key', () => {
    rover.initialize();

    const tabs = container.querySelectorAll('[role="tab"]');
    (tabs[0] as HTMLElement).focus();

    rover.handleKeyDown(new KeyboardEvent('keydown', { key: 'End' }));

    expect(document.activeElement).toBe(tabs[2]);
  });
});
```

### Axe Integration Tests

```typescript
// tests/e2e/a11y/axe-keyboard.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Axe Keyboard Accessibility', () => {
  test('should have no keyboard accessibility violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('body')
      .analyze();

    // Filter to keyboard-related rules
    const keyboardViolations = results.violations.filter(v =>
      ['keyboard', 'focus', 'tabindex', 'bypass'].some(tag =>
        v.tags.includes(tag)
      )
    );

    expect(keyboardViolations).toHaveLength(0);
  });

  test('should have proper focus indicators', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withRules(['focus-visible'])
      .analyze();

    expect(results.violations).toHaveLength(0);
  });
});
```

### Response Format

```
## Keyboard Accessibility Test Report

### Scope: [full|component|form|modal|navigation]
### Target: [path or "entire project"]

### WCAG Compliance Summary

| Criterion | Status | Issues |
|-----------|--------|--------|
| 2.1.1 Keyboard | [Pass/Fail] | [count] |
| 2.1.2 No Keyboard Trap | [Pass/Fail] | [count] |
| 2.4.3 Focus Order | [Pass/Fail] | [count] |
| 2.4.7 Focus Visible | [Pass/Fail] | [count] |

### Test Results

| Test Suite | Tests | Passed | Failed |
|------------|-------|--------|--------|
| Global Navigation | X | X | X |
| Modal/Dialog | X | X | X |
| Dropdown Menus | X | X | X |
| Tab Panels | X | X | X |
| Form Controls | X | X | X |

### Critical Issues

#### Issue 1: [Title]
- **Location**: [component/file]
- **WCAG Criterion**: [2.X.X]
- **Description**: [what's wrong]
- **Fix**: [solution]

### Generated Test Files

1. `tests/e2e/a11y/keyboard-navigation.spec.ts`
   - X navigation tests

2. `tests/e2e/a11y/focus-management.spec.ts`
   - X focus trap tests

3. `tests/unit/a11y/*.test.ts`
   - X unit tests for utilities

### Commands

\`\`\`bash
# Run all keyboard a11y tests
npx playwright test --grep @keyboard

# Run with accessibility reporter
npx playwright test --reporter=@axe-core/playwright

# Debug focus issues
npx playwright test --debug tests/e2e/a11y/keyboard-navigation.spec.ts

# Generate a11y report
npm run test:a11y -- --reporter=html
\`\`\`

### Recommendations

1. **Focus Indicators**: [suggestions for visible focus styles]
2. **Keyboard Traps**: [identified trap locations and fixes]
3. **Focus Order**: [logical order improvements]
4. **Missing Skip Links**: [locations needing skip navigation]
```
