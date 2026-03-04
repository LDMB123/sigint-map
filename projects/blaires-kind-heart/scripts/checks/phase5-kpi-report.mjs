#!/usr/bin/env node

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const RUST_DIR = path.join(ROOT_DIR, "rust");
const CONFIG_DIR = path.join(ROOT_DIR, "config");
const REPORTS_DIR = path.join(ROOT_DIR, "scripts", "reports");

const DOMAIN_CONFIG_PATH = path.join(CONFIG_DIR, "domain-modules.json");
const TAXONOMY_PATH = path.join(CONFIG_DIR, "skill-taxonomy.json");
const BASELINE_PATH = path.join(CONFIG_DIR, "phase5-kpi-baseline.json");

const DEFAULT_WINDOW_DAYS = 14;
const DEFAULT_MIN_ACTS = 20;
const DEFAULT_GIT_SINCE = "8 weeks ago";
const DEFAULT_MAX_COMMITS = 120;

function parseArgs(argv) {
  const args = {
    windowDays: DEFAULT_WINDOW_DAYS,
    minActs: DEFAULT_MIN_ACTS,
    since: DEFAULT_GIT_SINCE,
    maxCommits: DEFAULT_MAX_COMMITS,
    writeBaseline: false,
    enforceTargets: false,
    snapshotPath: null,
    reportPath: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--write-baseline") {
      args.writeBaseline = true;
      continue;
    }
    if (arg === "--enforce-targets") {
      args.enforceTargets = true;
      continue;
    }
    if (arg === "--snapshot") {
      args.snapshotPath = argv[i + 1] ? path.resolve(ROOT_DIR, argv[i + 1]) : null;
      i += 1;
      continue;
    }
    if (arg === "--report") {
      args.reportPath = argv[i + 1] ? path.resolve(ROOT_DIR, argv[i + 1]) : null;
      i += 1;
      continue;
    }
    if (arg === "--window-days") {
      args.windowDays = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }
    if (arg === "--min-acts") {
      args.minActs = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }
    if (arg === "--since") {
      args.since = argv[i + 1] || DEFAULT_GIT_SINCE;
      i += 1;
      continue;
    }
    if (arg === "--max-commits") {
      args.maxCommits = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isFinite(args.windowDays) || args.windowDays <= 0) {
    throw new Error("--window-days must be a positive integer");
  }
  if (!Number.isFinite(args.minActs) || args.minActs <= 0) {
    throw new Error("--min-acts must be a positive integer");
  }
  if (!Number.isFinite(args.maxCommits) || args.maxCommits <= 0) {
    throw new Error("--max-commits must be a positive integer");
  }

  return args;
}

function printHelp() {
  console.log(`Phase 5 KPI reporter

Usage:
  node scripts/checks/phase5-kpi-report.mjs [options]

Options:
  --snapshot <path>       Analyze product KPI from exported snapshot JSON
  --write-baseline        Persist current decoupling metrics to config/phase5-kpi-baseline.json
  --enforce-targets       Exit non-zero when baseline comparison targets fail
  --window-days <n>       Rolling window for product KPI (default: ${DEFAULT_WINDOW_DAYS})
  --min-acts <n>          Minimum acts for reflection target evaluation (default: ${DEFAULT_MIN_ACTS})
  --since <git spec>      Git history window for commit proxy metrics (default: "${DEFAULT_GIT_SINCE}")
  --max-commits <n>       Maximum commits sampled for commit proxy metrics (default: ${DEFAULT_MAX_COMMITS})
  --report <path>         Write markdown report to a custom path
`);
}

