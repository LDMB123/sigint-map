import { readFiles, runPatternChecks } from './check-helpers.mjs';

const files = await readFiles({
  groundbreaking: 'src/legacy/groundbreaking.js',
  fusion: 'src/legacy/fusion-center.js',
  watch: 'src/legacy/watch-center.js',
  executive: 'src/legacy/executive-deck.js',
  ops: 'src/legacy/ops-workbench.js',
});

runPatternChecks('Enhancement contract check', files, {
  required: [
    ['groundbreaking import', 'groundbreaking', /import\s+\{\s*createWatchCenter\s*\}\s+from\s+'\.\/watch-center\.js';/],
    ['executive deck import', 'groundbreaking', /import\s+\{\s*createExecutiveDeck\s*\}\s+from\s+'\.\/executive-deck\.js';/],
    ['watch center instantiation', 'groundbreaking', /watchCenter\s*=\s*createWatchCenter\(/],
    ['executive deck instantiation', 'groundbreaking', /executiveDeck\s*=\s*createExecutiveDeck\(/],
    ['palette watch command', 'groundbreaking', /id:\s*'watch-center'/],
    ['palette deck command', 'groundbreaking', /id:\s*'deck'/],
    ['palette deck tour command', 'groundbreaking', /id:\s*'deck-tour'/],
    ['toolbar watch button', 'groundbreaking', /data-role="watch"/],
    ['toolbar deck button', 'groundbreaking', /data-role="deck"/],
    ['fusion track zone action', 'fusion', /data-action="zone"/],
    ['fusion context hook', 'fusion', /context\.addWatchZone\?\.\(incident\)/],
    ['watch center global api', 'watch', /window\.__SIGINT_MAP_WATCH_CENTER__/],
    ['watch center emits updates', 'watch', /sigint:watch-center-update/],
    ['watch center quick-track suggestions', 'watch', /data-incident-id=/],
    ['watch center brief handoff', 'watch', /context\.addBriefItem\?\.\(snapshot\.topIncident\)/],
    ['executive deck global api', 'executive', /window\.__SIGINT_MAP_EXECUTIVE_DECK__/],
    ['executive deck cinematic next action', 'executive', /spotlight-next/],
    ['executive deck listens to watch updates', 'executive', /sigint:watch-center-update/],
    ['executive deck tour pool', 'executive', /getTourPool/],
    ['glass prompt import in groundbreaking', 'groundbreaking', /requestGlassPrompt/],
    ['glass prompt import in ops workbench', 'ops', /requestGlassPrompt/],
  ],
  forbidden: [
    ['raw prompt in groundbreaking', 'groundbreaking', /window\.prompt\(/],
    ['raw prompt in ops workbench', 'ops', /window\.prompt\(/],
  ],
});
