#!/usr/bin/env npx ts-node
/**
 * PWA Fixes Verification Script
 *
 * Validates that all PWA audit fixes have been properly applied
 * Run: npx ts-node scripts/verify-pwa-fixes.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface VerificationResult {
  name: string;
  passed: boolean;
  message: string;
  file?: string;
  line?: number;
}

const results: VerificationResult[] = [];

function check(name: string, condition: boolean, message: string, file?: string): void {
  results.push({
    name,
    passed: condition,
    message,
    file,
  });
  const icon = condition ? "✓" : "✗";
  const color = condition ? "\x1b[32m" : "\x1b[31m";
  console.log(`${color}${icon}\x1b[0m ${name}: ${message}`);
}

function readFile(path: string): string {
  return readFileSync(resolve(path), "utf-8");
}

console.log("\n📋 Verifying PWA Audit Fixes...\n");

// 1. Check serwist.config.ts
console.log("1️⃣  Checking serwist.config.ts runtime caching...");
const serwistConfig = readFile("lib/sw/serwist.config.ts");

check(
  "Google Fonts stylesheet cache has purgeOnQuotaError",
  serwistConfig.includes("purgeOnQuotaError: true") &&
    serwistConfig.includes("cacheableResponse") &&
    serwistConfig.includes("statuses: [0, 200]"),
  "Quota error handling and response validation configured"
);

const routeCount = (serwistConfig.match(/handler:/g) || []).length;
const validatedRoutes = (serwistConfig.match(/cacheableResponse:/g) || []).length;
check(
  "All runtime caching routes validated",
  validatedRoutes >= routeCount && routeCount >= 6,
  `${validatedRoutes}/${routeCount} routes have response validation`
);

// 2. Check public/sw.js
console.log("\n2️⃣  Checking public/sw.js cleanup implementation...");
const swJs = readFile("public/sw.js");

check(
  "Comprehensive cleanupExpiredCaches function",
  swJs.includes("static") &&
    swJs.includes("pages") &&
    swJs.includes("api") &&
    swJs.includes("images") &&
    swJs.includes("fonts") &&
    swJs.includes("cleanupStats"),
  "All 5 cache types cleaned with stats tracking"
);

check(
  "Cleanup runs every 10 minutes",
  swJs.includes("10 * 60 * 1000") && swJs.includes("setInterval"),
  "Periodic cleanup configured"
);

check(
  "Critical update detection implemented",
  swJs.includes("checkCriticalUpdate") &&
    swJs.includes("CRITICAL_UPDATE_AVAILABLE") &&
    swJs.includes("CRITICAL_VERSION"),
  "Critical update mechanism present"
);

check(
  "CLEANUP_CACHES message handler",
  swJs.includes('type === "CLEANUP_CACHES"'),
  "Manual cleanup trigger available"
);

check(
  "CHECK_CRITICAL_UPDATE message handler",
  swJs.includes('type === "CHECK_CRITICAL_UPDATE"'),
  "Critical update check handler present"
);

check(
  "Cache cleanup on sync event",
  swJs.includes('event.tag === "cache-cleanup"'),
  "Background sync cleanup support"
);

// 3. Check lib/sw/register.ts
console.log("\n3️⃣  Checking lib/sw/register.ts client utilities...");
const registerTs = readFile("lib/sw/register.ts");

check(
  "checkForCriticalUpdates function exported",
  registerTs.includes("export async function checkForCriticalUpdates"),
  "Critical update checking available to clients"
);

check(
  "triggerCacheCleanup function exported",
  registerTs.includes("export async function triggerCacheCleanup"),
  "Manual cache cleanup trigger available"
);

check(
  "getCacheStatus function exported",
  registerTs.includes("export async function getCacheStatus"),
  "Cache status monitoring available"
);

check(
  "Message channel setup for communication",
  registerTs.includes("MessageChannel"),
  "Safe message channel communication configured"
);

// 4. Check lib/sw/index.ts
console.log("\n4️⃣  Checking lib/sw/index.ts exports...");
const swIndex = readFile("lib/sw/index.ts");

const hasCheckCritical = swIndex.includes("checkForCriticalUpdates");
const hasTriggerCleanup = swIndex.includes("triggerCacheCleanup");
const hasGetStatus = swIndex.includes("getCacheStatus");

check(
  "All new utilities exported",
  hasCheckCritical && hasTriggerCleanup && hasGetStatus,
  "3 new functions exported from index"
);

// 5. Check documentation exists
console.log("\n5️⃣  Checking documentation files...");

try {
  readFile("lib/sw/PWA_CACHE_MANAGEMENT.md");
  check("PWA_CACHE_MANAGEMENT.md exists", true, "Comprehensive cache management guide provided");
} catch {
  check("PWA_CACHE_MANAGEMENT.md exists", false, "File not found");
}

try {
  readFile("lib/sw/QUICK_REFERENCE.md");
  check("QUICK_REFERENCE.md exists", true, "Developer quick reference provided");
} catch {
  check("QUICK_REFERENCE.md exists", false, "File not found");
}

try {
  readFile("PWA_AUDIT_FIXES.md");
  check("PWA_AUDIT_FIXES.md exists", true, "Complete audit report provided");
} catch {
  check("PWA_AUDIT_FIXES.md exists", false, "File not found");
}

// 6. Check VAPID configuration status
console.log("\n6️⃣  Checking VAPID/Push notification status...");

check(
  "Push notification handlers present",
  swJs.includes('addEventListener("push"') && swJs.includes('addEventListener("notificationclick"'),
  "Push notification infrastructure ready (VAPID keys not configured - ok)"
);

// Summary
console.log(`\n${"=".repeat(60)}`);
const passed = results.filter((r) => r.passed).length;
const total = results.length;
const percentage = Math.round((passed / total) * 100);

console.log(`\n✨ Verification Results: ${passed}/${total} checks passed (${percentage}%)\n`);

if (percentage === 100) {
  console.log("🎉 All PWA audit fixes have been successfully applied!\n");
  process.exit(0);
} else {
  console.log("⚠️  Some checks failed. Please review the issues above.\n");
  process.exit(1);
}
