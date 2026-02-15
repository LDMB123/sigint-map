import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const archiveMarker = `${path.sep}archive${path.sep}`;
const charsPerToken = Number(process.env.TOKEN_CHAR_RATIO || 4);

const jsonMode = process.argv.includes("--json");
const markdownMode = process.argv.includes("--markdown");
const topArg = process.argv.find((arg) => arg.startsWith("--top="));
const topN = topArg ? Number(topArg.split("=")[1]) : 10;

async function walkMarkdownFiles(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkMarkdownFiles(full, out);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function estimateTokens(byteCount) {
  return Math.floor(byteCount / charsPerToken);
}

function rel(file) {
  return path.relative(root, file);
}

async function main() {
  const files = await walkMarkdownFiles(docsDir);
  const rows = [];

  for (const file of files) {
    const fileStat = await stat(file);
    const archive = file.includes(archiveMarker);
    rows.push({
      file,
      bytes: fileStat.size,
      archive,
    });
  }

  const active = rows.filter((row) => !row.archive);
  const archived = rows.filter((row) => row.archive);

  const activeBytes = active.reduce((sum, row) => sum + row.bytes, 0);
  const archiveBytes = archived.reduce((sum, row) => sum + row.bytes, 0);

  const topActive = [...active]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, Number.isFinite(topN) && topN > 0 ? topN : 10)
    .map((row) => ({
      file: rel(row.file),
      bytes: row.bytes,
      estimated_tokens: estimateTokens(row.bytes),
    }));

  const report = {
    generated_at: new Date().toISOString(),
    root,
    docs_dir: docsDir,
    chars_per_token: charsPerToken,
    active: {
      files: active.length,
      bytes: activeBytes,
      estimated_tokens: estimateTokens(activeBytes),
    },
    archive: {
      files: archived.length,
      bytes: archiveBytes,
      estimated_tokens: estimateTokens(archiveBytes),
    },
    top_active_docs: topActive,
  };

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (markdownMode) {
    console.log("# Token Baseline");
    console.log("");
    console.log(`Generated: ${report.generated_at}`);
    console.log("");
    console.log("| Scope | Files | Bytes | Estimated Tokens |");
    console.log("|---|---:|---:|---:|");
    console.log(
      `| Active docs | ${report.active.files} | ${report.active.bytes} | ${report.active.estimated_tokens} |`,
    );
    console.log(
      `| Archive docs | ${report.archive.files} | ${report.archive.bytes} | ${report.archive.estimated_tokens} |`,
    );
    console.log("");
    console.log("## Top Active Docs");
    console.log("");
    console.log("| File | Bytes | Estimated Tokens |");
    console.log("|---|---:|---:|");
    for (const row of report.top_active_docs) {
      console.log(`| ${row.file} | ${row.bytes} | ${row.estimated_tokens} |`);
    }
    return;
  }

  console.log(`active_files=${report.active.files}`);
  console.log(`archive_files=${report.archive.files}`);
  console.log(`active_bytes=${report.active.bytes}`);
  console.log(`archive_bytes=${report.archive.bytes}`);
  console.log(`active_est_tokens=${report.active.estimated_tokens}`);
  console.log(`archive_est_tokens=${report.archive.estimated_tokens}`);
  console.log("top_active_docs_by_size:");
  for (const row of report.top_active_docs) {
    console.log(`${row.bytes} ${row.file}`);
  }
}

main().catch((error) => {
  console.error("[token-doc-baseline] failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
