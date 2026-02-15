#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const DIST_ARG = process.argv[2] || "dist";
const DIST_DIR = path.resolve(process.cwd(), DIST_ARG);
const ROOT_DIR = process.cwd();
const SOURCE_MAP_MODE = (process.env.SOURCE_MAP_MODE || "linked").toLowerCase();

if (!["linked", "hidden"].includes(SOURCE_MAP_MODE)) {
  throw new Error(
    `Unsupported SOURCE_MAP_MODE='${SOURCE_MAP_MODE}'. Use 'linked' or 'hidden'.`,
  );
}

const TARGETS = [
  {
    target: "blaires-kind-heart.js",
    sourceCandidates: [
      "target/wasm-bindgen/release/blaires-kind-heart.js",
      "target/wasm-bindgen/debug/blaires-kind-heart.js",
    ],
  },
  {
    target: "wasm-init.js",
    sourceCandidates: ["wasm-init.js", "public/wasm-init.js"],
  },
  {
    target: "log-context.js",
    sourceCandidates: ["public/log-context.js"],
  },
  {
    target: "runtime-diagnostics.js",
    sourceCandidates: ["public/runtime-diagnostics.js"],
  },
  {
    target: "sw.js",
    sourceCandidates: ["public/sw.js"],
  },
  {
    target: "db-worker.js",
    sourceCandidates: ["public/db-worker.js"],
  },
  {
    target: "sqlite/sqlite3.js",
    sourceCandidates: ["public/sqlite/sqlite3.js"],
  },
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_err) {
    return false;
  }
}

function lineCountFor(source) {
  return source.split(/\r?\n/u).length;
}

function buildLineMappings(totalGeneratedLines, mappedLines) {
  if (totalGeneratedLines <= 0) {
    return "";
  }

  const clampedMappedLines = Math.max(
    0,
    Math.min(totalGeneratedLines, mappedLines),
  );
  const mappings = [];

  for (let i = 0; i < totalGeneratedLines; i += 1) {
    if (i === 0) {
      mappings.push(clampedMappedLines > 0 ? "AAAA" : "");
      continue;
    }
    mappings.push(i < clampedMappedLines ? "AACA" : "");
  }

  return mappings.join(";");
}

function ensureSourceMapComment(source, mapFileName) {
  const hasComment = /\/\/#\s*sourceMappingURL=/u.test(source);
  if (hasComment) {
    return { source, updated: false };
  }

  const suffix = source.endsWith("\n") ? "" : "\n";
  const nextSource = `${source}${suffix}//# sourceMappingURL=${mapFileName}\n`;
  return { source: nextSource, updated: true };
}

function stripTrailingSourceMapComment(source) {
  return source.replace(/\r?\n\/\/#\s*sourceMappingURL=.*\s*$/u, "");
}

function toSummaryLine(result) {
  if (result.status === "missing") {
    return `[maps] MISSING ${result.target}`;
  }

  return `[maps] ${result.target} | map=${result.mapCreated ? "created" : "updated"} | comment=${result.commentState} | source=${result.sourcePath} | sourceRef=${result.sourceRef} | mapping=${result.mappingMode} | mode=${result.sourceMapMode}`;
}

async function resolveBestSource(targetConfig, generatedLineCount) {
  const candidates = [];
  for (const relativeSourcePath of targetConfig.sourceCandidates ?? []) {
    const absolutePath = path.resolve(ROOT_DIR, relativeSourcePath);
    if (!(await exists(absolutePath))) continue;
    const sourceText = await fs.readFile(absolutePath, "utf8");
    const sourceLineCount = lineCountFor(sourceText);
    candidates.push({
      absolutePath,
      sourceText,
      sourceLineCount,
      distance: Math.abs(generatedLineCount - sourceLineCount),
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0];
}

function toPosixRelativePath(fromDir, targetPath) {
  return path.relative(fromDir, targetPath).split(path.sep).join("/");
}

async function generateMapForTarget(targetConfig) {
  const { target } = targetConfig;
  const jsPath = path.join(DIST_DIR, target);
  if (!(await exists(jsPath))) {
    return {
      target,
      status: "missing",
      mapCreated: false,
      commentUpdated: false,
      lineCount: 0,
      mapPath: `${jsPath}.map`,
      mappedLineCount: 0,
      sourcePath: "missing",
      mappingMode: "missing",
    };
  }

  let source = await fs.readFile(jsPath, "utf8");
  const mapPath = `${jsPath}.map`;
  const mapFileName = path.basename(mapPath);
  let commentState = "present";
  let commentUpdated = false;
  if (SOURCE_MAP_MODE === "linked") {
    const commentResult = ensureSourceMapComment(source, mapFileName);
    source = commentResult.source;
    commentUpdated = commentResult.updated;
    commentState = commentUpdated ? "added" : "present";
  } else {
    const stripped = stripTrailingSourceMapComment(source);
    commentUpdated = stripped !== source;
    source = stripped;
    commentState = commentUpdated ? "removed" : "absent";
  }
  if (commentUpdated) {
    await fs.writeFile(jsPath, source, "utf8");
  }

  const generatedLineCount = lineCountFor(source);
  const generatedCodeLineCount = lineCountFor(stripTrailingSourceMapComment(source));
  const bestSource = await resolveBestSource(targetConfig, generatedLineCount);
  const sourceText = bestSource?.sourceText ?? source;
  const sourcePath = bestSource?.absolutePath ?? jsPath;
  const sourceLineCount = bestSource?.sourceLineCount ?? generatedLineCount;
  const mappedCodeLineCount = Math.min(generatedCodeLineCount, sourceLineCount);

  let mappingMode = "self";
  if (bestSource) {
    mappingMode =
      mappedCodeLineCount === generatedCodeLineCount
        ? "external-full"
        : "external-partial";
  }

  const sourceRef = toPosixRelativePath(path.dirname(mapPath), sourcePath);
  const map = {
    version: 3,
    file: path.basename(jsPath),
    sources: [sourceRef],
    sourcesContent: [sourceText],
    names: [],
    mappings: buildLineMappings(generatedLineCount, mappedCodeLineCount),
  };

  await fs.writeFile(mapPath, `${JSON.stringify(map)}\n`, "utf8");

  return {
    target,
    status: "ok",
    mapCreated: true,
    commentUpdated,
    commentState,
    lineCount: generatedLineCount,
    mapPath,
    mappedLineCount: mappedCodeLineCount,
    sourcePath: toPosixRelativePath(ROOT_DIR, sourcePath),
    sourceRef,
    mappingMode,
    sourceMapMode: SOURCE_MAP_MODE,
  };
}

async function main() {
  if (!(await exists(DIST_DIR))) {
    throw new Error(`dist directory not found: ${DIST_DIR}`);
  }

  const results = [];
  for (const targetConfig of TARGETS) {
    results.push(await generateMapForTarget(targetConfig));
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    distDir: DIST_DIR,
    sourceMapMode: SOURCE_MAP_MODE,
    totalTargets: TARGETS.length,
    generatedCount: results.filter((entry) => entry.status === "ok").length,
    missingCount: results.filter((entry) => entry.status === "missing").length,
    targets: results,
  };

  const summaryPath = path.join(DIST_DIR, "source-map-summary.json");
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  for (const result of results) {
    console.log(toSummaryLine(result));
  }
  console.log(`[maps] summary written: ${summaryPath}`);
}

main().catch((err) => {
  console.error(`[maps] failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
