import { readFiles, runPatternChecks } from './check-helpers.mjs';

const files = await readFiles({
  groundbreaking: 'src/legacy/groundbreaking.js',
  executive: 'src/legacy/executive-deck.js',
  showcase: 'src/legacy/showcase-suite.js',
});

runPatternChecks('Showcase suite check', files, {
  required: [
    ['showcase import', 'groundbreaking', /createShowcaseSuite/],
    ['showcase instantiation', 'groundbreaking', /showcaseSuite\s*=\s*createShowcaseSuite\(/],
    ['showcase palette command founder', 'groundbreaking', /id:\s*'founder-mode'/],
    ['showcase palette command caption', 'groundbreaking', /id:\s*'showcase-caption'/],
    ['showcase palette command poster', 'groundbreaking', /id:\s*'showcase-poster'/],
    ['showcase palette command card', 'groundbreaking', /id:\s*'showcase-card'/],
    ['showcase toolbar button', 'groundbreaking', /data-role="showcase"/],
    ['showcase toolbar updater', 'groundbreaking', /updateShowcaseButton/],
    ['share URL founder param', 'groundbreaking', /\['founder',\s*stateWithMode\.founder/],
    ['share URL deck param', 'groundbreaking', /\['deck',\s*stateWithMode\.deck/],
    ['share URL tour param', 'groundbreaking', /\['tour',\s*stateWithMode\.tour/],
    ['executive founder action', 'executive', /data-action="founder"/],
    ['executive caption action', 'executive', /data-action="caption"/],
    ['executive poster action', 'executive', /data-action="poster"/],
    ['showcase public api', 'showcase', /window\.__SIGINT_MAP_SHOWCASE_SUITE__/],
    ['showcase founder mode toast', 'showcase', /Founder mode active/],
    ['showcase caption builder', 'showcase', /function buildCaption/],
    ['showcase poster builder', 'showcase', /function buildPosterSvg/],
    ['showcase snapshot builder', 'showcase', /function buildSnapshotCardHtml/],
    ['showcase keyboard shortcut', 'showcase', /event\.key === 'f' \|\| event\.key === 'F'/],
  ],
  forbidden: [
    ['showcase raw prompt', 'showcase', /window\.prompt\(/],
  ],
});
