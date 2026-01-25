---
name: mcp-browser
description: Browser automation via MCP using Puppeteer/Playwright for scraping, testing, and interaction
version: 1.0.0
mcp-version: "1.0"
sdk: typescript
partner-ready: true
---

# MCP Browser Automation

## Overview

Browser automation MCP servers enable programmatic control of web browsers for scraping, testing, screenshots, and user interaction simulation.

## Architecture

```
┌─────────────────────────────────────┐
│     Browser MCP Server              │
│  ┌───────────────────────────────┐  │
│  │   Browser Pool Manager        │  │
│  │  - Page lifecycle             │  │
│  │  - Resource management        │  │
│  └──────────┬────────────────────┘  │
│  ┌──────────▼────────────────────┐  │
│  │   Automation Operations       │  │
│  │  - Navigate  - Screenshot     │  │
│  │  - Interact  - Extract        │  │
│  └───────────────────────────────┘  │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   Puppeteer/Playwright              │
│         ┌──────────────┐            │
│         │  Browser     │            │
│         └──────────────┘            │
└─────────────────────────────────────┘
```

## Puppeteer-Based Server

```typescript
// src/browser-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer, { Browser, Page } from "puppeteer";
import { z } from "zod";

class BrowserPool {
  private browser: Browser | null = null;
  private pages = new Map<string, Page>();

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
        ],
      });
    }
    return this.browser;
  }

  async createPage(id: string): Promise<Page> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    // Set reasonable defaults
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    );

    this.pages.set(id, page);
    return page;
  }

  getPage(id: string): Page | undefined {
    return this.pages.get(id);
  }

  async closePage(id: string) {
    const page = this.pages.get(id);
    if (page) {
      await page.close();
      this.pages.delete(id);
    }
  }

  async closeAll() {
    for (const page of this.pages.values()) {
      await page.close();
    }
    this.pages.clear();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

const browserPool = new BrowserPool();

const server = new Server(
  {
    name: "browser-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools = [
  {
    name: "navigate",
    description: "Navigate to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        pageId: {
          type: "string",
          description: "Page identifier (creates new if not exists)",
          default: "default",
        },
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
          default: "networkidle2",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "screenshot",
    description: "Take a screenshot of the current page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", default: "default" },
        fullPage: { type: "boolean", default: false },
        selector: { type: "string", description: "CSS selector to screenshot" },
        format: {
          type: "string",
          enum: ["png", "jpeg"],
          default: "png",
        },
      },
    },
  },
  {
    name: "get_content",
    description: "Get page HTML content",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", default: "default" },
      },
    },
  },
  {
    name: "evaluate",
    description: "Execute JavaScript in the page context",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", default: "default" },
        script: { type: "string", description: "JavaScript code to execute" },
      },
      required: ["script"],
    },
  },
  {
    name: "click",
    description: "Click an element",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", default: "default" },
        selector: { type: "string", description: "CSS selector" },
      },
      required: ["selector"],
    },
  },
  {
    name: "type",
    description: "Type text into an input",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", default: "default" },
        selector: { type: "string" },
        text: { type: "string" },
        delay: { type: "number", description: "Delay between keystrokes (ms)" },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "wait_for_selector",
    description: "Wait for an element to appear",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", default: "default" },
        selector: { type: "string" },
        timeout: { type: "number", default: 30000 },
      },
      required: ["selector"],
    },
  },
  {
    name: "extract_data",
    description: "Extract data using selectors",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", default: "default" },
        selectors: {
          type: "object",
          description: "Map of field names to CSS selectors",
        },
      },
      required: ["selectors"],
    },
  },
  {
    name: "fill_form",
    description: "Fill out a form",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", default: "default" },
        fields: {
          type: "object",
          description: "Map of selectors to values",
        },
        submit: { type: "boolean", default: false },
        submitSelector: { type: "string" },
      },
      required: ["fields"],
    },
  },
  {
    name: "close_page",
    description: "Close a browser page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", default: "default" },
      },
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const pageId = (args as any).pageId || "default";

    switch (name) {
      case "navigate": {
        const { url, waitUntil } = args as any;

        let page = browserPool.getPage(pageId);
        if (!page) {
          page = await browserPool.createPage(pageId);
        }

        await page.goto(url, { waitUntil: waitUntil || "networkidle2" });

        return {
          content: [
            {
              type: "text",
              text: `Navigated to ${url}`,
            },
          ],
        };
      }

      case "screenshot": {
        const { fullPage, selector, format } = args as any;
        const page = browserPool.getPage(pageId);

        if (!page) {
          throw new Error(`Page ${pageId} not found`);
        }

        let screenshot: Buffer;

        if (selector) {
          const element = await page.$(selector);
          if (!element) {
            throw new Error(`Element ${selector} not found`);
          }
          screenshot = (await element.screenshot({
            type: format || "png",
          })) as Buffer;
        } else {
          screenshot = (await page.screenshot({
            fullPage: fullPage || false,
            type: format || "png",
          })) as Buffer;
        }

        return {
          content: [
            {
              type: "text",
              text: `Screenshot taken (${screenshot.length} bytes)`,
            },
          ],
        };
      }

      case "get_content": {
        const page = browserPool.getPage(pageId);
        if (!page) {
          throw new Error(`Page ${pageId} not found`);
        }

        const content = await page.content();

        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "evaluate": {
        const { script } = args as any;
        const page = browserPool.getPage(pageId);

        if (!page) {
          throw new Error(`Page ${pageId} not found`);
        }

        const result = await page.evaluate(script);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "click": {
        const { selector } = args as any;
        const page = browserPool.getPage(pageId);

        if (!page) {
          throw new Error(`Page ${pageId} not found`);
        }

        await page.click(selector);

        return {
          content: [
            {
              type: "text",
              text: `Clicked ${selector}`,
            },
          ],
        };
      }

      case "type": {
        const { selector, text, delay } = args as any;
        const page = browserPool.getPage(pageId);

        if (!page) {
          throw new Error(`Page ${pageId} not found`);
        }

        await page.type(selector, text, { delay });

        return {
          content: [
            {
              type: "text",
              text: `Typed "${text}" into ${selector}`,
            },
          ],
        };
      }

      case "wait_for_selector": {
        const { selector, timeout } = args as any;
        const page = browserPool.getPage(pageId);

        if (!page) {
          throw new Error(`Page ${pageId} not found`);
        }

        await page.waitForSelector(selector, {
          timeout: timeout || 30000,
        });

        return {
          content: [
            {
              type: "text",
              text: `Element ${selector} appeared`,
            },
          ],
        };
      }

      case "extract_data": {
        const { selectors } = args as any;
        const page = browserPool.getPage(pageId);

        if (!page) {
          throw new Error(`Page ${pageId} not found`);
        }

        const data: Record<string, any> = {};

        for (const [key, selector] of Object.entries(selectors)) {
          const elements = await page.$$(selector as string);
          if (elements.length === 1) {
            data[key] = await page.evaluate(
              (el) => el.textContent,
              elements[0]
            );
          } else if (elements.length > 1) {
            data[key] = await Promise.all(
              elements.map((el) =>
                page.evaluate((e) => e.textContent, el)
              )
            );
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "fill_form": {
        const { fields, submit, submitSelector } = args as any;
        const page = browserPool.getPage(pageId);

        if (!page) {
          throw new Error(`Page ${pageId} not found`);
        }

        for (const [selector, value] of Object.entries(fields)) {
          await page.type(selector, value as string);
        }

        if (submit && submitSelector) {
          await page.click(submitSelector);
          await page.waitForNavigation();
        }

        return {
          content: [
            {
              type: "text",
              text: "Form filled successfully",
            },
          ],
        };
      }

      case "close_page": {
        await browserPool.closePage(pageId);

        return {
          content: [
            {
              type: "text",
              text: `Page ${pageId} closed`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Browser error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Cleanup on shutdown
process.on("SIGINT", async () => {
  await browserPool.closeAll();
  process.exit(0);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Browser MCP Server running");
}

main();
```

