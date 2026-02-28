#!/usr/bin/env node

import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "../..");
const E2E_DIR = path.join(ROOT_DIR, "e2e");
const INDEX_PATH = path.join(ROOT_DIR, "index.html");
const RUST_PATHS = [
  "rust/tracker.rs",
  "rust/quests.rs",
  "rust/stories.rs",
  "rust/rewards.rs",
  "rust/games.rs",
  "rust/gardens.rs",
  "rust/progress.rs",
  "rust/mom_mode.rs",
  "rust/lib.rs",
  "rust/navigation.rs",
  "public/db-worker.js",
  "public/runtime-diagnostics.js",
].map((p) => path.join(ROOT_DIR, p));

function timestampSlug(date = new Date()) {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ];
  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function getTestFiles() {
  const entries = await fs.readdir(E2E_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".spec.ts"))
    .map((entry) => path.join(E2E_DIR, entry.name))
    .sort();

  const tests = [];
  for (const filePath of files) {
    tests.push({
      filePath,
      fileName: path.basename(filePath),
      content: await fs.readFile(filePath, "utf8"),
    });
  }
  return tests;
}

function collectPanelIds(indexHtml) {
  const panelIds = new Set();
  const re = /data-panel-open="([^"]+)"/g;
  for (const match of indexHtml.matchAll(re)) {
    panelIds.add(match[1]);
  }
  return [...panelIds].sort();
}

