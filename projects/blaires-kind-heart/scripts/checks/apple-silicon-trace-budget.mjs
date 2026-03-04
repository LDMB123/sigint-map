#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_CONFIG = path.join(ROOT, "config", "apple-silicon-trace-budget.json");
const SUMMARY_PATTERN = /^abc-summary-\d{8}-\d{6}\.csv$/;

function parseArgs(argv) {
  const out = {
    config: DEFAULT_CONFIG,
    candidate: process.env.CANDIDATE_SUMMARY || "",
    baseline: process.env.BASELINE_SUMMARY || "",
    writeBaseline: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") {
      out.config = argv[i + 1] || out.config;
      i += 1;
      continue;
    }
    if (arg === "--candidate") {
      out.candidate = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (arg === "--baseline") {
      out.baseline = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (arg === "--write-baseline") {
      out.writeBaseline = true;
      continue;
    }
  }

  return out;
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, files);
    } else {
      files.push(abs);
    }
  }
  return files;
}

function latestSummaryCsv() {
  const artifactsDir = path.join(ROOT, "artifacts");
  const candidates = walk(artifactsDir)
    .filter((file) => SUMMARY_PATTERN.test(path.basename(file)))
    .map((file) => {
      const stat = fs.statSync(file);
      return { file, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.file || "";
}

function toNumber(value, fallback = Number.NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseCsv(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8").trim();
  if (!raw) {
    throw new Error(`CSV is empty: ${csvPath}`);
  }

  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",");
    if (cols.length < header.length) {
      continue;
    }
    const row = {};
    for (let col = 0; col < header.length; col += 1) {
      row[header[col]] = cols[col];
    }
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error(`CSV has no data rows: ${csvPath}`);
  }

  return rows;
}

function median(values) {
  if (!values.length) {
    return Number.NaN;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function summarize(rows) {
  const numeric = rows.map((row) => ({
    anim_duration: toNumber(row.anim_duration),
    metal_duration: toNumber(row.metal_duration),
    hitches_gpu: toNumber(row.hitches_gpu),
    metal_gpu_performance_state_intervals: toNumber(row.metal_gpu_performance_state_intervals),
    metal_command_buffer_error: toNumber(row.metal_command_buffer_error, 0),
    anim_potential_hangs: toNumber(row.anim_potential_hangs, 0),
    metal_potential_hangs: toNumber(row.metal_potential_hangs, 0),
  }));

  const normalizedHitches = numeric
    .filter((row) => row.anim_duration > 0)
    .map((row) => row.hitches_gpu / row.anim_duration);
  const normalizedGpuPressure = numeric
    .filter((row) => row.metal_duration > 0)
    .map((row) => row.metal_gpu_performance_state_intervals / row.metal_duration);

  return {
    row_count: rows.length,
    medians: {
      anim_duration_seconds: median(numeric.map((row) => row.anim_duration)),
      metal_duration_seconds: median(numeric.map((row) => row.metal_duration)),
      hitches_gpu: median(numeric.map((row) => row.hitches_gpu)),
      metal_gpu_performance_state_intervals: median(
        numeric.map((row) => row.metal_gpu_performance_state_intervals),
      ),
      hitches_gpu_per_anim_second: median(normalizedHitches),
      gpu_perf_state_intervals_per_metal_second: median(normalizedGpuPressure),
      metal_command_buffer_error: median(numeric.map((row) => row.metal_command_buffer_error)),
      anim_potential_hangs: median(numeric.map((row) => row.anim_potential_hangs)),
      metal_potential_hangs: median(numeric.map((row) => row.metal_potential_hangs)),
    },
    maxima: {
      metal_command_buffer_error: Math.max(...numeric.map((row) => row.metal_command_buffer_error)),
      anim_potential_hangs: Math.max(...numeric.map((row) => row.anim_potential_hangs)),
      metal_potential_hangs: Math.max(...numeric.map((row) => row.metal_potential_hangs)),
    },
  };
}

function reductionPct(baseline, candidate) {
  if (!Number.isFinite(baseline) || baseline <= 0 || !Number.isFinite(candidate)) {
    return Number.NaN;
  }
  return ((baseline - candidate) / baseline) * 100;
}

function fmt(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = path.resolve(args.config);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config: ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const candidatePath = args.candidate
    ? path.resolve(args.candidate)
    : latestSummaryCsv();
  if (!candidatePath || !fs.existsSync(candidatePath)) {
    throw new Error(
      "Could not resolve candidate summary CSV. Pass --candidate <path> or set CANDIDATE_SUMMARY.",
    );
  }

  const baselinePath = args.baseline ? path.resolve(args.baseline) : "";
  const baselineRows =
    baselinePath && fs.existsSync(baselinePath) ? parseCsv(baselinePath) : null;
  const candidateRows = parseCsv(candidatePath);

  const candidateSummary = summarize(candidateRows);
  const baselineSummary = baselineRows
    ? summarize(baselineRows)
    : {
        medians: config?.baseline?.medians || {},
        maxima: {
          metal_command_buffer_error: toNumber(config?.baseline?.medians?.metal_command_buffer_error, 0),
          anim_potential_hangs: toNumber(config?.baseline?.medians?.anim_potential_hangs, 0),
          metal_potential_hangs: toNumber(config?.baseline?.medians?.metal_potential_hangs, 0),
        },
      };

  if (args.writeBaseline) {
    const sourceSummary = baselineRows ? baselineSummary : candidateSummary;
    config.baseline = {
      captured_at: new Date().toISOString(),
      summary_csv: path.relative(ROOT, baselineRows ? baselinePath : candidatePath).replaceAll("\\", "/"),
      medians: {
        anim_duration_seconds: Number(fmt(sourceSummary.medians.anim_duration_seconds, 6)),
        metal_duration_seconds: Number(fmt(sourceSummary.medians.metal_duration_seconds, 6)),
        hitches_gpu: Number(fmt(sourceSummary.medians.hitches_gpu, 6)),
        metal_gpu_performance_state_intervals: Number(
          fmt(sourceSummary.medians.metal_gpu_performance_state_intervals, 6),
        ),
        hitches_gpu_per_anim_second: Number(
          fmt(sourceSummary.medians.hitches_gpu_per_anim_second, 6),
        ),
        gpu_perf_state_intervals_per_metal_second: Number(
          fmt(sourceSummary.medians.gpu_perf_state_intervals_per_metal_second, 6),
        ),
        metal_command_buffer_error: Number(fmt(sourceSummary.medians.metal_command_buffer_error, 6)),
        anim_potential_hangs: Number(fmt(sourceSummary.medians.anim_potential_hangs, 6)),
        metal_potential_hangs: Number(fmt(sourceSummary.medians.metal_potential_hangs, 6)),
      },
    };
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    console.log(`[apple-silicon-trace-budget] baseline updated: ${path.relative(ROOT, configPath)}`);
    return;
  }

  const baselineNormHitches = toNumber(baselineSummary.medians.hitches_gpu_per_anim_second);
  const baselineNormGpuPressure = toNumber(
    baselineSummary.medians.gpu_perf_state_intervals_per_metal_second,
  );
  const candidateNormHitches = toNumber(candidateSummary.medians.hitches_gpu_per_anim_second);
  const candidateNormGpuPressure = toNumber(
    candidateSummary.medians.gpu_perf_state_intervals_per_metal_second,
  );

  const hitchReduction = reductionPct(baselineNormHitches, candidateNormHitches);
  const gpuReduction = reductionPct(baselineNormGpuPressure, candidateNormGpuPressure);

  const targets = config.targets || {};
  const hitchTarget = toNumber(targets.normalized_hitches_reduction_pct, 30);
  const gpuTarget = toNumber(targets.normalized_gpu_pressure_reduction_pct, 30);
  const maxMetalError = toNumber(targets.max_metal_command_buffer_error, 0);
  const maxAnimHangs = toNumber(targets.max_anim_potential_hangs, 0);
  const maxMetalHangs = toNumber(targets.max_metal_potential_hangs, 0);

  const checks = [
    {
      name: "Normalized hitch pressure reduction",
      actual: hitchReduction,
      target: hitchTarget,
      pass: Number.isFinite(hitchReduction) && hitchReduction >= hitchTarget,
      units: "%",
    },
    {
      name: "Normalized GPU pressure reduction",
      actual: gpuReduction,
      target: gpuTarget,
      pass: Number.isFinite(gpuReduction) && gpuReduction >= gpuTarget,
      units: "%",
    },
    {
      name: "metal_command_buffer_error max",
      actual: candidateSummary.maxima.metal_command_buffer_error,
      target: maxMetalError,
      pass: candidateSummary.maxima.metal_command_buffer_error <= maxMetalError,
      units: "count",
    },
    {
      name: "anim_potential_hangs max",
      actual: candidateSummary.maxima.anim_potential_hangs,
      target: maxAnimHangs,
      pass: candidateSummary.maxima.anim_potential_hangs <= maxAnimHangs,
      units: "count",
    },
    {
      name: "metal_potential_hangs max",
      actual: candidateSummary.maxima.metal_potential_hangs,
      target: maxMetalHangs,
      pass: candidateSummary.maxima.metal_potential_hangs <= maxMetalHangs,
      units: "count",
    },
  ];

  console.log("[apple-silicon-trace-budget] baseline:", baselinePath || configPath);
  console.log("[apple-silicon-trace-budget] candidate:", candidatePath);
  console.log("[apple-silicon-trace-budget] candidate rows:", candidateSummary.row_count);
  console.log(
    `[apple-silicon-trace-budget] normalized hitches baseline=${fmt(
      baselineNormHitches,
      6,
    )} candidate=${fmt(candidateNormHitches, 6)}`,
  );
  console.log(
    `[apple-silicon-trace-budget] normalized gpu baseline=${fmt(
      baselineNormGpuPressure,
      6,
    )} candidate=${fmt(candidateNormGpuPressure, 6)}`,
  );

  for (const check of checks) {
    const relation = check.units === "%" ? ">=" : "<=";
    console.log(
      `- ${check.pass ? "PASS" : "FAIL"} ${check.name}: actual=${fmt(check.actual, 3)}${check.units} ${relation} target=${fmt(check.target, 3)}${check.units}`,
    );
  }

  const allPass = checks.every((check) => check.pass);
  if (!allPass) {
    process.exitCode = 1;
    throw new Error("Apple Silicon trace budget check failed");
  }

  console.log("[apple-silicon-trace-budget] PASS");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[apple-silicon-trace-budget] FAIL: ${message}`);
  process.exit(1);
}
