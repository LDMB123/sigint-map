#!/usr/bin/env node

import fs from "node:fs";

const manifestPath = ".lighthouseci/manifest.json";

function formatPercent(score) {
  if (!Number.isFinite(score)) {
    return "n/a";
  }
  return `${Math.round(score * 100)}`;
}

function formatMs(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return `${Math.round(value)} ms`;
}

function formatCls(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return value.toFixed(3);
}

function avg(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) {
    return Number.NaN;
  }
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

if (!fs.existsSync(manifestPath)) {
  console.log("### Lighthouse CI");
  console.log("");
  console.log("No Lighthouse manifest found (`.lighthouseci/manifest.json`).");
  process.exit(0);
}

let runs;
try {
  runs = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  console.log("### Lighthouse CI");
  console.log("");
  console.log(`Could not parse Lighthouse manifest: ${error.message}`);
  process.exit(0);
}

if (!Array.isArray(runs) || runs.length === 0) {
  console.log("### Lighthouse CI");
  console.log("");
  console.log("Manifest exists but contains no Lighthouse runs.");
  process.exit(0);
}

const performance = avg(runs.map((run) => run?.summary?.performance));
const accessibility = avg(runs.map((run) => run?.summary?.accessibility));
const bestPractices = avg(runs.map((run) => run?.summary?.["best-practices"]));
const seo = avg(runs.map((run) => run?.summary?.seo));
const pwa = avg(runs.map((run) => run?.summary?.pwa));

console.log("### Lighthouse CI");
console.log("");
console.log("| Category | Score |");
console.log("| --- | ---: |");
console.log(`| Performance | ${formatPercent(performance)} |`);
console.log(`| Accessibility | ${formatPercent(accessibility)} |`);
console.log(`| Best Practices | ${formatPercent(bestPractices)} |`);
console.log(`| SEO | ${formatPercent(seo)} |`);
console.log(`| PWA | ${formatPercent(pwa)} |`);

console.log("");
console.log("| URL | LCP | CLS | TBT |");
console.log("| --- | ---: | ---: | ---: |");

for (const run of runs) {
  let report;
  try {
    report = JSON.parse(fs.readFileSync(run.jsonPath, "utf8"));
  } catch {
    console.log(`| ${run.url ?? "n/a"} | n/a | n/a | n/a |`);
    continue;
  }

  const lcp = report?.audits?.["largest-contentful-paint"]?.numericValue;
  const cls = report?.audits?.["cumulative-layout-shift"]?.numericValue;
  const tbt = report?.audits?.["total-blocking-time"]?.numericValue;
  console.log(`| ${run.url ?? "n/a"} | ${formatMs(lcp)} | ${formatCls(cls)} | ${formatMs(tbt)} |`);
}
