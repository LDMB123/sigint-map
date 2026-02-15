import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const repoPrefix = "/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/";

function listMarkdownFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "archive") continue; // Active docs gate only
      out.push(...listMarkdownFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function addCandidate(set, token) {
  if (!token) return;
  const cleaned = token.trim();
  if (!cleaned || cleaned.startsWith("http://") || cleaned.startsWith("https://")) return;
  if (cleaned.startsWith("docs/") || cleaned.startsWith(repoPrefix)) {
    set.add(cleaned.replace(/[#?].*$/, ""));
  }
}

function extractCandidates(content) {
  const candidates = new Set();

  // Markdown links: [text](target)
  for (const m of content.matchAll(/\[[^\]]*?\]\(([^)]+)\)/g)) {
    addCandidate(candidates, m[1]);
  }

  // Backtick paths used heavily in this repo docs.
  for (const m of content.matchAll(/`([^`\n]+)`/g)) {
    addCandidate(candidates, m[1]);
  }

  return [...candidates];
}

function resolvePath(candidate) {
  if (candidate.startsWith(repoPrefix)) {
    return candidate;
  }
  return path.join(root, candidate);
}

function isValidTarget(absPath) {
  if (!existsSync(absPath)) return false;
  const st = statSync(absPath);
  return st.isFile() || st.isDirectory();
}

const files = [path.join(root, "README.md"), ...listMarkdownFiles(docsDir)];
const missing = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const candidates = extractCandidates(content);
  for (const candidate of candidates) {
    const abs = resolvePath(candidate);
    if (!isValidTarget(abs)) {
      missing.push({
        file: path.relative(root, file),
        reference: candidate,
      });
    }
  }
}

if (missing.length > 0) {
  console.error("[docs-links] FAIL: missing local references");
  for (const item of missing) {
    console.error(`- ${item.file}: ${item.reference}`);
  }
  process.exit(1);
}

console.log("[docs-links] PASS");
