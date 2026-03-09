import { readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const jsPath = path.join(projectRoot, 'src', 'legacy', 'app.js');
const htmlPath = path.join(projectRoot, 'src', 'legacy', 'dashboard.html');

const RUNTIME_IDS = new Set([
  'nw-bell-btn',
  'nw-bell-icon',
  'nw-bell-label',
  'nw-copy-btn',
  'nw-copy-label',
  'nw-draw-calls',
  'nw-fid',
  'nw-fps',
  'nw-frame-ms',
  'nw-geo-btn',
  'nw-geo-label',
  'nw-geo-readout',
  'nw-geometries',
  'nw-lcp',
  'nw-lock-label',
  'nw-long-tasks',
  'nw-paused-timer',
  'nw-perf-overlay',
  'nw-triangles',
  'nw-wakelock-btn',
  'oil-price-change',
  'search-clear',
  'search-match-count',
]);

const [jsText, htmlText] = await Promise.all([
  readFile(jsPath, 'utf8'),
  readFile(htmlPath, 'utf8'),
]);

const jsRefs = new Set(
  [...jsText.matchAll(/getElementById\('([^']+)'\)|getElementById\("([^"]+)"\)/g)]
    .map(([, single, double]) => single || double)
    .filter(Boolean),
);

const htmlIds = new Set([...htmlText.matchAll(/id="([^"]+)"/g)].map(([, id]) => id));
const unresolved = [...jsRefs].filter((id) => !htmlIds.has(id) && !RUNTIME_IDS.has(id)).sort();

if (unresolved.length > 0) {
  console.error('Unresolved dashboard IDs:', unresolved.join(', '));
  process.exit(1);
}

console.log(`Dashboard ID check passed (${jsRefs.size} JS refs, ${htmlIds.size} markup IDs).`);
