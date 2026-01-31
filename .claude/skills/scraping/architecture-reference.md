# Scraping Architecture Reference

## Playwright Scraper Architecture

### Page Object Pattern
```typescript
class ShowPage {
  constructor(private page: Page) {}

  async navigate(url: string) {
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async getSetlist() {
    return this.page.locator('#SetTable tbody tr').allTextContents();
  }

  async getSongLinks() {
    return this.page.locator('a[href*="SongStats"]').all();
  }
}
```

### Data Extraction Pipeline
1. Navigate to page
2. Wait for content (networkidle or specific selector)
3. Extract structured data via locators
4. Validate extracted data against schema
5. Transform to normalized format
6. Store in database or output file

### Error Recovery
- Retry failed pages up to 3 times with backoff
- Screenshot on failure for debugging
- Continue processing remaining pages on individual failure
- Log all errors with page URL and selector context

### Browser Context Management
- Use single browser, multiple contexts for isolation
- Close contexts after page group completion
- Set viewport, user agent, and locale per context
- Block unnecessary resources (images, fonts) for speed