function runGit(command) {
  try {
    return execSync(command, {
      cwd: ROOT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function maybeReadJson(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function walkRustFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkRustFiles(full);
      out.push(...nested);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".rs")) {
      out.push(full);
    }
  }
  return out;
}

function moduleFromRustFile(filePath) {
  const rel = path.relative(RUST_DIR, filePath).replaceAll("\\", "/");
  const stem = rel.replace(/\.rs$/u, "");
  return stem.split("/")[0];
}

function parseImportModule(token) {
  let clean = token.trim();
  if (!clean) return null;
  clean = clean.replaceAll("{", "").replaceAll("}", "");
  if (!clean) return null;
  if (clean.includes(" as ")) {
    clean = clean.split(" as ")[0].trim();
  }
  if (clean === "self" || clean.startsWith("self::")) return null;
  if (clean === "super" || clean.startsWith("super::")) return null;
  const module = clean.split("::")[0].trim().replace(/^r#/u, "");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(module)) return null;
  return module;
}

function extractImportedModules(source) {
  const modules = [];
  const matches = source.matchAll(/^\s*use\s+crate::([^;]+);/gmu);
  for (const match of matches) {
    const clause = match[1].replace(/\s+/gu, " ").trim();
    if (!clause) continue;
    if (clause.startsWith("{")) {
      const inner = clause.replace(/^\{/u, "").replace(/\}$/u, "");
      for (const raw of inner.split(",")) {
        const parsed = parseImportModule(raw);
        if (parsed) modules.push(parsed);
      }
      continue;
    }
    const parsed = parseImportModule(clause);
    if (parsed) modules.push(parsed);
  }
  return modules;
}

function detectCycles(graph, domains) {
  const visited = new Set();
  const stack = [];
  const inStack = new Set();
  const cycles = [];
  const seenCycleKeys = new Set();

  function visit(node) {
    visited.add(node);
    stack.push(node);
    inStack.add(node);
    const neighbors = graph.get(node) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visit(next);
        continue;
      }
      if (!inStack.has(next)) continue;
      const idx = stack.lastIndexOf(next);
      if (idx < 0) continue;
      const cycle = stack.slice(idx).concat(next);
      const key = canonicalizeCycle(cycle);
      if (!seenCycleKeys.has(key)) {
        seenCycleKeys.add(key);
        cycles.push(cycle);
      }
    }
    stack.pop();
    inStack.delete(node);
  }

  for (const domain of domains) {
    if (!visited.has(domain)) {
      visit(domain);
    }
  }
  return cycles;
}

