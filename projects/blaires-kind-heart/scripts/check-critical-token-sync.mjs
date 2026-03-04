import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { extractRootBlock, parseCssVars } from './lib/css-var-utils.mjs';

const ROOT = process.cwd();
const MARKER_START = '/* GENERATED CRITICAL TOKENS START */';
const MARKER_END = '/* GENERATED CRITICAL TOKENS END */';

function extractCriticalInlineStyle(html) {
  const stylePattern = /<style>([\s\S]*?)<\/style>/gim;
  for (const match of html.matchAll(stylePattern)) {
    const css = match[1];
    if (/CRITICAL INLINE CSS/i.test(css) && /:root\s*\{/.test(css)) {
      return css;
    }
  }
  throw new Error('index.html: could not find critical inline <style> block with :root');
}

function extractGeneratedBlock(css) {
  const startIndex = css.indexOf(MARKER_START);
  const endIndex = css.indexOf(MARKER_END);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error(`index.html: missing generated token markers (${MARKER_START} / ${MARKER_END})`);
  }

  const generatedContent = css.slice(startIndex + MARKER_START.length, endIndex);
  const before = css.slice(0, startIndex);
  const after = css.slice(endIndex + MARKER_END.length);
  return { generatedContent, before, after };
}

function assertNoManualTokenDefinitions(cssSlice, fileLabel) {
  const varPattern = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  const matches = [...cssSlice.matchAll(varPattern)];
  if (matches.length === 0) {
    return;
  }
  const names = matches.map((match) => match[1]).join(', ');
  throw new Error(`${fileLabel}: token definitions outside generated marker block (${names})`);
}

async function main() {
  const [tokensCss, indexHtml] = await Promise.all([
    readFile(path.join(ROOT, 'src/styles/tokens.css'), 'utf8'),
    readFile(path.join(ROOT, 'index.html'), 'utf8'),
  ]);

  const canonicalVars = parseCssVars(extractRootBlock(tokensCss, 'src/styles/tokens.css'));
  const criticalStyle = extractCriticalInlineStyle(indexHtml);
  const { generatedContent, before, after } = extractGeneratedBlock(criticalStyle);
  assertNoManualTokenDefinitions(before, 'index.html critical inline style');
  assertNoManualTokenDefinitions(after, 'index.html critical inline style');
  const inlineVars = parseCssVars(generatedContent);

  const failures = [];
  for (const [name, inlineValue] of inlineVars.entries()) {
    if (!canonicalVars.has(name)) {
      failures.push(`index.html: critical inline token ${name} is not defined in src/styles/tokens.css`);
      continue;
    }
    const canonicalValue = canonicalVars.get(name);
    if (inlineValue !== canonicalValue) {
      failures.push(
        `index.html: ${name} mismatch (inline="${inlineValue}" canonical="${canonicalValue}")`,
      );
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[qa-critical-token-sync] FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log('[qa-critical-token-sync] PASS critical inline tokens match src/styles/tokens.css');
}

main().catch((error) => {
  console.error(`[qa-critical-token-sync] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
