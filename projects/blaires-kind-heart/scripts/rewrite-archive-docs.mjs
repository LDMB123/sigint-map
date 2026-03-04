#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ARCHIVE_ROOT = path.join(ROOT, "docs", "archive");
const REPO_PREFIX = "/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/";
const NORMALIZED_ON = "2026-03-04";
const SECTION_ORDER = ["Summary", "Context", "Actions", "Validation", "References"];
const SECTION_DEFAULTS = {
  Summary: "_No summary captured during normalization._",
  Context: "_Context not recorded in source archive document._",
  Actions: "_No actions recorded._",
  Validation: "_Validation details not recorded._",
  References: "_No references recorded._",
};

function normalizePathForMarkdown(filePath) {
  return filePath.split(path.sep).join("/");
}

function slugToTitle(fileName) {
  const base = fileName.replace(/\.md$/i, "");
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function stripFrontMatter(content) {
  if (!content.startsWith("---\n")) {
    return content;
  }
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) {
    return content;
  }
  return content.slice(end + 5);
}

function extractTitle(content, fallback) {
  for (const line of content.split("\n")) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) {
      return match[1].trim();
    }
  }
  return fallback;
}

function normalizeHeading(rawHeading) {
  const heading = rawHeading.trim().toLowerCase();
  if (heading.includes("summary")) return "Summary";
  if (
    heading.includes("context")
    || heading.includes("background")
    || heading.includes("overview")
  ) {
    return "Context";
  }
  if (
    heading.includes("action")
    || heading.includes("implementation")
    || heading.includes("changes")
    || heading.includes("next step")
  ) {
    return "Actions";
  }
  if (
    heading.includes("validation")
    || heading.includes("test")
    || heading.includes("verification")
    || heading.includes("result")
    || heading.includes("checklist")
  ) {
    return "Validation";
  }
  if (heading.includes("reference") || heading.includes("link") || heading.includes("navigation")) {
    return "References";
  }
  return null;
}

function dedupeRepeatedLines(text) {
  const lines = text.split("\n");
  const out = [];
  let previousNonEmpty = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && trimmed === previousNonEmpty) {
      continue;
    }
    out.push(line);
    previousNonEmpty = trimmed || previousNonEmpty;
  }
  return out.join("\n");
}

function toRelativeLink(fromFile, absTarget) {
  const rel = path.relative(path.dirname(fromFile), absTarget) || ".";
  return normalizePathForMarkdown(rel);
}

function normalizeLinks(text, absFile) {
  const escapedRepo = REPO_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const absolutePattern = new RegExp(`\\(${escapedRepo}([^)#\\s]+)(#[^)\\s]+)?\\)`, "g");
  let normalized = text.replace(absolutePattern, (_, relPath, hash = "") => {
    const absTarget = path.join(ROOT, relPath);
    return `(${toRelativeLink(absFile, absTarget)}${hash})`;
  });

  normalized = normalized.replace(/\((docs\/archive\/[^)#\s]+)(#[^)\\s]+)?\)/g, (_, relPath, hash = "") => {
    const absTarget = path.join(ROOT, relPath);
    return `(${toRelativeLink(absFile, absTarget)}${hash})`;
  });

  normalized = normalized.replace(/`(docs\/archive\/[^`\s]+)`/g, (_, relPath) => {
    const absTarget = path.join(ROOT, relPath);
    return `\`${toRelativeLink(absFile, absTarget)}\``;
  });

  return normalized;
}

function cleanSectionBody(text, absFile) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""));
  let out = lines.join("\n");
  out = normalizeLinks(out, absFile);
  out = dedupeRepeatedLines(out);
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

function splitSections(content) {
  const sections = new Map(SECTION_ORDER.map((name) => [name, []]));
  let currentSection = "Context";

  for (const line of content.split("\n")) {
    if (/^#\s+/.test(line)) {
      continue;
    }
    const headingMatch = line.match(/^##+\s+(.+?)\s*$/);
    if (headingMatch) {
      const normalized = normalizeHeading(headingMatch[1]);
      if (normalized) {
        currentSection = normalized;
      } else {
        sections.get(currentSection).push(`### ${headingMatch[1].trim()}`);
      }
      continue;
    }
    sections.get(currentSection).push(line);
  }

  const out = {};
  for (const name of SECTION_ORDER) {
    out[name] = sections.get(name).join("\n");
  }
  return out;
}

function deriveSummaryFromContext(context) {
  const line = context
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith("#") && !item.startsWith("-"));
  if (!line) {
    return "";
  }
  return line.length > 280 ? `${line.slice(0, 277)}...` : line;
}

function renderNormalizedDoc({ title, sourceTitle, relPath, sections }) {
  const metadata = [
    `- Archive Path: \`${normalizePathForMarkdown(relPath)}\``,
    `- Normalized On: \`${NORMALIZED_ON}\``,
    `- Source Title: \`${sourceTitle}\``,
  ].join("\n");

  const bodyParts = SECTION_ORDER.map((name) => {
    const content = sections[name] || SECTION_DEFAULTS[name];
    return `## ${name}\n${content}`;
  });

  return `# ${title}

${metadata}

${bodyParts.join("\n\n")}
`;
}