function canonicalizeCycle(cycle) {
  if (cycle.length < 2) return cycle.join("->");
  const core = cycle.slice(0, -1);
  let best = null;
  for (let i = 0; i < core.length; i += 1) {
    const rotated = core.slice(i).concat(core.slice(0, i));
    const key = rotated.concat(rotated[0]).join("->");
    if (best === null || key < best) best = key;
  }
  return best || cycle.join("->");
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function relativePath(absPath) {
  return path.relative(ROOT_DIR, absPath).replaceAll("\\", "/");
}

function domainForRepoFile(filePath, domainByModule) {
  const clean = filePath.replaceAll("\\", "/");
  if (!clean.startsWith("rust/")) return "infra";
  const rel = clean.slice("rust/".length);
  const module = rel.split("/")[0].replace(/\.rs$/u, "");
  return domainByModule.get(module) || "infra";
}

function toMillis(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    if (/^\d+$/u.test(value)) {
      const asNum = Number(value);
      if (Number.isFinite(asNum)) return asNum;
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function buildProductMetrics(snapshot, taxonomy, windowDays, minActs) {
  const tables = snapshot?.tables || snapshot?.exportPayload?.tables;
  if (!tables || !Array.isArray(tables.kind_acts)) {
    throw new Error("snapshot JSON must contain tables.kind_acts[] or exportPayload.tables.kind_acts[]");
  }

  const canonicalSkills = Array.isArray(taxonomy?.canonical_skills)
    ? taxonomy.canonical_skills.map((s) => String(s.id))
    : [];
  const aliases = taxonomy?.aliases && typeof taxonomy.aliases === "object" ? taxonomy.aliases : {};
  const canonicalSet = new Set(canonicalSkills);

  const normalizedActs = tables.kind_acts
    .map((row) => ({
      ...row,
      created_ms: toMillis(row.created_at),
    }))
    .filter((row) => row.created_ms !== null);

  if (normalizedActs.length === 0) {
    return {
      snapshot_total_acts: 0,
      window_days: windowDays,
      window_total_acts: 0,
      reflection_completion_rate_pct: null,
      reflection_target_pct: 55,
      reflection_target_met: null,
      skill_balance_ratio: null,
      skill_balance_target: 0.65,
      skill_balance_target_met: null,
      sufficient_volume: false,
      min_acts_required: minActs,
      canonical_skill_counts: Object.fromEntries(canonicalSkills.map((skill) => [skill, 0])),
      unknown_skill_rows: 0,
    };
  }

  const endMs = Math.max(...normalizedActs.map((row) => row.created_ms));
  const startMs = endMs - windowDays * 24 * 60 * 60 * 1000;
  const windowActs = normalizedActs.filter((row) => row.created_ms >= startMs && row.created_ms <= endMs);

  const reflected = windowActs.filter((row) => {
    const reflectionType = row.reflection_type;
    return typeof reflectionType === "string" && reflectionType.trim().length > 0;
  });

  const canonicalSkillCounts = Object.fromEntries(canonicalSkills.map((skill) => [skill, 0]));
  let unknownSkillRows = 0;
  for (const row of windowActs) {
    const canonicalRaw =
      (typeof row.canonical_category === "string" && row.canonical_category) ||
      (typeof row.category === "string" && row.category) ||
      "";
    const canonical = canonicalSet.has(canonicalRaw)
      ? canonicalRaw
      : aliases[canonicalRaw] || null;
    if (!canonical || !canonicalSet.has(canonical)) {
      unknownSkillRows += 1;
      continue;
    }
    canonicalSkillCounts[canonical] += 1;
  }

  const countValues = canonicalSkills.map((skill) => canonicalSkillCounts[skill]);
  const most = countValues.length > 0 ? Math.max(...countValues) : 0;
  const least = countValues.length > 0 ? Math.min(...countValues) : 0;
  const ratio = most > 0 ? least / most : null;

  const totalActs = windowActs.length;
  const sufficientVolume = totalActs >= minActs;
  const reflectionRate = totalActs > 0 ? (reflected.length / totalActs) * 100 : null;
  const reflectionMet = sufficientVolume && reflectionRate !== null ? reflectionRate >= 55 : null;
  const skillMet = sufficientVolume && ratio !== null ? ratio >= 0.65 : null;

  return {
    snapshot_total_acts: normalizedActs.length,
    window_days: windowDays,
    window_total_acts: totalActs,
    reflection_completion_rate_pct: reflectionRate,
    reflection_target_pct: 55,
    reflection_target_met: reflectionMet,
    skill_balance_ratio: ratio,
    skill_balance_target: 0.65,
    skill_balance_target_met: skillMet,
    sufficient_volume: sufficientVolume,
    min_acts_required: minActs,
    canonical_skill_counts: canonicalSkillCounts,
    unknown_skill_rows: unknownSkillRows,
    window_end_iso: new Date(endMs).toISOString(),
    window_start_iso: new Date(startMs).toISOString(),
  };
}

function formatPct(value) {
  if (value === null || Number.isNaN(value)) return "n/a";
  return `${value.toFixed(2)}%`;
}

function formatNum(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return String(value);
}

function statusIcon(status) {
  if (status === true) return "PASS";
  if (status === false) return "FAIL";
  return "N/A";
}

function createReportMarkdown(payload) {
  const {
    args,
    decoupling,
    baseline,
    comparison,
    productMetrics,
    reportRelPath,
  } = payload;

  const lines = [];
  lines.push("# Phase 5 KPI Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Report path: \`${reportRelPath}\``);
  lines.push("");
  lines.push("## Decoupling KPI");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Cross-domain DB callsites | ${decoupling.cross_domain_db_callsites} |`);
  lines.push(`| Cross-domain direct imports | ${decoupling.cross_domain_direct_imports} |`);
  lines.push(
    `| Median files touched (single-domain commit proxy) | ${formatNum(decoupling.median_files_touched_single_domain_commit)} |`,
  );
  lines.push(`| Single-domain commit sample size | ${decoupling.single_domain_commit_sample_size} |`);
  lines.push(`| Circular domain dependencies | ${decoupling.circular_domain_dependencies} |`);
  lines.push("");

  if (baseline) {
    lines.push("## Baseline Comparison");
    lines.push("");
    lines.push(`Baseline source: \`${relativePath(BASELINE_PATH)}\``);
    lines.push(`Baseline captured at: ${baseline.captured_at || "unknown"}`);
    lines.push("");
    lines.push("| Target | Status | Detail |");
    lines.push("|---|---|---|");
    lines.push(
      `| Reduce cross-domain DB callsites by >=60% | ${statusIcon(comparison.target_db_callsites_reduction_met)} | baseline=${comparison.baseline_cross_domain_db_callsites}, current=${comparison.current_cross_domain_db_callsites}, reduction=${formatPct(comparison.db_callsites_reduction_pct)} |`,
    );
    lines.push(
      `| 100% core interactions through boundaries (proxy: zero cross-domain direct imports) | ${statusIcon(comparison.target_service_boundary_proxy_met)} | current=${comparison.current_cross_domain_direct_imports} |`,
    );
    lines.push(
      `| Median feature change touches <=5 files in one domain (commit proxy) | ${statusIcon(comparison.target_median_files_touched_met)} | current=${formatNum(comparison.current_median_files_touched_single_domain_commit)} |`,
    );
    lines.push(
      `| Zero circular domain dependencies | ${statusIcon(comparison.target_zero_circular_deps_met)} | current=${comparison.current_circular_domain_dependencies} |`,
    );
    lines.push("");
  }

  lines.push("## Domain Dependency Edges");
  lines.push("");
  if (decoupling.cross_domain_edges.length === 0) {
    lines.push("- None");
  } else {
    for (const edge of decoupling.cross_domain_edges) {
      lines.push(`- \`${edge.from}\` -> \`${edge.to}\``);
    }
  }
  lines.push("");

  if (decoupling.circular_cycles.length > 0) {
    lines.push("### Circular Cycles");
    lines.push("");
    for (const cycle of decoupling.circular_cycles) {
      lines.push(`- \`${cycle.join(" -> ")}\``);
    }
    lines.push("");
  }

  if (productMetrics) {
    lines.push("## Product KPI (Snapshot)");
    lines.push("");
    lines.push(`Snapshot path: \`${relativePath(args.snapshotPath)}\``);
    lines.push(`Window: ${productMetrics.window_start_iso} to ${productMetrics.window_end_iso}`);
    lines.push("");
    lines.push("| Metric | Value | Target | Status |");
    lines.push("|---|---|---|---|");
    lines.push(
      `| Reflection completion rate | ${formatPct(productMetrics.reflection_completion_rate_pct)} | >= ${productMetrics.reflection_target_pct}% | ${statusIcon(productMetrics.reflection_target_met)} |`,
    );
    lines.push(
      `| Skill balance ratio (least/most canonical) | ${formatNum(productMetrics.skill_balance_ratio)} | >= ${productMetrics.skill_balance_target} | ${statusIcon(productMetrics.skill_balance_target_met)} |`,
    );
    lines.push(
      `| Window act volume | ${productMetrics.window_total_acts} | >= ${productMetrics.min_acts_required} | ${statusIcon(productMetrics.sufficient_volume)} |`,
    );
    lines.push("");
    lines.push("### Canonical Skill Counts");
    lines.push("");
    for (const [skill, count] of Object.entries(productMetrics.canonical_skill_counts)) {
      lines.push(`- \`${skill}\`: ${count}`);
    }
    lines.push(`- \`unknown_skill_rows\`: ${productMetrics.unknown_skill_rows}`);
    lines.push("");
  } else {
    lines.push("## Product KPI (Snapshot)");
    lines.push("");
    lines.push("- Not computed (provide `--snapshot <path>`).");
    lines.push("");
  }

  lines.push("## Inputs");
  lines.push("");
  lines.push(`- git window: \`${args.since}\``);
  lines.push(`- max commits: ${args.maxCommits}`);
  lines.push(`- product window days: ${args.windowDays}`);
  lines.push(`- product min acts: ${args.minActs}`);
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const domainConfig = await readJson(DOMAIN_CONFIG_PATH);
  const taxonomy = await maybeReadJson(TAXONOMY_PATH);
  const baseline = await maybeReadJson(BASELINE_PATH);

  const coreDomains = Object.keys(domainConfig.core_domains || {});
  const coreDomainSet = new Set(coreDomains);
  const moduleToDomain = new Map();
  for (const [domain, modules] of Object.entries(domainConfig.core_domains || {})) {
    for (const moduleName of modules) {
      moduleToDomain.set(String(moduleName), domain);
    }
  }
  const domainForModule = (moduleName) => moduleToDomain.get(moduleName) || "infra";

  const rustFiles = await walkRustFiles(RUST_DIR);
  let crossDomainDbCallsites = 0;
  let crossDomainDirectImports = 0;
  const edgeSet = new Set();
  const domainDbCallsites = Object.fromEntries(coreDomains.map((d) => [d, 0]));

  for (const filePath of rustFiles) {
    const sourceModule = moduleFromRustFile(filePath);
    const sourceDomain = domainForModule(sourceModule);
    if (!coreDomainSet.has(sourceDomain)) continue;

    const source = await fs.readFile(filePath, "utf8");
    const dbMatches = source.match(/\bdb_client::(query|exec|exec_fire_and_forget|query_sync|exec_sync)\b/gu) || [];
    crossDomainDbCallsites += dbMatches.length;
    domainDbCallsites[sourceDomain] += dbMatches.length;

    const importedModules = extractImportedModules(source);
    for (const imported of importedModules) {
      const targetDomain = domainForModule(imported);
      if (!coreDomainSet.has(targetDomain)) continue;
      if (sourceDomain === targetDomain) continue;
      crossDomainDirectImports += 1;
      edgeSet.add(`${sourceDomain}->${targetDomain}`);
    }
  }

  const graph = new Map();
  for (const domain of coreDomains) {
    graph.set(domain, []);
  }
  for (const edge of edgeSet) {
    const [from, to] = edge.split("->");
    const arr = graph.get(from);
    if (arr && !arr.includes(to)) {
      arr.push(to);
    }
  }
  const cycles = detectCycles(graph, coreDomains);

  const commitsRaw = runGit(
    `git log --since="${args.since}" --no-merges --pretty=%H -n ${args.maxCommits}`,
  );
  const commits = commitsRaw ? commitsRaw.split("\n").filter(Boolean) : [];
  const singleDomainCommitFileCounts = [];

  for (const commit of commits) {
    const filesRaw = runGit(`git show --name-only --pretty=format: ${commit}`);
    if (!filesRaw) continue;
    const files = Array.from(
      new Set(
        filesRaw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .filter((line) => !line.startsWith("docs/archive/")),
      ),
    );
    if (files.length === 0) continue;
    const touchedCoreDomains = new Set();
    for (const file of files) {
      const domain = domainForRepoFile(file, moduleToDomain);
      if (coreDomainSet.has(domain)) {
        touchedCoreDomains.add(domain);
      }
    }
    if (touchedCoreDomains.size === 1) {
      singleDomainCommitFileCounts.push(files.length);
    }
  }

  const decoupling = {
    cross_domain_db_callsites: crossDomainDbCallsites,
    cross_domain_direct_imports: crossDomainDirectImports,
    cross_domain_edges: Array.from(edgeSet)
      .map((edge) => {
        const [from, to] = edge.split("->");
        return { from, to };
      })
      .sort((a, b) => `${a.from}->${a.to}`.localeCompare(`${b.from}->${b.to}`)),
    circular_domain_dependencies: cycles.length,
    circular_cycles: cycles.map((cycle) => [...cycle]),
    median_files_touched_single_domain_commit: median(singleDomainCommitFileCounts),
    single_domain_commit_sample_size: singleDomainCommitFileCounts.length,
    domain_db_callsites: domainDbCallsites,
    commit_proxy_window: {
      since: args.since,
      commits_sampled: commits.length,
      max_commits: args.maxCommits,
    },
  };

  if (args.writeBaseline) {
    const baselinePayload = {
      captured_at: new Date().toISOString(),
      source: "scripts/checks/phase5-kpi-report.mjs",
      decoupling,
    };
    await fs.writeFile(BASELINE_PATH, `${JSON.stringify(baselinePayload, null, 2)}\n`, "utf8");
  }

  let comparison = null;
  if (baseline?.decoupling) {
    const baseDb = Number(baseline.decoupling.cross_domain_db_callsites || 0);
    const curDb = Number(decoupling.cross_domain_db_callsites || 0);
    const reductionPct = baseDb > 0 ? ((baseDb - curDb) / baseDb) * 100 : null;
    const medianTouched = decoupling.median_files_touched_single_domain_commit;
    comparison = {
      baseline_cross_domain_db_callsites: baseDb,
      current_cross_domain_db_callsites: curDb,
      db_callsites_reduction_pct: reductionPct,
      target_db_callsites_reduction_met: baseDb > 0 ? curDb <= baseDb * 0.4 : null,
      current_cross_domain_direct_imports: decoupling.cross_domain_direct_imports,
      target_service_boundary_proxy_met: decoupling.cross_domain_direct_imports === 0,
      current_median_files_touched_single_domain_commit: medianTouched,
      target_median_files_touched_met:
        medianTouched === null ? null : medianTouched <= 5,
      current_circular_domain_dependencies: decoupling.circular_domain_dependencies,
      target_zero_circular_deps_met: decoupling.circular_domain_dependencies === 0,
    };
  }

  let productMetrics = null;
  if (args.snapshotPath) {
    const snapshot = await readJson(args.snapshotPath);
    productMetrics = buildProductMetrics(snapshot, taxonomy || {}, args.windowDays, args.minActs);
  }

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replaceAll("-", "").replaceAll(":", "").replace("T", "-").slice(0, 15);
  const reportAbsPath =
    args.reportPath || path.join(REPORTS_DIR, `phase5-kpi-${stamp}.md`);
  const reportRelPath = relativePath(reportAbsPath);
  const report = createReportMarkdown({
    args,
    decoupling,
    baseline,
    comparison,
    productMetrics,
    reportRelPath,
  });
  await fs.writeFile(reportAbsPath, `${report}\n`, "utf8");

  console.log(`Phase 5 KPI report: ${reportRelPath}`);
  console.log(
    `Decoupling: cross_domain_db_callsites=${decoupling.cross_domain_db_callsites}, cross_domain_direct_imports=${decoupling.cross_domain_direct_imports}, circular_dependencies=${decoupling.circular_domain_dependencies}, median_files_touched_single_domain_commit=${formatNum(decoupling.median_files_touched_single_domain_commit)}`,
  );
  if (productMetrics) {
    console.log(
      `Product KPI: reflection=${formatPct(productMetrics.reflection_completion_rate_pct)}, skill_balance=${formatNum(productMetrics.skill_balance_ratio)}, acts_in_window=${productMetrics.window_total_acts}`,
    );
  } else {
    console.log("Product KPI: not computed (no --snapshot provided)");
  }

  if (comparison) {
    console.log(
      `Targets (baseline compare): db_reduction=${statusIcon(comparison.target_db_callsites_reduction_met)}, service_boundary_proxy=${statusIcon(comparison.target_service_boundary_proxy_met)}, median_touched=${statusIcon(comparison.target_median_files_touched_met)}, zero_cycles=${statusIcon(comparison.target_zero_circular_deps_met)}`,
    );
  } else {
    console.log(
      "Targets (baseline compare): baseline file not found or invalid; run with --write-baseline to capture one",
    );
  }

  if (args.writeBaseline) {
    console.log(`Baseline written: ${relativePath(BASELINE_PATH)}`);
  }

  if (args.enforceTargets && comparison) {
    const failures = [
      comparison.target_db_callsites_reduction_met,
      comparison.target_service_boundary_proxy_met,
      comparison.target_median_files_touched_met,
      comparison.target_zero_circular_deps_met,
    ].filter((value) => value === false).length;
    if (failures > 0) {
      console.error(`Phase 5 KPI target enforcement failed (${failures} target(s) not met)`);
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error(`phase5-kpi-report failed: ${error?.stack || error}`);
  process.exit(1);
});
