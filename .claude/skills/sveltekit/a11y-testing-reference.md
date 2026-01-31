# SvelteKit Accessibility Testing Reference

## Focus Visibility Test
1. Tab to element
2. Verify focus indicator visible (contrast >= 3:1)
3. Check focus not clipped by overflow
4. Verify in light and dark modes

## Tab Order Test
1. Start from top of page
2. Press Tab repeatedly - verify logical order
3. No elements skipped, no unexpected focus
4. Test Shift+Tab in reverse

## Dialog/Modal Test
1. Press Enter on trigger - focus moves INTO modal
2. Tab through all elements - focus trapped
3. After last element, Tab returns to first
4. Shift+Tab from first goes to last
5. ESC closes, focus returns to trigger

## Popover/Dropdown Test
1. Tab to trigger, Enter/Space to open
2. Focus moves to content
3. Tab navigates within popover
4. ESC closes, focus returns
5. Click outside closes (light-dismiss)

## Menu Navigation Test
- Arrow Down: Next item
- Arrow Up: Previous item
- Home: First item
- End: Last item
- Enter/Space: Activate
- ESC: Close menu
- Type character: Jump to item

## Playwright Test Examples

```typescript
test('dialog keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  const dialog = page.locator('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-testid="dialog-trigger"]')).toBeFocused();
});
```

## Checklist Template
- [ ] Focus ring visible on all interactive elements
- [ ] Tab order follows logical reading order
- [ ] No keyboard traps (except modals)
- [ ] Dialog focus trap works correctly
- [ ] ESC closes dialogs and returns focus
- [ ] Screen reader announces roles and states
- [ ] Reduced motion respected
- [ ] Touch targets >= 44x44px
