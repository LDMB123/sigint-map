import { readFiles, runPatternChecks } from './check-helpers.mjs';

const texts = await readFiles({
  proxy: 'src/lib/upstream-proxy.js',
  routeHelper: 'src/lib/upstream-route.js',
  proxyRoute: 'app/api/proxy/route.js',
  allOriginsRoute: 'app/api/allorigins-get/route.js',
  firmsRoute: 'app/api/firms/route.js',
  radiationRoute: 'app/api/openradiation/route.js',
});

runPatternChecks('Proxy hardening check', texts, {
  required: [
    ['manual redirect mode', 'proxy', /redirect:\s*'manual'/],
    ['no automatic redirect follow', 'proxy', /^((?!redirect:\s*'follow').)*$/s],
    ['redirect safety cap', 'proxy', /export const MAX_UPSTREAM_REDIRECTS = 3;/],
    ['redirect target resolver', 'proxy', /function resolveRedirectTarget\(/],
    ['redirect revalidation', 'proxy', /Unsafe upstream redirect blocked:/],
    ['shared route proxy helper', 'routeHelper', /export async function proxyUpstreamResponse\(/],
    ['shared route factory', 'routeHelper', /export function createUrlProxyHandler\(/],
    ['proxy route uses shared factory', 'proxyRoute', /createUrlProxyHandler\(\)/],
    ['allorigins route uses shared factory', 'allOriginsRoute', /createUrlProxyHandler\(\{ wrapTextAsJsonKey: 'contents' \}\)/],
    ['firms route uses shared helper', 'firmsRoute', /proxyUpstreamResponse\(request, buildTarget\(apiKey\)\)/],
    ['openradiation route uses shared helper', 'radiationRoute', /proxyUpstreamResponse\(request, buildTarget\(apiKey\)\)/],
  ],
});
