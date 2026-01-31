---
name: scraping-debugger
description: "Scraping debugger for DMB Almanac project"
tags: ['project-specific', 'dmb-almanac']
---
# Scraper Debugging Guide

## When to Use

Use this skill when:
- Selectors stop working after site updates
- Network requests fail unexpectedly
- Parsed data is empty or incorrect
- HTML structure has changed
- Rate limiting or timeouts occur
- Need to analyze page structure changes

## Debugging Workflow

```
Issue Reported
     ↓
1. Reproduce locally
     ↓
2. Inspect with DevTools (headed mode)
     ↓
3. Identify failing selector/action
     ↓
4. Determine root cause (selector, timing, network)
     ↓
5. Apply minimal fix
     ↓
6. Test in headed + headless
     ↓
7. Add resilience layer
     ↓
8. Document for future reference
```

## Step 1: Reproduce Locally

### Enable Headed Mode for Debugging
```typescript
// Switch from headless to headed
const browser = await chromium.launch({
  headless: false,
  slowMo: 500  // Slow down interactions to see what's happening
});

const page = await browser.newPage();
await page.goto(url);

// Keep browser open for inspection
await page.waitForTimeout(5 * 60 * 1000);  // Wait 5 min
```

### Add Debug Logging
```typescript
import { debug } from 'debug';
const log = debug('scraper:items');

log('Fetching %s', url);
const items = await extractItems(page);
log('Found %d items', items.length);
log('First item: %O', items[0]);
```

Enable debug output:
```bash
DEBUG=scraper:* npx tsx scraper.ts
```

### Save HTML Snapshot
```typescript
// When something fails, capture the page for inspection
async function debugPage(page: Page, label: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `debug-${label}-${timestamp}.html`;

  const html = await page.content();
  fs.writeFileSync(filename, html);
  console.log(`Saved debug HTML: ${filename}`);

  // Also take a screenshot
  await page.screenshot({ path: `${label}.png`, fullPage: true });
}

// Usage
try {
  const items = await extractItems(page);
} catch (error) {
  await debugPage(page, 'extraction-failed');
  throw error;
}
```

## Step 2: Inspect with DevTools

### Browser DevTools Workflow
1. Launch in headed mode (see above)
2. Press F12 to open DevTools
3. Go to Elements/Inspector tab
4. Use Ctrl+Shift+C to pick element
5. Inspect the target selector
6. Note the HTML structure and classes

### Console Testing
```javascript
// Test selectors in browser console
document.querySelectorAll('[data-item]').length
// → 25

document.querySelector('h1').textContent
// → "Item Title"

document.querySelector('#SetTable tbody tr')
// → <tr>...</tr>
```

### Network Tab
1. Open DevTools Network tab
2. Reproduce the action
3. Look for:
   - Failed requests (red)
   - Slow requests (>5s)
   - API requests that might provide data directly

## Step 3: Identify Failing Selector

### Test Individual Selectors
```typescript
async function testSelector(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector);
    const count = await element.count();
    console.log(`Selector "${selector}" found ${count} elements`);
    return count > 0;
  } catch (error) {
    console.error(`Selector "${selector}" failed:`, error);
    return false;
  }
}

// Test multiple selectors
const selectors = [
  '[data-item]',
  '.item',
  '.item-container',
  'tr.item-row',
  'div[role="listitem"]'
];

for (const selector of selectors) {
  const found = await testSelector(page, selector);
  if (found) {
    console.log(`✓ Use: ${selector}`);
    break;
  }
}
```

### Fallback Selector Strategy
```typescript
async function findElement(
  page: Page,
  selectors: string[]
): Promise<Locator | null> {
  for (const selector of selectors) {
    try {
      const element = page.locator(selector);
      const visible = await element.isVisible().catch(() => false);

      if (visible) {
        console.log(`✓ Found with: ${selector}`);
        return element;
      }
    } catch (error) {
      console.warn(`✗ Failed: ${selector}`);
    }
  }
  console.error('No selector found');
  return null;
}

// Usage
const itemElement = await findElement(page, [
  '[data-testid="item"]',
  '.item-card',
  '.item',
  'article'
]);
```

