import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, collectFiles } from './check-helpers.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const SOURCE_DIRS = ['app', 'src', 'scripts'];

function hasExportModifier(node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function collectTopLevelDeclarations(sourceFile) {
  const declarations = [];

  for (const node of sourceFile.statements) {
    if (ts.isFunctionDeclaration(node) && node.name && !hasExportModifier(node)) {
      declarations.push({
        name: node.name.text,
        line: sourceFile.getLineAndCharacterOfPosition(node.name.getStart(sourceFile)).line + 1,
      });
      continue;
    }

    if (ts.isVariableStatement(node) && !hasExportModifier(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        declarations.push({
          name: declaration.name.text,
          line: sourceFile.getLineAndCharacterOfPosition(declaration.name.getStart(sourceFile)).line + 1,
        });
      }
    }
  }

  return declarations;
}

function countIdentifiers(sourceFile) {
  const counts = new Map();

  function visit(node) {
    if (ts.isIdentifier(node)) {
      counts.set(node.text, (counts.get(node.text) || 0) + 1);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return counts;
}

const allFiles = (await Promise.all(SOURCE_DIRS.map((dir) => collectFiles(path.join(ROOT, dir))))).flat();
const deadDeclarations = [];

for (const filePath of allFiles) {
  const text = await readFile(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);
  const declarations = collectTopLevelDeclarations(sourceFile);
  const identifierCounts = countIdentifiers(sourceFile);

  for (const declaration of declarations) {
    if ((identifierCounts.get(declaration.name) || 0) <= 1) {
      deadDeclarations.push({
        file: path.relative(ROOT, filePath),
        name: declaration.name,
        line: declaration.line,
      });
    }
  }
}

if (deadDeclarations.length > 0) {
  console.error('Potential dead top-level declarations found:');
  deadDeclarations.forEach(({ file, name, line }) => {
    console.error(`- ${file}:${line} → ${name}`);
  });
  process.exit(1);
}

console.log(`Dead code check passed (${allFiles.length} files scanned).`);
