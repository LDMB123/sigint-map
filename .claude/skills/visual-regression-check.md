---
skill: visual-regression-check
description: Visual Regression Check
---

# Visual Regression Check

Comprehensive visual regression testing to detect unintended UI changes across components, pages, and responsive breakpoints.

## Usage

```
/visual-regression-check [scope: full|component|page|responsive] [path]
```

## Instructions

You are a visual regression testing expert specializing in pixel-perfect UI validation, responsive design testing, and cross-browser visual consistency. When invoked, generate comprehensive visual regression tests that catch unintended visual changes before they reach production.

### Test Scope Matrix

| Scope | Description | Use Case |
|-------|-------------|----------|
| full | All components and pages | Pre-release validation |
| component | Individual component snapshots | Component development |
| page | Full page screenshots | Page-level changes |
| responsive | Multi-breakpoint testing | Layout changes |

### Breakpoint Configuration

| Name | Width | Device Class |
|------|-------|--------------|
| mobile-sm | 320px | Small phones |
| mobile | 375px | Standard phones |
| mobile-lg | 428px | Large phones |
| tablet | 768px | Tablets portrait |
| tablet-lg | 1024px | Tablets landscape |
| desktop | 1280px | Standard desktop |
| desktop-lg | 1440px | Large desktop |
| desktop-xl | 1920px | Wide screens |

### Playwright Visual Testing Examples

```typescript
// tests/visual/components.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Component Visual Regression', () => {
  test.describe('Button Component', () => {
    test('primary button states', async ({ page }) => {
      await page.goto('/storybook/iframe.html?id=components-button--primary');

      // Default state
      await expect(page.locator('.btn-primary')).toHaveScreenshot('button-primary-default.png');

      // Hover state
      await page.locator('.btn-primary').hover();
      await expect(page.locator('.btn-primary')).toHaveScreenshot('button-primary-hover.png');

      // Focus state
      await page.locator('.btn-primary').focus();
      await expect(page.locator('.btn-primary')).toHaveScreenshot('button-primary-focus.png');

      // Disabled state
      await page.goto('/storybook/iframe.html?id=components-button--primary&args=disabled:true');
      await expect(page.locator('.btn-primary')).toHaveScreenshot('button-primary-disabled.png');
    });

    test('button sizes', async ({ page }) => {
      const sizes = ['sm', 'md', 'lg', 'xl'];

      for (const size of sizes) {
        await page.goto(`/storybook/iframe.html?id=components-button--primary&args=size:${size}`);
        await expect(page.locator('.btn-primary')).toHaveScreenshot(`button-size-${size}.png`);
      }
    });

    test('button variants', async ({ page }) => {
      const variants = ['primary', 'secondary', 'outline', 'ghost', 'destructive'];

      for (const variant of variants) {
        await page.goto(`/storybook/iframe.html?id=components-button--${variant}`);
        await expect(page.locator(`[class*="btn"]`)).toHaveScreenshot(`button-${variant}.png`);
      }
    });
  });

  test.describe('Card Component', () => {
    test('card with all content types', async ({ page }) => {
      await page.goto('/storybook/iframe.html?id=components-card--with-image');
      await expect(page.locator('.card')).toHaveScreenshot('card-with-image.png');
    });

    test('card loading skeleton', async ({ page }) => {
      await page.goto('/storybook/iframe.html?id=components-card--loading');
      await expect(page.locator('.card')).toHaveScreenshot('card-skeleton.png');
    });
  });

  test.describe('Form Components', () => {
    test('input field states', async ({ page }) => {
      await page.goto('/storybook/iframe.html?id=components-input--default');

      const input = page.locator('input');

      // Empty state
      await expect(input).toHaveScreenshot('input-empty.png');

      // Filled state
      await input.fill('Sample text');
      await expect(input).toHaveScreenshot('input-filled.png');

      // Error state
      await page.goto('/storybook/iframe.html?id=components-input--error');
      await expect(page.locator('.input-wrapper')).toHaveScreenshot('input-error.png');

      // Success state
      await page.goto('/storybook/iframe.html?id=components-input--success');
      await expect(page.locator('.input-wrapper')).toHaveScreenshot('input-success.png');
    });

    test('select dropdown open state', async ({ page }) => {
      await page.goto('/storybook/iframe.html?id=components-select--default');

      // Closed state
      await expect(page.locator('.select')).toHaveScreenshot('select-closed.png');

      // Open state
      await page.locator('.select-trigger').click();
      await expect(page.locator('.select-content')).toHaveScreenshot('select-open.png');
    });
  });
});

// tests/visual/pages.spec.ts
test.describe('Page Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test('homepage full page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for images to load
    await page.waitForFunction(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).every(img => img.complete);
    });

    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dashboard page', async ({ page }) => {
    // Login first if needed
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-btn"]');

    await page.waitForURL('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
    });
  });

  test('404 error page', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page).toHaveScreenshot('404-page.png');
  });

  test('loading states', async ({ page }) => {
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.continue();
    });

    await page.goto('/data-page');
    await expect(page).toHaveScreenshot('page-loading-state.png');
  });
});

// tests/visual/responsive.spec.ts
test.describe('Responsive Visual Regression', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'desktop-lg', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('navigation', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('nav')).toHaveScreenshot(`nav-${viewport.name}.png`);

        // Test mobile menu if applicable
        if (viewport.width < 768) {
          await page.click('[data-testid="mobile-menu-toggle"]');
          await expect(page.locator('[data-testid="mobile-menu"]')).toHaveScreenshot(
            `mobile-menu-open-${viewport.name}.png`
          );
        }
      });

      test('hero section', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('[data-testid="hero"]')).toHaveScreenshot(
          `hero-${viewport.name}.png`
        );
      });

      test('footer', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('footer')).toHaveScreenshot(`footer-${viewport.name}.png`);
      });

      test('grid layout', async ({ page }) => {
        await page.goto('/products');
        await expect(page.locator('[data-testid="product-grid"]')).toHaveScreenshot(
          `product-grid-${viewport.name}.png`
        );
      });
    });
  }
});

// tests/visual/theme.spec.ts
test.describe('Theme Visual Regression', () => {
  test('light theme', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page).toHaveScreenshot('homepage-light-theme.png', { fullPage: true });
  });

  test('dark theme', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page).toHaveScreenshot('homepage-dark-theme.png', { fullPage: true });
  });

  test('high contrast mode', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(page).toHaveScreenshot('homepage-high-contrast.png', { fullPage: true });
  });

  test('reduced motion preference', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Trigger animation
    await page.click('[data-testid="animated-element"]');
    await expect(page.locator('[data-testid="animated-element"]')).toHaveScreenshot(
      'animation-reduced-motion.png'
    );
  });
});

// tests/visual/cross-browser.spec.ts
test.describe('Cross-Browser Visual Consistency', () => {
  test('critical UI elements match across browsers', async ({ page, browserName }) => {
    await page.goto('/');

    // Take screenshots with browser-specific naming
    await expect(page.locator('header')).toHaveScreenshot(`header-${browserName}.png`);
    await expect(page.locator('[data-testid="cta-button"]')).toHaveScreenshot(
      `cta-button-${browserName}.png`
    );
  });
});
```

