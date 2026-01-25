import { chromium, Browser, Page } from "playwright";
import PQueue from "p-queue";
import { join, dirname } from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { randomDelay } from "../utils/rate-limit.js";
import { loadCheckpoint, saveCheckpoint } from "../utils/cache.js";

export interface ScraperConfig {
    name: string;
    baseUrl: string;
    concurrency?: number;
    intervalCap?: number;
    interval?: number;
    outputDir?: string;
}

export abstract class BaseScraper<T> {
    protected browser: Browser | null = null;
    protected page: Page | null = null;
    protected queue: PQueue;
    protected config: ScraperConfig;
    protected outputDir: string;

    constructor(config: ScraperConfig) {
        this.config = config;
        this.outputDir = config.outputDir || join(dirname(import.meta.url).replace("file://", ""), "../../output");

        // Ensure output directory exists
        if (!existsSync(this.outputDir)) {
            mkdirSync(this.outputDir, { recursive: true });
        }

        this.queue = new PQueue({
            concurrency: config.concurrency || 2,
            intervalCap: config.intervalCap || 5,
            interval: config.interval || 10000,
        });
    }

    protected async setup(): Promise<void> {
        console.log(`[${this.config.name}] Starting scraper...`);
        this.browser = await chromium.launch({ headless: true });
        this.page = await this.browser.newPage();

        await this.page.setExtraHTTPHeaders({
            "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
        });
    }

    protected async teardown(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
        console.log(`[${this.config.name}] Scraper finished.`);
    }

    protected loadCheckpoint<D>(key: string): D | null {
        return loadCheckpoint<D>(key);
    }

    protected saveCheckpoint<D>(key: string, data: D): void {
        saveCheckpoint(key, data);
    }

    protected saveOutput(data: T[]): void {
        const output = {
            scrapedAt: new Date().toISOString(),
            source: this.config.baseUrl,
            totalItems: data.length,
            [this.config.name]: data,
        };

        const filepath = join(this.outputDir, `${this.config.name}.json`);
        writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
        console.log(`[${this.config.name}] Saved ${data.length} items to ${filepath}`);
    }

    protected async withRateLimit<R>(fn: () => Promise<R>): Promise<R> {
        return this.queue.add(async () => {
            const result = await fn();
            await randomDelay(1000, 3000);
            return result;
        }) as Promise<R>;
    }

    // Abstract method to be implemented by concrete scrapers
    abstract scrape(): Promise<T[]>;

    // Public method to run the scraper
    public async run(): Promise<T[]> {
        try {
            await this.setup();
            const results = await this.scrape();
            this.saveOutput(results);
            return results;
        } catch (error) {
            console.error(`[${this.config.name}] Scraper failed:`, error);
            throw error;
        } finally {
            await this.teardown();
        }
    }
}
