/**
 * PWA Screenshot Generator
 *
 * Generates screenshots for the Web App Manifest using Playwright.
 * Screenshots enhance the PWA install prompt UI.
 *
 * Usage:
 *   npx playwright install chromium  # First time only
 *   npx tsx scripts/generate-screenshots.ts
 *
 * Prerequisites:
 *   - App must be running on localhost:5173 (npm run dev)
 *   - Or specify a different URL via SCREENSHOT_URL env var
 */

import { chromium, type Browser, type Page } from 'playwright';
import { mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = join(__dirname, '..', 'static');
const SCREENSHOTS_DIR = join(STATIC_DIR, 'screenshots');

const BASE_URL = process.env.SCREENSHOT_URL || 'http://localhost:5173';

interface ScreenshotConfig {
  name: string;
  path: string;
  width: number;
  height: number;
  formFactor: 'wide' | 'narrow';
}

const SCREENSHOTS: ScreenshotConfig[] = [
  {
    name: 'desktop-home',
    path: '/',
    width: 1920,
    height: 1080,
    formFactor: 'wide',
  },
  {
    name: 'desktop-setlist',
    path: '/shows', // Will navigate to first show
    width: 1920,
    height: 1080,
    formFactor: 'wide',
  },
  {
    name: 'mobile-home',
    path: '/',
    width: 750,
    height: 1334,
    formFactor: 'narrow',
  },
  {
    name: 'mobile-songs',
    path: '/songs',
    width: 750,
    height: 1334,
    formFactor: 'narrow',
  },
];

async function ensureDir(dir: string): Promise<void> {
  try {
    await access(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

async function waitForAppReady(page: Page): Promise<void> {
  // Wait for the app to be fully loaded
  await page.waitForLoadState('networkidle');

  // Wait for any loading indicators to disappear
  try {
    await page.waitForSelector('[data-loading="true"]', { state: 'hidden', timeout: 5000 });
  } catch {
    // No loading indicator found, that's fine
  }

  // Give animations time to settle
  await page.waitForTimeout(1000);
}

async function captureScreenshot(
  browser: Browser,
  config: ScreenshotConfig
): Promise<void> {
  const context = await browser.newContext({
    viewport: { width: config.width, height: config.height },
    deviceScaleFactor: 1,
    colorScheme: 'dark', // Match app theme
  });

  const page = await context.newPage();

  try {
    console.log(`Capturing ${config.name} (${config.width}x${config.height})...`);

    // For setlist screenshot, navigate to shows then click first show
    if (config.name === 'desktop-setlist') {
      await page.goto(`${BASE_URL}/shows`, { waitUntil: 'networkidle' });
      await waitForAppReady(page);

      // Try to click the first show link
      const showLink = page.locator('a[href^="/shows/"]').first();
      if (await showLink.count() > 0) {
        await showLink.click();
        await waitForAppReady(page);
      }
    } else {
      await page.goto(`${BASE_URL}${config.path}`, { waitUntil: 'networkidle' });
      await waitForAppReady(page);
    }

    // Take screenshot
    const screenshotPath = join(SCREENSHOTS_DIR, `${config.name}.png`);
    await page.screenshot({
      path: screenshotPath,
      type: 'png',
    });

    console.log(`  Saved: ${screenshotPath}`);
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  console.log('PWA Screenshot Generator');
  console.log('========================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  // Ensure screenshots directory exists
  await ensureDir(SCREENSHOTS_DIR);

  // Check if app is running
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error(`App returned status ${response.status}`);
    }
  } catch {
    console.error(`Error: Cannot connect to ${BASE_URL}`);
    console.error('Make sure the app is running (npm run dev)');
    process.exit(1);
  }

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    for (const config of SCREENSHOTS) {
      await captureScreenshot(browser, config);
    }

    console.log('');
    console.log('All screenshots generated successfully!');
    console.log('');
    console.log('Screenshots are used in manifest.json for PWA install UI.');
    console.log('Run "npm run build" to include them in the production build.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('Screenshot generation failed:', error);
  process.exit(1);
});
