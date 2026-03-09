import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, collectFiles } from './check-helpers.mjs';

const clientFiles = await collectFiles(path.join(ROOT, 'src'), /\.(js|jsx)$/);

const secretPatterns = [
  {
    label: 'query-string API key in client bundle',
    regex: /https?:\/\/[^\s'"`]+(?:apiKey|api_key|token|key)=([A-Za-z0-9._-]{8,})/gi,
  },
  {
    label: 'hard-coded client key variable',
    regex: /\b(?:const|let|var)\s+[A-Z0-9_]*(?:KEY|TOKEN)[A-Z0-9_]*\s*=\s*['"`]([A-Za-z0-9._-]{16,})['"`]/g,
  },
  {
    label: 'bearer token literal in client bundle',
    regex: /Bearer\s+[A-Za-z0-9._-]{16,}/g,
  },
];

const findings = [];

for (const file of clientFiles) {
  const text = await readFile(file, 'utf8');

  for (const { label, regex } of secretPatterns) {
    const matches = [...text.matchAll(regex)];
    for (const match of matches) {
      findings.push({
        file: path.relative(ROOT, file),
        label,
        sample: match[0].slice(0, 120),
      });
    }
  }
}

if (findings.length > 0) {
  console.error('Client secret scan failed:');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.label} -> ${finding.sample}`);
  }
  process.exit(1);
}

console.log(`Client secret scan passed (${clientFiles.length} files checked).`);
