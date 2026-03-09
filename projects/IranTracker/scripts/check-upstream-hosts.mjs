import { readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const jsPath = path.join(projectRoot, 'src', 'legacy', 'app.js');
const allowlistPath = path.join(projectRoot, 'src', 'lib', 'upstream-proxy.js');

const IGNORED_PROXY_HOSTS = new Set(['api.allorigins.win', 'api.codetabs.com']);

const [jsText, allowlistText] = await Promise.all([
  readFile(jsPath, 'utf8'),
  readFile(allowlistPath, 'utf8'),
]);

const hosts = new Set(
  [...jsText.matchAll(/https?:\/\/([^\/'"` )]+)/g)].map(([, host]) => host.toLowerCase()),
);

const allowlist = new Set(
  [...allowlistText.matchAll(/'([^']+)'/g)]
    .map(([, value]) => value)
    .filter((value) => value.includes('.')),
);

const missingHosts = [...hosts]
  .filter((host) => !allowlist.has(host) && !IGNORED_PROXY_HOSTS.has(host))
  .sort();

if (missingHosts.length > 0) {
  console.error('Missing upstream hosts:', missingHosts.join(', '));
  process.exit(1);
}

console.log(`Upstream host check passed (${hosts.size} hosts referenced).`);