### Vitest Component Snapshot Tests

```typescript
// tests/unit/components/Button.snapshot.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button Snapshots', () => {
  it('renders primary button', () => {
    const { container } = render(<Button variant="primary">Click me</Button>);
    expect(container).toMatchSnapshot();
  });

  it('renders secondary button', () => {
    const { container } = render(<Button variant="secondary">Click me</Button>);
    expect(container).toMatchSnapshot();
  });

  it('renders disabled button', () => {
    const { container } = render(<Button disabled>Click me</Button>);
    expect(container).toMatchSnapshot();
  });

  it('renders button with icon', () => {
    const { container } = render(
      <Button icon={<IconPlus />}>Add Item</Button>
    );
    expect(container).toMatchSnapshot();
  });

  it('renders loading button', () => {
    const { container } = render(<Button loading>Loading...</Button>);
    expect(container).toMatchSnapshot();
  });
});

// tests/unit/components/Card.snapshot.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/Card';

describe('Card Snapshots', () => {
  it('renders basic card', () => {
    const { container } = render(
      <Card>
        <CardHeader>Title</CardHeader>
        <CardContent>Content goes here</CardContent>
      </Card>
    );
    expect(container).toMatchSnapshot();
  });

  it('renders card with footer actions', () => {
    const { container } = render(
      <Card>
        <CardHeader>Title</CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="primary">Save</Button>
        </CardFooter>
      </Card>
    );
    expect(container).toMatchSnapshot();
  });
});
```

### Configuration Files

```typescript
// playwright.config.ts (visual testing config)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/__snapshots__',
  updateSnapshots: 'missing',
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: 'disabled',
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

```javascript
// vitest.config.ts (snapshot config)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    snapshotFormat: {
      escapeString: false,
      printBasicPrototype: false,
    },
    resolveSnapshotPath: (testPath, snapExtension) => {
      return testPath.replace('/tests/', '/__snapshots__/') + snapExtension;
    },
  },
});
```

### CI Integration

```yaml
# .github/workflows/visual-regression.yml
name: Visual Regression Tests

on:
  pull_request:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run visual tests
        run: npx playwright test --project=chromium

      - name: Upload diff artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diff-report
          path: |
            tests/visual/__snapshots__/
            playwright-report/
          retention-days: 7

      - name: Comment PR with diff links
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'Visual regression detected! Check the artifacts for diff images.'
            })
```

### Response Format

```
## Visual Regression Check Report

### Scope: [full|component|page|responsive]
### Target: [path or "entire project"]

### Summary

| Category | Screenshots | Passed | Failed | New |
|----------|-------------|--------|--------|-----|
| Components | X | X | X | X |
| Pages | X | X | X | X |
| Responsive | X | X | X | X |
| Themes | X | X | X | X |

### Failed Comparisons

#### [Screenshot Name]
- **File**: [path to test file]
- **Difference**: [X% pixel difference]
- **Likely Cause**: [description]
- **Action**: Review diff image at `__snapshots__/[name]-diff.png`

### New Baselines Created

- `[screenshot-name].png` - [description]

### Test Files Generated

1. `tests/visual/components.spec.ts`
   - X component visual tests

2. `tests/visual/pages.spec.ts`
   - X page screenshots

3. `tests/visual/responsive.spec.ts`
   - X breakpoint combinations

### Commands

\`\`\`bash
# Run visual tests
npx playwright test tests/visual/

# Update baselines (use with caution)
npx playwright test --update-snapshots

# View diff report
npx playwright show-report

# Test specific component
npx playwright test -g "Button Component"

# Test specific viewport
npx playwright test --project=mobile-chrome
\`\`\`

### Recommendations

1. **Flaky Screenshots**: [Components with animation issues]
2. **Missing Coverage**: [Untested visual states]
3. **Cross-Browser Issues**: [Browser-specific rendering]
4. **Threshold Adjustments**: [Suggested config changes]
```
