import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, collectFiles } from './check-helpers.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const SOURCE_DIRS = ['app', 'src', 'scripts'];
const files = (await Promise.all(SOURCE_DIRS.map((dir) => collectFiles(path.join(ROOT, dir))))).flat();
const failures = [];

for (const filePath of files) {
  const text = await readFile(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);

  if (sourceFile.parseDiagnostics.length > 0) {
    failures.push(
      ...sourceFile.parseDiagnostics.map((diagnostic) => {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(diagnostic.start || 0);
        return `${path.relative(ROOT, filePath)}:${line + 1}:${character + 1} ${diagnostic.messageText}`;
      }),
    );
  }
}

if (failures.length > 0) {
  console.error('Syntax validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Syntax check passed (${files.length} files parsed).`);