## Step 4: Common Root Causes

### Issue: Selector Not Found

**Diagnosis:**
```typescript
// Check if element exists but is hidden
const element = page.locator('[data-item]');
const count = await element.count();          // 0?
const visible = await element.isVisible();    // false?
```

**Possible Causes & Fixes:**

1. **Element in iframe**
   ```typescript
   // ❌ Won't work
   const item = page.locator('[data-item]');

   // ✅ Fixed
   const frame = page.frameLocator('iframe#main');
   const item = frame.locator('[data-item]');
   ```

2. **Element in shadow DOM**
   ```typescript
   // ❌ Won't work
   const button = page.locator('custom-element button');

   // ✅ Fixed (use >> piercing selector)
   const button = page.locator('custom-element >> button');
   ```

3. **Element not loaded yet**
   ```typescript
   // ❌ Might race
   const items = page.locator('[data-item]');

   // ✅ Wait first
   await page.waitForSelector('[data-item]', { timeout: 10000 });
   const items = page.locator('[data-item]');
   ```

4. **Wrong page/context**
   ```typescript
   // ❌ Using wrong page variable
   const item = browserPage.locator('[data-item]');

   // ✅ Ensure you're using the right page
   await page.goto(url);
   const item = page.locator('[data-item]');
   ```

5. **Selector syntax error**
   ```typescript
   // ❌ Invalid CSS selector
   page.locator('div[data-id=123]')  // Missing quotes

   // ✅ Correct
   page.locator('div[data-id="123"]')
   page.getByTestId('123')
   ```

### Issue: Empty Data Extraction

**Diagnosis:**
```typescript
// Check what we're actually extracting
const titleElement = page.locator('[data-title]');
const text = await titleElement.textContent();
console.log('Extracted text:', JSON.stringify(text));  // null? empty?

// Try alternative extraction
const htmlContent = await titleElement.innerHTML();
console.log('HTML:', htmlContent);
```

**Possible Causes:**

1. **Text in child element**
   ```typescript
   // ❌ Parent element has no text
   $('[data-item]').text()  // ""

   // ✅ Extract from child
   $('[data-item] [data-title]').text()
   $('[data-item]').find('span').text()
   ```

2. **HTML entities or encoding**
   ```typescript
   // ❌ Raw HTML content
   const html = await element.innerHTML();
   // → "&lt;strong&gt;Bold&lt;/strong&gt;"

   // ✅ Decode to text
   const text = new DOMParser().parseFromString(html, 'text/html').body.textContent;
   ```

3. **Whitespace or special characters**
   ```typescript
   const text = await element.textContent();
   // → "  \n\tItem Title\r\n  "

   // ✅ Normalize
   const clean = text.trim().replace(/\s+/g, ' ');
   // → "Item Title"
   ```

4. **Data in data attribute**
   ```typescript
   // ❌ No text content
   $('[data-item]').text()  // ""

   // ✅ Extract from attribute
   $('[data-item]').data('title')
   $('[data-item]').attr('data-title')
   ```

### Issue: Timeout While Waiting

**Diagnosis:**
```typescript
// Check network activity
page.on('request', req => {
  console.log('Request:', req.url());
});

page.on('response', res => {
  console.log(`Response: ${res.status()} ${res.url()}`);
});

// Check for infinite loops
const timer = setTimeout(() => {
  console.error('TIMEOUT: Waiting for element took too long');
}, 15000);

try {
  await page.waitForSelector('[data-loaded]', { timeout: 10000 });
} finally {
  clearTimeout(timer);
}
```

**Possible Causes:**

1. **Page isn't actually loading content**
   ```typescript
   // ❌ Wrong waitUntil
   await page.goto(url, { waitUntil: 'load' });

   // ✅ Wait for network to be idle
   await page.goto(url, { waitUntil: 'networkidle' });
   ```

