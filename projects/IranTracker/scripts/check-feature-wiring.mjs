import { readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const htmlPath = path.join(projectRoot, 'src', 'legacy', 'dashboard.html');
const jsPath = path.join(projectRoot, 'src', 'legacy', 'app.js');

const [htmlText, jsText] = await Promise.all([
  readFile(htmlPath, 'utf8'),
  readFile(jsPath, 'utf8'),
]);

const requiredMarkupIds = [
  'aircraft-section',
  'seismic-section',
  'thermal-section',
  'sigmet-section',
  'adsb-section',
  'maritime-section',
  'radiation-section',
  'conflict-section',
  'weather-section',
  'marine-section',
  'analytics-section',
  'news-section',
  'weather-source-item',
  'marine-source-item',
  'search-match-count',
  'search-clear',
];

const requiredCodePatterns = [
  /function disposeSceneObject\(object\)/,
  /window\.showDetailPanel\s*=\s*openDetailPanel/,
  /type:\s*'STATE_SYNC',[\s\S]*isPrimary:\s*nw_isPrimary/,
  /case 'DEPART':/,
  /setCurrentFilter\(filter\)/,
  /function nw_inlineRunWorkerTask\(task, payload = \{\}\)/,
  /shouldRunDataSource\('analytics-section'\)/,
  /shouldRunDataSource\('news-section'\)/,
  /el\.id === 'ais-maritime-src' \|\| label\.includes\('Maritime AIS'\) \|\| label\.includes\('AIS Maritime'\)/,
];

const missingMarkup = requiredMarkupIds.filter((id) => !htmlText.includes(`id="${id}"`));
const missingPatterns = requiredCodePatterns.filter((pattern) => !pattern.test(jsText));

if (missingMarkup.length || missingPatterns.length) {
  if (missingMarkup.length) {
    console.error('Missing feature-wiring markup IDs:', missingMarkup.join(', '));
  }

  if (missingPatterns.length) {
    console.error('Missing feature-wiring code patterns:', missingPatterns.map(String).join(', '));
  }

  process.exit(1);
}

console.log(`Feature wiring check passed (${requiredMarkupIds.length} markup IDs, ${requiredCodePatterns.length} code checks).`);