## Playwright Alternative

```typescript
// src/playwright-server.ts
import { chromium, Browser, Page, BrowserContext } from "playwright";

class PlaywrightPool {
  private browser: Browser | null = null;
  private contexts = new Map<string, BrowserContext>();

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox"],
      });
    }
    return this.browser;
  }

  async createContext(id: string): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });

    this.contexts.set(id, context);
    return context;
  }

  getContext(id: string): BrowserContext | undefined {
    return this.contexts.get(id);
  }

  async closeContext(id: string) {
    const context = this.contexts.get(id);
    if (context) {
      await context.close();
      this.contexts.delete(id);
    }
  }

  async closeAll() {
    for (const context of this.contexts.values()) {
      await context.close();
    }
    this.contexts.clear();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
```

## Web Scraping Utilities

```typescript
// src/scraping.ts
import { Page } from "puppeteer";

export class WebScraper {
  constructor(private page: Page) {}

  async extractLinks(selector?: string): Promise<string[]> {
    return await this.page.evaluate((sel) => {
      const links = Array.from(
        document.querySelectorAll(sel || "a[href]")
      );
      return links.map((a) => (a as HTMLAnchorElement).href);
    }, selector);
  }

  async extractImages(selector?: string): Promise<Array<{ src: string; alt: string }>> {
    return await this.page.evaluate((sel) => {
      const images = Array.from(
        document.querySelectorAll(sel || "img[src]")
      );
      return images.map((img) => ({
        src: (img as HTMLImageElement).src,
        alt: (img as HTMLImageElement).alt,
      }));
    }, selector);
  }

  async extractTable(selector: string): Promise<string[][]> {
    return await this.page.evaluate((sel) => {
      const table = document.querySelector(sel) as HTMLTableElement;
      if (!table) return [];

      const rows = Array.from(table.querySelectorAll("tr"));
      return rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td, th"));
        return cells.map((cell) => cell.textContent?.trim() || "");
      });
    }, selector);
  }

  async extractJSON<T = any>(selector: string): Promise<T | null> {
    const text = await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      return element?.textContent;
    }, selector);

    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async extractStructuredData(schema: Record<string, string>): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const [key, selector] of Object.entries(schema)) {
      const element = await this.page.$(selector);
      if (element) {
        result[key] = await this.page.evaluate(
          (el) => el.textContent?.trim(),
          element
        );
      }
    }

    return result;
  }
}
```

