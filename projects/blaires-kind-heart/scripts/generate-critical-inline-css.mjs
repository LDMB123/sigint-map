#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { extractRootBlock, parseCssVars } from './lib/css-var-utils.mjs';

const ROOT = process.cwd();
const TOKENS_PATH = path.join(ROOT, 'src/styles/tokens.css');
const INDEX_PATH = path.join(ROOT, 'index.html');

const MARKER_START = '/* GENERATED CRITICAL TOKENS START */';
const MARKER_END = '/* GENERATED CRITICAL TOKENS END */';
const MARKER_BASE_INDENT = '    ';

const CRITICAL_TOKEN_NAMES = [
  '--z-loading',
  '--space-xl',
  '--ease-smooth',
  '--ease-elastic',
  '--font-family-display',
  '--font-size-xl',
  '--font-weight-bold',
  '--color-pink-dark',
  '--radius-sm',
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildGeneratedTokenBlock(tokenMap) {
  const lineIndent = `${MARKER_BASE_INDENT}  `;
  const lines = CRITICAL_TOKEN_NAMES.map((name) => {
    const value = tokenMap.get(name);
    if (!value) {
      throw new Error(`Missing required critical token in src/styles/tokens.css: ${name}`);
    }
    return `${lineIndent}${name}: ${value};`;
  });

  return [`${MARKER_BASE_INDENT}${MARKER_START}`, ...lines, `${MARKER_BASE_INDENT}${MARKER_END}`].join('\n');
}

async function main() {
  const [tokensCss, indexHtml] = await Promise.all([
    readFile(TOKENS_PATH, 'utf8'),
    readFile(INDEX_PATH, 'utf8'),
  ]);

  const canonicalVars = parseCssVars(extractRootBlock(tokensCss, TOKENS_PATH));
  const pattern = new RegExp(
    `^[ \\t]*${escapeRegExp(MARKER_START)}[\\s\\S]*?^[ \\t]*${escapeRegExp(MARKER_END)}`,
    'm',
  );
  if (!pattern.test(indexHtml)) {
    throw new Error(`index.html is missing marker block: ${MARKER_START} ... ${MARKER_END}`);
  }

  const generated = buildGeneratedTokenBlock(canonicalVars);
  const updated = indexHtml.replace(pattern, generated);
  if (updated !== indexHtml) {
    await writeFile(INDEX_PATH, updated, 'utf8');
    console.log('✅ Updated critical inline token block in index.html');
  } else {
    console.log('✅ Critical inline token block already up-to-date');
  }
}

main().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