2. **Content loads via JavaScript, not network**
   ```typescript
   // ❌ Network idle happens before JS renders
   await page.goto(url, { waitUntil: 'networkidle' });

   // ✅ Wait for specific element
   await page.waitForFunction(() => {
     return document.querySelectorAll('[data-item]').length > 0;
   });
   ```

3. **Selector never appears**
   ```typescript
   // ❌ Waiting for wrong selector
   await page.waitForSelector('[data-loaded-never-appears]');

   // ✅ Check what's actually on page
   await page.evaluate(() => {
     console.log('Page content:', document.body.innerHTML.slice(0, 500));
   });
   ```

4. **Page requires scroll to load more**
   ```typescript
   // ❌ Content below fold not loaded
   await page.waitForSelector('[data-item:nth-child(100)]');

   // ✅ Scroll to load
   await page.evaluate(() => {
     window.scrollTo(0, document.body.scrollHeight);
   });
   await page.waitForLoadState('networkidle');
   ```

## Step 5: HTML Structure Changes

### Detect When Site HTML Changed

**What Changed Matrix:**
```typescript
interface ChangeDetection {
  selector: string;
  oldWorking: boolean;
  newWorking: boolean;
  explanation: string;
}

const changes: ChangeDetection[] = [
  {
    selector: '.item-title',
    oldWorking: true,
    newWorking: false,
    explanation: 'Class name changed to .item-header'
  },
  {
    selector: 'a[href*="SongStats"]',
    oldWorking: true,
    newWorking: false,
    explanation: 'Links now use onclick instead of href'
  },
  {
    selector: '[bgcolor="#006666"]',
    oldWorking: true,
    newWorking: false,
    explanation: 'Color selector replaced with data-slot="opener"'
  }
];
```

### Record What Works

```typescript
// Keep a selector migration table
const SELECTORS = {
  ITEMS: {
    primary: '[data-item]',
    fallback1: '.item-card',
    fallback2: '.item',
    fallback3: 'article'
  },
  TITLE: {
    primary: '[data-title]',
    fallback1: '.item-name',
    fallback2: 'h3'
  },
  LINK: {
    primary: 'a[data-item-url]',
    fallback1: 'a[href*="/items/"]',
    fallback2: 'a'
  }
};

async function getItemElement(page: Page): Promise<Locator | null> {
  for (const selector of Object.values(SELECTORS.ITEMS)) {
    const el = page.locator(selector).first();
    if ((await el.count()) > 0) return el;
  }
  return null;
}
```

### Compare Old vs. New HTML

```typescript
// Save both for comparison
const oldHtml = fs.readFileSync('debug-working.html', 'utf-8');
const newHtml = await page.content();

// Find differences
function findHtmlDifferences(old: string, fresh: string): void {
  const oldLines = old.split('\n');
  const freshLines = fresh.split('\n');

  // Simple line-by-line comparison
  for (let i = 0; i < Math.min(oldLines.length, freshLines.length); i++) {
    if (oldLines[i] !== freshLines[i]) {
      console.log(`Line ${i} changed:`);
      console.log(`- ${oldLines[i].slice(0, 100)}`);
      console.log(`+ ${freshLines[i].slice(0, 100)}`);
    }
  }
}

findHtmlDifferences(oldHtml, newHtml);
```

## Step 6: Network Request Analysis

### Intercept API Responses
```typescript
const apiResponses: Record<string, any> = {};

page.on('response', async response => {
  if (response.url().includes('/api/')) {
    try {
      const json = await response.json();
      apiResponses[response.url()] = json;
      console.log(`API: ${response.url()}`);
      console.log(JSON.stringify(json, null, 2).slice(0, 500));
    } catch (error) {
      // Response wasn't JSON
    }
  }
});

// After scraping
console.log('All API responses:', Object.keys(apiResponses));
```

### Check Request Failures
```typescript
page.on('requestfailed', request => {
  console.error(`Request failed: ${request.url()}`);
  console.error(`Failure: ${request.failure()?.errorText}`);
});

page.on('response', response => {
  if (response.status() >= 400) {
    console.warn(`HTTP ${response.status()}: ${response.url()}`);
  }
});
```