## Cookie Management

```typescript
// src/cookies.ts
import { Page, Protocol } from "puppeteer";

export class CookieManager {
  constructor(private page: Page) {}

  async setCookies(cookies: Protocol.Network.CookieParam[]) {
    await this.page.setCookie(...cookies);
  }

  async getCookies(): Promise<Protocol.Network.Cookie[]> {
    return await this.page.cookies();
  }

  async deleteCookies() {
    const cookies = await this.page.cookies();
    await this.page.deleteCookie(...cookies);
  }

  async saveCookies(filePath: string) {
    const cookies = await this.page.cookies();
    const fs = await import("fs/promises");
    await fs.writeFile(filePath, JSON.stringify(cookies, null, 2));
  }

  async loadCookies(filePath: string) {
    const fs = await import("fs/promises");
    const data = await fs.readFile(filePath, "utf-8");
    const cookies = JSON.parse(data);
    await this.page.setCookie(...cookies);
  }
}
```

## Network Interception

```typescript
// src/network.ts
import { Page } from "puppeteer";

export class NetworkInterceptor {
  constructor(private page: Page) {}

  async blockResources(types: string[] = ["image", "stylesheet", "font"]) {
    await this.page.setRequestInterception(true);

    this.page.on("request", (request) => {
      if (types.includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });
  }

  async modifyRequests(
    modifier: (request: any) => { url?: string; headers?: Record<string, string> } | null
  ) {
    await this.page.setRequestInterception(true);

    this.page.on("request", (request) => {
      const overrides = modifier(request);
      if (overrides) {
        request.continue(overrides);
      } else {
        request.continue();
      }
    });
  }

  async captureRequests(): Promise<Array<{ url: string; method: string; status: number }>> {
    const requests: Array<any> = [];

    this.page.on("response", (response) => {
      requests.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
      });
    });

    return requests;
  }
}
```