async function listMarkdownFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await listMarkdownFiles(abs));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(abs);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function collectArchiveDirs(files) {
  const dirs = new Set([ARCHIVE_ROOT]);
  for (const file of files) {
    let dir = path.dirname(file);
    while (dir.startsWith(ARCHIVE_ROOT)) {
      dirs.add(dir);
      if (dir === ARCHIVE_ROOT) {
        break;
      }
      dir = path.dirname(dir);
    }
  }
  return [...dirs].sort((a, b) => a.localeCompare(b));
}

async function fileTitle(absPath) {
  const fallback = slugToTitle(path.basename(absPath));
  const content = await readFile(absPath, "utf8");
  return extractTitle(content, fallback);
}

async function buildIndexForDir(dir, allMarkdown) {
  const entries = await readdir(dir, { withFileTypes: true });
  const childDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name))
    .filter((childDir) => allMarkdown.some((file) => file.startsWith(`${childDir}${path.sep}`)))
    .sort((a, b) => a.localeCompare(b));

  const childFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md") && entry.name !== "INDEX.md")
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => a.localeCompare(b));

  const relDir = path.relative(ARCHIVE_ROOT, dir);
  const dirLabel = relDir ? normalizePathForMarkdown(relDir) : "root";
  const title = relDir ? `Archive ${dirLabel} Index` : "Archive Documentation Index";

  const dirActions = [];
  for (const childDir of childDirs) {
    const childName = path.basename(childDir);
    const childIndex = path.join(childDir, "INDEX.md");
    const link = toRelativeLink(path.join(dir, "INDEX.md"), childIndex);
    const fileCount = allMarkdown.filter((file) => file.startsWith(`${childDir}${path.sep}`)).length;
    dirActions.push(`- [${childName}/INDEX.md](${link}) - ${fileCount} files`);
  }

  for (const childFile of childFiles) {
    const childTitle = await fileTitle(childFile);
    const relLink = toRelativeLink(path.join(dir, "INDEX.md"), childFile);
    dirActions.push(`- [${path.basename(childFile)}](${relLink}) - ${childTitle}`);
  }

  const references = [];
  if (dir === ARCHIVE_ROOT) {
    references.push("- Active docs index: [../INDEX.md](../INDEX.md)");
  } else {
    references.push("- Parent archive index: [../INDEX.md](../INDEX.md)");
    references.push(`- Root archive index: [${toRelativeLink(path.join(dir, "INDEX.md"), path.join(ARCHIVE_ROOT, "INDEX.md"))}](`
      + `${toRelativeLink(path.join(dir, "INDEX.md"), path.join(ARCHIVE_ROOT, "INDEX.md"))})`);
  }

  const sections = {
    Summary: `Historical archive index for \`${dirLabel}\` (${childDirs.length + childFiles.length} entries).`,
    Context: "Generated from current archive markdown inventory.",
    Actions: dirActions.length > 0 ? dirActions.join("\n") : "_No entries in this directory._",
    Validation: "- Rebuilt by `scripts/rewrite-archive-docs.mjs`.",
    References: references.join("\n"),
  };

  const indexContent = renderNormalizedDoc({
    title,
    sourceTitle: title,
    relPath: path.relative(ROOT, path.join(dir, "INDEX.md")),
    sections,
  });
  await writeFile(path.join(dir, "INDEX.md"), `${indexContent.replace(/\n{3,}/g, "\n\n")}\n`, "utf8");
}

async function rewriteArchiveFiles() {
  const allMarkdown = await listMarkdownFiles(ARCHIVE_ROOT);

  for (const absPath of allMarkdown) {
    if (path.basename(absPath) === "INDEX.md") {
      continue;
    }
    const relPath = path.relative(ROOT, absPath);
    const fallbackTitle = slugToTitle(path.basename(absPath));
    const original = await readFile(absPath, "utf8");
    const body = stripFrontMatter(original).replace(/\r\n/g, "\n");
    const sourceTitle = extractTitle(body, fallbackTitle);
    const parsedSections = splitSections(body);

    const cleaned = {};
    for (const section of SECTION_ORDER) {
      cleaned[section] = cleanSectionBody(parsedSections[section] || "", absPath);
    }

    if (!cleaned.Summary) {
      cleaned.Summary = deriveSummaryFromContext(cleaned.Context);
    }
    for (const section of SECTION_ORDER) {
      if (!cleaned[section]) {
        cleaned[section] = SECTION_DEFAULTS[section];
      }
    }

    const normalized = renderNormalizedDoc({
      title: sourceTitle,
      sourceTitle,
      relPath,
      sections: cleaned,
    });

    await writeFile(absPath, `${normalized.replace(/\n{3,}/g, "\n\n")}\n`, "utf8");
  }

  const refreshedFiles = await listMarkdownFiles(ARCHIVE_ROOT);
  const dirs = collectArchiveDirs(refreshedFiles);
  for (const dir of dirs) {
    await buildIndexForDir(dir, refreshedFiles);
  }

  console.log(`[archive-rewrite] normalized files=${refreshedFiles.length} date=${NORMALIZED_ON}`);
}

rewriteArchiveFiles().catch((error) => {
  console.error(`[archive-rewrite] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