### Capture HAR (HTTP Archive)
```typescript
// Record all network activity for analysis
const context = await browser.newContext();
await context.routeFromHAR('./recording.har', { url: '*/**' });

const page = await context.newPage();
await page.goto(url);

// Later, analyze the HAR file
const har = JSON.parse(fs.readFileSync('./recording.har', 'utf-8'));
har.log.entries.forEach(entry => {
  console.log(`${entry.request.method} ${entry.request.url}`);
  console.log(`  Status: ${entry.response.status}`);
  console.log(`  Time: ${entry.time}ms`);
});
```

## Step 7: Rate Limiting Issues

### Detect Rate Limiting
```typescript
let statusCodes = new Map<number, number>();

page.on('response', response => {
  const code = response.status();
  statusCodes.set(code, (statusCodes.get(code) || 0) + 1);
});

// After requests
console.log('Status codes:', Object.fromEntries(statusCodes));
// If you see 429 (Too Many Requests), 503 (Service Unavailable),
// or sudden 403 (Forbidden), you're rate limited
```

### Fix Rate Limiting
```typescript
// Increase delays between requests
const originalDelay = 500;  // milliseconds
const rateLimitedDelay = 2000;  // 2 seconds

// Add exponential backoff
async function requestWithBackoff(url: string, attempt = 1): Promise<any> {
  try {
    const delay = originalDelay * Math.pow(2, attempt - 1);
    await new Promise(r => setTimeout(r, delay));
    return await scrapeUrl(url);
  } catch (error) {
    if (attempt < 3) {
      console.warn(`Attempt ${attempt} failed, retrying with longer delay...`);
      return requestWithBackoff(url, attempt + 1);
    }
    throw error;
  }
}
```

## Debugging Checklist

When a scraper fails:

**Selector Issues**
- [ ] Test selector in browser console
- [ ] Check if element is in iframe
- [ ] Check if element is in shadow DOM
- [ ] Verify element is visible (not display:none)
- [ ] Try alternative selectors
- [ ] Look for class/attribute name changes

**Timing Issues**
- [ ] Add explicit wait before extraction
- [ ] Use waitForLoadState('networkidle')
- [ ] Check for JS-rendered content
- [ ] Verify element appears after scroll
- [ ] Monitor network tab for long-running requests

**Data Issues**
- [ ] Check if text is in child element
- [ ] Look for HTML encoding (&nbsp;, &quot;)
- [ ] Verify text isn't obfuscated/hidden
- [ ] Try data attributes instead of text
- [ ] Save and inspect raw HTML

**Network Issues**
- [ ] Check HTTP status codes (look for 429, 503, 403)
- [ ] Look for failed requests (red in Network tab)
- [ ] Check if site blocks headless browsers
- [ ] Verify User-Agent header is set
- [ ] Increase timeout values

**Performance Issues**
- [ ] Check for infinite wait loops
- [ ] Verify rate limiting is working
- [ ] Look for memory leaks (close pages/contexts)
- [ ] Enable resource blocking (images, fonts)
- [ ] Profile with --inspect flag

## Documentation Template

When you fix a scraper, document it:

```markdown
## Issue: [What was broken]

### Symptoms
- [What user observed]

### Root Cause
- [Why it broke]
- [What changed on the site]

### Solution
```typescript
// OLD (broken)
const item = $('[data-item]');

// NEW (fixed)
const item = $('[data-list] [data-item]');
```
```

### Selector Fallbacks
- Primary: [best selector]
- Fallback 1: [alternative 1]
- Fallback 2: [alternative 2]

### Testing
- [x] Tested in headed mode
- [x] Verified in headless mode
- [x] Checked edge cases
```

## Resilience Rating Scale

Rate your scraper's fragility:

- **10/10**: Uses data-testid, semantic roles, robust fallbacks
- **7/10**: Uses class names and IDs, some fallbacks
- **5/10**: Uses structural CSS, minimal error handling
- **2/10**: Uses XPath, fragile position-based selectors
- **0/10**: Hard-coded indexes, no error handling

Aim for 8+/10 resilience.
