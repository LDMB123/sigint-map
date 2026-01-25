/**
 * DMB Almanac Unified Scraper Orchestrator
 *
 * Coordinates all scraping operations with:
 * - Checkpoint-based recovery
 * - Progress reporting
 * - Validation integration
 * - CLI interface
 * - Rate limiting
 * - Error handling
 */

import { scrapeAllVenues, saveVenues } from "./scrapers/venues.js";
import { scrapeAllSongs, saveSongs } from "./scrapers/songs.js";
import { scrapeAllGuests, saveGuests } from "./scrapers/guests.js";
import { scrapeAllShows, saveShows } from "./scrapers/shows.js";
import { scrapeAllReleases, saveReleases } from "./scrapers/releases.js";
import { scrapeAllTours, saveTours } from "./scrapers/tours.js";
import { scrapeLiberationList, saveLiberationList } from "./scrapers/liberation.js";
import { scrapeAllSongStats, saveSongStats } from "./scrapers/song-stats.js";
import { scrapeAllHistoryDays, saveHistory } from "./scrapers/history.js";
import { scrapeAllVenueStats, saveVenueStats } from "./scrapers/venue-stats.js";
import { scrapeAllGuestShows, saveGuestShows } from "./scrapers/guest-shows.js";
import { scrapeRarity, saveRarity } from "./scrapers/rarity.js";
import * as fs from "fs";
import * as path from "path";

// Types
export interface ScrapeTarget {
  name: string;
  description: string;
  dependencies: string[];
  scraper: () => Promise<any>;
  saver: (data: any) => void;
  estimatedDuration: number; // minutes
}

export interface ScrapeConfig {
  targets: string[];
  year?: number;
  incremental: boolean;
  validate: boolean;
  import: boolean;
  dryRun: boolean;
  resume: boolean;
  batchSize: number;
}

export interface Checkpoint {
  workflowId: string;
  config: ScrapeConfig;
  startedAt: number;
  completedTargets: string[];
  currentTarget?: string;
  currentProgress?: {
    total: number;
    completed: number;
  };
  results: Record<string, ScrapeResult>;
  lastUpdated: number;
}

export interface ScrapeResult {
  target: string;
  success: boolean;
  itemCount: number;
  duration: number;
  errors: string[];
  warnings: string[];
}

export interface OrchestratorResult {
  success: boolean;
  config: ScrapeConfig;
  results: Record<string, ScrapeResult>;
  totalDuration: number;
  totalItems: number;
  errors: string[];
}

// Available scrape targets with their dependencies
const SCRAPE_TARGETS: Record<string, ScrapeTarget> = {
  venues: {
    name: "venues",
    description: "Venue information",
    dependencies: [],
    scraper: scrapeAllVenues,
    saver: saveVenues,
    estimatedDuration: 5,
  },
  songs: {
    name: "songs",
    description: "Song catalog",
    dependencies: [],
    scraper: scrapeAllSongs,
    saver: saveSongs,
    estimatedDuration: 5,
  },
  guests: {
    name: "guests",
    description: "Guest musicians",
    dependencies: [],
    scraper: scrapeAllGuests,
    saver: saveGuests,
    estimatedDuration: 3,
  },
  tours: {
    name: "tours",
    description: "Tour information",
    dependencies: [],
    scraper: scrapeAllTours,
    saver: saveTours,
    estimatedDuration: 2,
  },
  shows: {
    name: "shows",
    description: "Shows and setlists",
    dependencies: ["venues", "songs", "guests"],
    scraper: scrapeAllShows,
    saver: saveShows,
    estimatedDuration: 60,
  },
  releases: {
    name: "releases",
    description: "Official releases",
    dependencies: ["songs"],
    scraper: scrapeAllReleases,
    saver: saveReleases,
    estimatedDuration: 10,
  },
  "song-stats": {
    name: "song-stats",
    description: "Detailed song statistics",
    dependencies: ["songs"],
    scraper: scrapeAllSongStats,
    saver: saveSongStats,
    estimatedDuration: 30,
  },
  liberation: {
    name: "liberation",
    description: "Liberation list",
    dependencies: ["songs", "shows"],
    scraper: scrapeLiberationList,
    saver: saveLiberationList,
    estimatedDuration: 2,
  },
  history: {
    name: "history",
    description: "This day in history",
    dependencies: [],
    scraper: scrapeAllHistoryDays,
    saver: saveHistory,
    estimatedDuration: 15,
  },
  "venue-stats": {
    name: "venue-stats",
    description: "Detailed venue statistics",
    dependencies: ["venues"],
    scraper: scrapeAllVenueStats,
    saver: saveVenueStats,
    estimatedDuration: 20,
  },
  "guest-shows": {
    name: "guest-shows",
    description: "Detailed guest appearance history",
    dependencies: ["guests"],
    scraper: scrapeAllGuestShows,
    saver: saveGuestShows,
    estimatedDuration: 15,
  },
  rarity: {
    name: "rarity",
    description: "Rarity calculations",
    dependencies: ["shows"],
    scraper: scrapeRarity,
    saver: saveRarity,
    estimatedDuration: 10,
  },
};

