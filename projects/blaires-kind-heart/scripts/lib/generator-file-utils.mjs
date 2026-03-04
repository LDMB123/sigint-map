import fs from 'node:fs';
import path from 'node:path';

export function resolveProjectRoot(importMetaUrl) {
  return path.resolve(path.dirname(new URL(importMetaUrl).pathname), '..');
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === content) {
    return false;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

export function collectChangedPaths(projectRoot, fileStates) {
  const changed = [];
  for (const { filePath, changed: didChange } of fileStates) {
    if (didChange) {
      changed.push(path.relative(projectRoot, filePath));
    }
  }
  return changed;
}

export function logGenerationResult(changedPaths, upToDateMessage) {
  if (changedPaths.length === 0) {
    console.log(`✅ ${upToDateMessage}`);
  } else {
    console.log(`✅ Generated ${changedPaths.join(', ')}`);
  }
}

export function resolvePaths(importMetaUrl, pathSpec) {
  const projectRoot = resolveProjectRoot(importMetaUrl);
  const resolved = {};
  for (const [key, segments] of Object.entries(pathSpec)) {
    resolved[key] = path.join(projectRoot, ...segments);
  }
  return { projectRoot, ...resolved };
}

export function finalizeGeneration(projectRoot, fileStates, upToDateMessage) {
  const changedPaths = collectChangedPaths(projectRoot, fileStates);
  logGenerationResult(changedPaths, upToDateMessage);
}
