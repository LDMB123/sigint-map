# Scraping Debugging Reference

## Enable Headed Mode
```typescript
const browser = await chromium.launch({
  headless: false,
  slowMo: 500
});
```

## Save HTML Snapshot
```typescript
async function debugPage(page, label) {
  const html = await page.content();
  fs.writeFileSync(`debug-${label}.html`, html);
  await page.screenshot({ path: `${label}.png`, fullPage: true });
}
```

## Test Individual Selectors
```typescript
async function testSelector(page, selector) {
  const count = await page.locator(selector).count();
  console.log(`"${selector}" found ${count} elements`);
  return count > 0;
}
```

## Fallback Selector Strategy
```typescript
async function findElement(page, selectors) {
  for (const sel of selectors) {
    const el = page.locator(sel);
    if (await el.isVisible().catch(() => false)) return el;
  }
  return null;
}
```

## Network Interception
```typescript
page.on('response', async response => {
  if (response.url().includes('/api/')) {
    const json = await response.json().catch(() => null);
    if (json) console.log(`API: ${response.url()}`, json);
  }
});
page.on('requestfailed', req => {
  console.error(`Failed: ${req.url()} - ${req.failure()?.errorText}`);
});
```

## Rate Limiting Detection
```typescript
page.on('response', res => {
  if (res.status() === 429 || res.status() === 503) {
    console.warn(`Rate limited: ${res.status()} ${res.url()}`);
  }
});
```

## Exponential Backoff
```typescript
async function requestWithBackoff(url, attempt = 1) {
  const delay = 500 * Math.pow(2, attempt - 1);
  await new Promise(r => setTimeout(r, delay));
  try { return await scrapeUrl(url); }
  catch (e) {
    if (attempt < 3) return requestWithBackoff(url, attempt + 1);
    throw e;
  }
}
```
