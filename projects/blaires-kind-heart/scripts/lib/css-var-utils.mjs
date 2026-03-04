export function normalizeCssValue(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function parseCssVars(blockSource) {
  const vars = new Map();
  const varPattern = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  for (const match of blockSource.matchAll(varPattern)) {
    vars.set(match[1], normalizeCssValue(match[2]));
  }
  return vars;
}

export function extractRootBlock(source, fileLabel) {
  const rootMatch = source.match(/:root\s*\{([\s\S]*?)\}/m);
  if (!rootMatch) {
    throw new Error(`${fileLabel}: could not find :root block`);
  }
  return rootMatch[1];
}
