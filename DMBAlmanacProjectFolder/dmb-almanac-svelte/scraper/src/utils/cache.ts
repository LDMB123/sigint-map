import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const CACHE_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../cache");

// Ensure cache directory exists
export function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// Get cached HTML for a URL
export function getCachedHtml(url: string): string | null {
  ensureCacheDir();
  const filename = urlToFilename(url);
  const filepath = join(CACHE_DIR, filename);

  if (existsSync(filepath)) {
    return readFileSync(filepath, "utf-8");
  }
  return null;
}

// Cache HTML for a URL
export function cacheHtml(url: string, html: string): void {
  ensureCacheDir();
  const filename = urlToFilename(url);
  const filepath = join(CACHE_DIR, filename);
  writeFileSync(filepath, html, "utf-8");
}

// Convert URL to safe filename
function urlToFilename(url: string): string {
  return (
    url
      .replace(/https?:\/\//, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 200) + ".html"
  );
}

// Save progress checkpoint
export function saveCheckpoint(name: string, data: unknown): void {
  ensureCacheDir();
  const filepath = join(CACHE_DIR, `checkpoint_${name}.json`);
  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Checkpoint saved: ${name}`);
}

// Load progress checkpoint
export function loadCheckpoint<T>(name: string): T | null {
  ensureCacheDir();
  const filepath = join(CACHE_DIR, `checkpoint_${name}.json`);

  if (existsSync(filepath)) {
    const data = readFileSync(filepath, "utf-8");
    return JSON.parse(data) as T;
  }
  return null;
}