## PDF Generation

```typescript
// src/pdf.ts
import { Page, PDFOptions } from "puppeteer";

export async function generatePDF(
  page: Page,
  options?: PDFOptions
): Promise<Buffer> {
  return await page.pdf({
    format: "A4",
    printBackground: true,
    ...options,
  });
}

export async function generatePDFFromURL(
  page: Page,
  url: string,
  options?: PDFOptions
): Promise<Buffer> {
  await page.goto(url, { waitUntil: "networkidle0" });
  return await generatePDF(page, options);
}
```

## Testing Utilities

```typescript
// src/testing.ts
import { Page } from "puppeteer";

export class BrowserTester {
  constructor(private page: Page) {}

  async assertElementExists(selector: string): Promise<boolean> {
    const element = await this.page.$(selector);
    return element !== null;
  }

  async assertTextContent(selector: string, expected: string): Promise<boolean> {
    const text = await this.page.$eval(
      selector,
      (el) => el.textContent?.trim()
    );
    return text === expected;
  }

  async assertURLContains(substring: string): Promise<boolean> {
    const url = this.page.url();
    return url.includes(substring);
  }

  async waitForNavigation(
    action: () => Promise<void>,
    timeout = 30000
  ): Promise<void> {
    await Promise.all([
      this.page.waitForNavigation({ timeout }),
      action(),
    ]);
  }

  async measureLoadTime(): Promise<number> {
    const metrics = await this.page.metrics();
    return metrics.TaskDuration || 0;
  }
}
```

## Performance Monitoring

```typescript
// src/performance.ts
import { Page } from "puppeteer";

export class PerformanceMonitor {
  constructor(private page: Page) {}

  async getMetrics() {
    return await this.page.metrics();
  }

  async getPerformanceTiming() {
    return await this.page.evaluate(() => {
      const timing = performance.timing;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        domInteractive: timing.domInteractive - timing.navigationStart,
        firstPaint: performance.getEntriesByType("paint")[0]?.startTime || 0,
      };
    });
  }

  async captureTrace(name: string) {
    await this.page.tracing.start({
      path: `${name}-trace.json`,
      screenshots: true,
    });
  }

  async stopTrace() {
    await this.page.tracing.stop();
  }
}
```

## Best Practices

1. **Resource Management**: Always close pages and browsers when done
2. **Headless Mode**: Use headless mode in production
3. **Timeouts**: Set reasonable timeouts for all operations
4. **Error Handling**: Handle navigation and selector errors
5. **Network Optimization**: Block unnecessary resources
6. **Memory Management**: Don't keep too many pages open
7. **User Agent**: Set realistic user agents
8. **Rate Limiting**: Respect website rate limits
9. **Screenshots**: Use for debugging and verification
10. **Cookie Management**: Handle sessions properly

## Security Checklist

- [ ] Validate all URLs before navigation
- [ ] Sanitize user input in evaluate()
- [ ] Don't execute untrusted JavaScript
- [ ] Use sandbox mode when possible
- [ ] Implement request filtering
- [ ] Handle authentication securely
- [ ] Clear sensitive data from cookies
- [ ] Monitor resource usage
- [ ] Implement timeout limits
- [ ] Log all operations for audit
