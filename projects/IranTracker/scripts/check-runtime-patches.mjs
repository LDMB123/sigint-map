import { readFiles, runPatternChecks } from './check-helpers.mjs';

const texts = await readFiles({ patches: 'src/legacy/runtime-patches.js' });

runPatternChecks('Runtime patches check', texts, {
  required: [
    ['tracked fetch start helper', 'patches', /function beginTrackedFetch\(/],
    ['tracked fetch finish helper', 'patches', /function finishTrackedFetch\(/],
    ['pending decrement guard', 'patches', /Math\.max\(0, \(Number\(previous\.pending\) \|\| 0\) - 1\)/],
    ['restore clears fetch restore handle', 'patches', /window\.__SIGINT_MAP_FETCH_RESTORE__ = undefined;/],
    ['restore clears image loader restore handle', 'patches', /window\.__SIGINT_MAP_IMAGELOADER_RESTORE__ = undefined;/],
  ],
  forbidden: [
    ['hard-coded pending start value', 'patches', /pending:\s*1/],
    ['hard-coded pending reset value', 'patches', /pending:\s*0/],
  ],
});