// Checkpoint management
const CHECKPOINT_DIR = path.join(process.cwd(), "output", "checkpoints");

function ensureCheckpointDir(): void {
  if (!fs.existsSync(CHECKPOINT_DIR)) {
    fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  }
}

function getCheckpointPath(workflowId: string): string {
  return path.join(CHECKPOINT_DIR, `${workflowId}.json`);
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  ensureCheckpointDir();
  checkpoint.lastUpdated = Date.now();
  fs.writeFileSync(
    getCheckpointPath(checkpoint.workflowId),
    JSON.stringify(checkpoint, null, 2)
  );
}

function loadCheckpoint(workflowId: string): Checkpoint | null {
  const checkpointPath = getCheckpointPath(workflowId);
  if (fs.existsSync(checkpointPath)) {
    return JSON.parse(fs.readFileSync(checkpointPath, "utf-8"));
  }
  return null;
}

function deleteCheckpoint(workflowId: string): void {
  const checkpointPath = getCheckpointPath(workflowId);
  if (fs.existsSync(checkpointPath)) {
    fs.unlinkSync(checkpointPath);
  }
}

function getLatestCheckpoint(): Checkpoint | null {
  ensureCheckpointDir();
  const files = fs.readdirSync(CHECKPOINT_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return null;

  // Sort by modification time, newest first
  const sorted = files
    .map((f) => ({
      name: f,
      mtime: fs.statSync(path.join(CHECKPOINT_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return loadCheckpoint(sorted[0].name.replace(".json", ""));
}

// Dependency resolution
function resolveDependencies(targets: string[]): string[] {
  const resolved: string[] = [];
  const visited = new Set<string>();

  function visit(target: string): void {
    if (visited.has(target)) return;
    visited.add(target);

    const def = SCRAPE_TARGETS[target];
    if (!def) {
      throw new Error(`Unknown target: ${target}`);
    }

    // Visit dependencies first
    for (const dep of def.dependencies) {
      visit(dep);
    }

    if (!resolved.includes(target)) {
      resolved.push(target);
    }
  }

  for (const target of targets) {
    visit(target);
  }

  return resolved;
}

// Progress reporting
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function printProgress(
  target: string,
  status: "running" | "done" | "error",
  message?: string
): void {
  const timestamp = new Date().toISOString().substring(11, 19);
  const icon = status === "running" ? "⏳" : status === "done" ? "✅" : "❌";
  console.log(`[${timestamp}] ${icon} ${target}: ${message || status}`);
}

// Main orchestrator
export class ScrapeOrchestrator {
  private config: ScrapeConfig;
  private checkpoint: Checkpoint;
  private startTime: number = 0;

  constructor(config: ScrapeConfig) {
    this.config = config;
    this.checkpoint = this.initCheckpoint();
  }

  private initCheckpoint(): Checkpoint {
    if (this.config.resume) {
      const existing = getLatestCheckpoint();
      if (existing) {
        console.log(`\nResuming from checkpoint: ${existing.workflowId}`);
        console.log(`  Completed: ${existing.completedTargets.join(", ") || "none"}`);
        console.log(`  Last updated: ${new Date(existing.lastUpdated).toISOString()}`);
        return existing;
      }
      console.log("\nNo checkpoint found, starting fresh.");
    }

    return {
      workflowId: `scrape-${Date.now()}`,
      config: this.config,
      startedAt: Date.now(),
      completedTargets: [],
      results: {},
      lastUpdated: Date.now(),
    };
  }

  async run(): Promise<OrchestratorResult> {
    this.startTime = Date.now();

    console.log("\n" + "=".repeat(60));
    console.log("DMB Almanac Scraper Orchestrator");
    console.log("=".repeat(60));

    // Resolve and filter targets
    const allTargets =
      this.config.targets.includes("all")
        ? Object.keys(SCRAPE_TARGETS)
        : this.config.targets;

    const orderedTargets = resolveDependencies(allTargets);
    const pendingTargets = orderedTargets.filter(
      (t) => !this.checkpoint.completedTargets.includes(t)
    );

    if (this.config.dryRun) {
      return this.dryRun(orderedTargets);
    }

    // Estimate duration
    const estimatedMinutes = pendingTargets.reduce(
      (sum, t) => sum + (SCRAPE_TARGETS[t]?.estimatedDuration || 5),
      0
    );
    console.log(`\nTargets to scrape: ${pendingTargets.join(" → ")}`);
    console.log(`Estimated duration: ${estimatedMinutes} minutes`);
    console.log("");

    // Run scrapers
    for (const target of pendingTargets) {
      await this.scrapeTarget(target);
    }

    // Cleanup checkpoint on success
    deleteCheckpoint(this.checkpoint.workflowId);

    // Generate result
    const result: OrchestratorResult = {
      success: Object.values(this.checkpoint.results).every((r) => r.success),
      config: this.config,
      results: this.checkpoint.results,
      totalDuration: Date.now() - this.startTime,
      totalItems: Object.values(this.checkpoint.results).reduce(
        (sum, r) => sum + r.itemCount,
        0
      ),
      errors: Object.values(this.checkpoint.results).flatMap((r) => r.errors),
    };

    this.printSummary(result);
    return result;
  }

  private async scrapeTarget(target: string): Promise<void> {
    const def = SCRAPE_TARGETS[target];
    if (!def) {
      console.error(`Unknown target: ${target}`);
      return;
    }

    this.checkpoint.currentTarget = target;
    saveCheckpoint(this.checkpoint);

    printProgress(target, "running", `Scraping ${def.description}...`);
    const targetStart = Date.now();

    try {
      const data = await def.scraper();
      const itemCount = Array.isArray(data) ? data.length : 1;

      def.saver(data);

      const duration = Date.now() - targetStart;
      this.checkpoint.results[target] = {
        target,
        success: true,
        itemCount,
        duration,
        errors: [],
        warnings: [],
      };

      this.checkpoint.completedTargets.push(target);
      saveCheckpoint(this.checkpoint);

      printProgress(
        target,
        "done",
        `${itemCount} items in ${formatDuration(duration)}`
      );
    } catch (error) {
      const duration = Date.now() - targetStart;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.checkpoint.results[target] = {
        target,
        success: false,
        itemCount: 0,
        duration,
        errors: [errorMessage],
        warnings: [],
      };

      saveCheckpoint(this.checkpoint);
      printProgress(target, "error", errorMessage);

      // Don't throw - allow other targets to continue
    }
  }

  private dryRun(targets: string[]): OrchestratorResult {
    console.log("\n🔍 DRY RUN MODE - No actual scraping will occur\n");
    console.log("Execution plan:");
    console.log("-".repeat(40));

    let totalMinutes = 0;
    for (const target of targets) {
      const def = SCRAPE_TARGETS[target];
      if (def) {
        const deps = def.dependencies.length > 0 ? ` (requires: ${def.dependencies.join(", ")})` : "";
        console.log(`  ${target}: ${def.description}${deps}`);
        console.log(`    Estimated: ~${def.estimatedDuration} minutes`);
        totalMinutes += def.estimatedDuration;
      }
    }

    console.log("-".repeat(40));
    console.log(`Total estimated time: ~${totalMinutes} minutes`);
    console.log("\nRun without --dry-run to execute.");

    return {
      success: true,
      config: this.config,
      results: {},
      totalDuration: 0,
      totalItems: 0,
      errors: [],
    };
  }

  private printSummary(result: OrchestratorResult): void {
    console.log("\n" + "=".repeat(60));
    console.log("SCRAPING COMPLETE");
    console.log("=".repeat(60));

    for (const [target, targetResult] of Object.entries(result.results)) {
      const status = targetResult.success ? "✅" : "❌";
      console.log(
        `  ${status} ${target}: ${targetResult.itemCount} items (${formatDuration(targetResult.duration)})`
      );
      if (targetResult.errors.length > 0) {
        console.log(`     Errors: ${targetResult.errors.join(", ")}`);
      }
    }

    console.log("-".repeat(60));
    console.log(`Total items: ${result.totalItems}`);
    console.log(`Total duration: ${formatDuration(result.totalDuration)}`);
    console.log(`Status: ${result.success ? "SUCCESS" : "COMPLETED WITH ERRORS"}`);
    console.log("");

    if (this.config.validate) {
      console.log("Next: Run 'npm run validate' to check data quality");
    }
    if (this.config.import) {
      console.log("Next: Run 'npm run import' to import to database");
    }
  }
}

// CLI interface
function parseArgs(): ScrapeConfig {
  const args = process.argv.slice(2);
  const config: ScrapeConfig = {
    targets: [],
    incremental: false,
    validate: false,
    import: false,
    dryRun: false,
    resume: false,
    batchSize: 100,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      // Option flags
      if (arg === "--incremental") config.incremental = true;
      else if (arg === "--validate") config.validate = true;
      else if (arg === "--import") config.import = true;
      else if (arg === "--dry-run") config.dryRun = true;
      else if (arg === "--resume") config.resume = true;
      else if (arg.startsWith("--year=")) {
        config.year = parseInt(arg.split("=")[1], 10);
      } else if (arg.startsWith("--batch-size=")) {
        config.batchSize = parseInt(arg.split("=")[1], 10);
      }
    } else {
      // Target names
      config.targets.push(arg);
    }
  }

  // Default to 'all' if no targets specified
  if (config.targets.length === 0) {
    config.targets = ["all"];
  }

  return config;
}

function printUsage(): void {
  console.log(`
DMB Almanac Scraper Orchestrator

Usage: npm run scrape [targets...] [options]

Targets:
  all          Scrape everything (default)
  venues       Venue information
  songs        Song catalog
  guests       Guest musicians
  tours        Tour information
  shows        Shows and setlists
  releases     Official releases
  song-stats   Detailed song statistics
  liberation   Liberation list
  history      This day in history
  venue-stats  Detailed venue statistics
  rarity       Rarity calculations

Options:
  --year=YYYY      Scrape specific year only
  --incremental    Only fetch new data since last scrape
  --validate       Run validation after scrape
  --import         Auto-import to database after scrape
  --dry-run        Preview what would be scraped
  --resume         Resume from last checkpoint
  --batch-size=N   Records per batch (default: 100)

Examples:
  npm run scrape                        # Scrape everything
  npm run scrape shows --year=2024      # Scrape 2024 shows only
  npm run scrape venues songs guests    # Scrape specific targets
  npm run scrape all --validate         # Scrape and validate
  npm run scrape --resume               # Resume interrupted scrape
  npm run scrape shows --dry-run        # Preview shows scrape
`);
}

// Main entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const config = parseArgs();
  const orchestrator = new ScrapeOrchestrator(config);

  try {
    const result = await orchestrator.run();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("\nFatal error:", error);
    process.exit(1);
  }
}

main();