function routeCoverage(panelIds, tests) {
  const routes = [
    { route: "/", matcher: /page\.goto\("\/\?e2e=1(?:&[^"]*)?"/ },
    { route: "/offline.html", matcher: /page\.goto\("\/offline\.html"/ },
    ...panelIds.map((panelId) => ({
      route: `/?panel=${panelId}#${panelId}`,
      matcher: new RegExp(escapeRegex(panelId)),
    })),
  ];

  return routes.map((routeDef) => {
    const files = tests
      .filter((testFile) => routeDef.matcher.test(testFile.content))
      .map((testFile) => testFile.fileName);
    return {
      route: routeDef.route,
      files,
      covered: files.length > 0,
    };
  });
}

function flowCovered(flow, tests) {
  const suiteText = tests.map((t) => t.content).join("\n\n");
  const sourceText = flow.sourceEvidenceText;

  const inApp = flow.appEvidence.every((pattern) => pattern.test(sourceText));
  if (!inApp) {
    return { inApp: false, covered: false, files: [] };
  }

  if (flow.coverageMode === "across_suite") {
    const covered = flow.testEvidence.every((pattern) => pattern.test(suiteText));
    const files = covered
      ? tests.filter((testFile) => flow.testEvidence.some((p) => p.test(testFile.content))).map((t) => t.fileName)
      : [];
    return { inApp: true, covered, files };
  }

  const files = tests
    .filter((testFile) => flow.testEvidence.every((pattern) => pattern.test(testFile.content)))
    .map((testFile) => testFile.fileName);
  return { inApp: true, covered: files.length > 0, files };
}

async function main() {
  const customOutput = process.argv[2];
  const reportDir = path.join(ROOT_DIR, "scripts", "reports");
  const reportPath =
    customOutput || path.join(reportDir, `e2e-gap-report-${timestampSlug()}.md`);

  const [indexHtml, ...rustSources] = await Promise.all([
    fs.readFile(INDEX_PATH, "utf8"),
    ...RUST_PATHS.map((p) => readFileSafe(p)),
  ]);
  const tests = await getTestFiles();

  const panelIds = collectPanelIds(indexHtml);
  const routeMap = routeCoverage(panelIds, tests);

  const sourceEvidenceText = `${indexHtml}\n${rustSources.join("\n\n")}`;
  const flows = [
    {
      id: "home_panel_navigation",
      route: "/",
      type: "main_navigation",
      priority: "high",
      risk: "Core app navigation can regress silently.",
      reason: "No explicit open/close panel click-flow assertions.",
      appEvidence: [/data-panel-open=/, /data-panel-close/],
      testEvidence: [/\[data-panel-close\]/],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
    {
      id: "tracker_log_kind_act",
      route: "/?panel=panel-tracker#panel-tracker",
      type: "crud_operations",
      priority: "critical",
      risk: "Primary user action could fail to persist progress.",
      reason: "Tracker tap/write path is not exercised.",
      appEvidence: [/\[data-action\]/, /INSERT INTO kind_acts/],
      testEvidence: [/\[data-action\]/],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
    {
      id: "quests_complete_and_persist",
      route: "/?panel=panel-quests#panel-quests",
      type: "form_submissions",
      priority: "critical",
      risk: "Quest completion and reward logic can break unnoticed.",
      reason: "Quest card completion path lacks E2E checks.",
      appEvidence: [/\[data-quest-idx\]/, /INSERT OR REPLACE INTO quests/],
      testEvidence: [/\[data-quest-idx\]/],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
    {
      id: "stories_open_and_complete",
      route: "/?panel=panel-stories#panel-stories",
      type: "core_business_flow",
      priority: "critical",
      risk: "Story completion markers can drift from DB state.",
      reason: "Story open/read completion is not tested.",
      appEvidence: [/\[data-story\]/, /kindheart-story-done/],
      testEvidence: [/\[data-story\]/],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
    {
      id: "games_launch_and_return",
      route: "/?panel=panel-games#panel-games",
      type: "core_business_flow",
      priority: "critical",
      risk: "Game lifecycle regressions affect multiple rewards/stats paths.",
      reason: "No E2E game launch/back/again workflow coverage.",
      appEvidence: [/\[data-game\]/, /\[data-game-back\]/, /\[data-game-again\]/],
      testEvidence: [/\[data-game\]/, /\[data-game-back\]|\[data-game-again\]/],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
    {
      id: "rewards_state_progression",
      route: "/?panel=panel-rewards#panel-rewards",
      type: "crud_operations",
      priority: "high",
      risk: "Sticker unlock/visibility regressions won't be caught by visual snapshots.",
      reason: "No behavioral test for sticker progression state.",
      appEvidence: [/\[data-sticker-count\]/, /\[data-sticker-idx\]/],
      testEvidence: [/\[data-sticker-count\]|\[data-sticker-idx\]/],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
    {
      id: "gardens_unlock_and_render",
      route: "/?panel=panel-gardens#panel-gardens",
      type: "core_business_flow",
      priority: "high",
      risk: "Unlocked-garden state and stage rendering can regress.",
      reason: "No E2E asserts unlocked garden cards/stages.",
      appEvidence: [/\[data-gardens-grid\]/, /WHERE unlocked_at IS NOT NULL/],
      testEvidence: [/\[data-gardens-grid\]|\[data-garden-id\]/],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
    {
      id: "progress_moms_view_pin_gate",
      route: "/?panel=panel-progress#panel-progress",
      type: "security_gate",
      priority: "critical",
      risk: "Parent insights gate may allow bypass or fail valid access.",
      reason: "Progress panel PIN verification flow is untested.",
      appEvidence: [/\[data-pin-submit\]/, /\[data-insights-area\]/, /verify_pin_and_show_insights/],
      testEvidence: [/\[data-pin-submit\]/, /#mom-pin-input/],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
    {
      id: "mom_dashboard_access_and_export",
      route: "/",
      type: "data_exports",
      priority: "covered",
      risk: "N/A",
      reason: "Covered by current db-contract E2E.",
      appEvidence: [/\[data-mom-dashboard\]/, /\[data-mom-export-json\]/, /\[data-mom-export-csv\]/],
      testEvidence: [
        /\[data-mom-dashboard\]/,
        /\[data-mom-export-json\]|exportPayload\.export_format_version/,
        /\[data-mom-export-csv\]|csvHeader/,
        /waitForEvent\(['"]download['"]\)|openMomDashboard\(/,
      ],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
    {
      id: "mom_restore_via_file_input",
      route: "/",
      type: "file_uploads",
      priority: "critical",
      risk: "Real user restore path (file picker) can break despite worker-level restore checks.",
      reason: "Current tests bypass file-input restore via wasm test helper.",
      appEvidence: [/\[data-mom-restore-input\]/, /restore_parent_data_json/],
      testEvidence: [/setInputFiles\(/, /\[data-mom-restore-input\]/],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
    {
      id: "db_worker_contract_offline",
      route: "/offline.html",
      type: "core_business_flow",
      priority: "covered",
      risk: "N/A",
      reason: "Covered by current db-contract E2E.",
      appEvidence: [/db-worker\.js/, /DB_SCHEMA_VERSION/],
      testEvidence: [/offline\.html/, /db worker enforces protocol|db worker initializes schema, migrations, and integrity/],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
    {
      id: "runtime_diagnostics_boot_contract",
      route: "/",
      type: "core_business_flow",
      priority: "covered",
      risk: "N/A",
      reason: "Covered by runtime diagnostics E2E contract.",
      appEvidence: [/runtime-diagnostics\.js/, /__BKH_RUNTIME_DIAGNOSTICS__/],
      testEvidence: [/runtime diagnostics/, /diag:wasm-init/],
      coverageMode: "across_suite",
      sourceEvidenceText,
    },
  ];

  const flowResults = flows
    .map((flow) => {
      const result = flowCovered(flow, tests);
      return { ...flow, ...result };
    })
    .filter((flow) => flow.inApp);

  const gaps = flowResults.filter((flow) => !flow.covered);
  const byPriority = {
    critical: gaps.filter((g) => g.priority === "critical"),
    high: gaps.filter((g) => g.priority === "high"),
    medium: gaps.filter((g) => g.priority === "medium"),
  };

  const coveredFlows = flowResults.filter((flow) => flow.covered);
  const coveredRoutes = routeMap.filter((r) => r.covered);
  const coveragePercent =
    routeMap.length === 0 ? 0 : (coveredRoutes.length / routeMap.length) * 100;
  const flowCoveragePercent =
    flowResults.length === 0 ? 0 : (coveredFlows.length / flowResults.length) * 100;

  const reportLines = [];
  reportLines.push("# E2E Gap Report");
  reportLines.push("");
  reportLines.push(`- generated_at: ${new Date().toISOString()}`);
  reportLines.push(`- test_files: ${tests.length}`);
  reportLines.push(`- panel_routes: ${panelIds.length}`);
  reportLines.push("");
  reportLines.push("```yaml");
  reportLines.push("e2e_test_gaps:");
  reportLines.push("  critical:");
  if (byPriority.critical.length === 0) {
    reportLines.push("    []");
  } else {
    for (const gap of byPriority.critical) {
      reportLines.push(`    - route: \"${gap.route}\"`);
      reportLines.push(`      flow: \"${gap.id}\"`);
      reportLines.push(`      type: \"${gap.type}\"`);
      reportLines.push(`      reason: \"${gap.reason}\"`);
      reportLines.push(`      risk: \"${gap.risk}\"`);
    }
  }
  reportLines.push("");
  reportLines.push("  high:");
  if (byPriority.high.length === 0) {
    reportLines.push("    []");
  } else {
    for (const gap of byPriority.high) {
      reportLines.push(`    - route: \"${gap.route}\"`);
      reportLines.push(`      flow: \"${gap.id}\"`);
      reportLines.push(`      type: \"${gap.type}\"`);
      reportLines.push(`      reason: \"${gap.reason}\"`);
      reportLines.push(`      risk: \"${gap.risk}\"`);
    }
  }
  reportLines.push("");
  reportLines.push("  medium:");
  if (byPriority.medium.length === 0) {
    reportLines.push("    []");
  } else {
    for (const gap of byPriority.medium) {
      reportLines.push(`    - route: \"${gap.route}\"`);
      reportLines.push(`      flow: \"${gap.id}\"`);
      reportLines.push(`      type: \"${gap.type}\"`);
      reportLines.push(`      reason: \"${gap.reason}\"`);
      reportLines.push(`      risk: \"${gap.risk}\"`);
    }
  }
  reportLines.push("");
  reportLines.push("coverage_summary:");
  reportLines.push(`  total_routes: ${routeMap.length}`);
  reportLines.push(`  tested_routes: ${coveredRoutes.length}`);
  reportLines.push(`  route_coverage_percentage: ${coveragePercent.toFixed(1)}`);
  reportLines.push(`  total_flows: ${flowResults.length}`);
  reportLines.push(`  covered_flows: ${coveredFlows.length}`);
  reportLines.push(`  flow_coverage_percentage: ${flowCoveragePercent.toFixed(1)}`);
  reportLines.push(`  critical_gaps: ${byPriority.critical.length}`);
  reportLines.push(`  high_priority_gaps: ${byPriority.high.length}`);
  reportLines.push("");
  reportLines.push("route_to_test:");
  for (const route of routeMap) {
    const files = route.files.length > 0 ? route.files.join(", ") : "null";
    reportLines.push(`  \"${route.route}\": \"${files}\"`);
  }
  reportLines.push("```");
  reportLines.push("");
  reportLines.push("## Covered Flows");
  if (coveredFlows.length === 0) {
    reportLines.push("- None.");
  } else {
    for (const flow of coveredFlows) {
      reportLines.push(
        `- \`${flow.id}\` via ${flow.files.length ? flow.files.join(", ") : "suite-level match"}`
      );
    }
  }

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${reportLines.join("\n")}\n`, "utf8");

  console.log(`E2E gap report written to ${reportPath}`);
  console.log(
    `Route coverage ${coveredRoutes.length}/${routeMap.length} (${coveragePercent.toFixed(
      1
    )}%), flow coverage ${coveredFlows.length}/${flowResults.length} (${flowCoveragePercent.toFixed(
      1
    )}%)`
  );
  console.log(
    `Gaps: critical=${byPriority.critical.length}, high=${byPriority.high.length}, medium=${byPriority.medium.length}`
  );
}

main().catch((error) => {
  console.error("[qa:e2e-gap-report] failed:", error);
  process.exitCode = 1;
});
