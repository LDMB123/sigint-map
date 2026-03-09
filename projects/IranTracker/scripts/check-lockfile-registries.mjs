import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const lockfilePath = path.join(projectRoot, 'package-lock.json');
const npmrcPath = path.join(projectRoot, '.npmrc');

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

if (!(await fileExists(lockfilePath))) {
  console.log('Lockfile registry check skipped (no package-lock.json present).');
  process.exit(0);
}

const [lockfileText, npmrcText] = await Promise.all([
  readFile(lockfilePath, 'utf8'),
  fileExists(npmrcPath).then((exists) => exists ? readFile(npmrcPath, 'utf8') : ''),
]);

const disallowedPatterns = [
  /packages\.applied-caas/i,
  /internal\.api\.openai\.org/i,
  /https?:\/\/[^\/\s"']+@[^\/\s"']+/i,
  /reader:/i,
];

const matchedPattern = disallowedPatterns.find((pattern) => pattern.test(lockfileText));
if (matchedPattern) {
  console.error(`Lockfile contains a private or credentialed registry reference matching ${matchedPattern}.`);
  process.exit(1);
}

if (npmrcText && !/registry=https:\/\/registry\.npmjs\.org\/?/i.test(npmrcText)) {
  console.error('Project .npmrc exists but does not pin the public npm registry.');
  process.exit(1);
}

console.log('Lockfile registry check passed (no private registry or credentialed URLs found).');
