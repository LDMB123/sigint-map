import { readFiles, runPatternChecks } from './check-helpers.mjs';

const texts = await readFiles({
  fusion: 'src/legacy/fusion-center.js',
  watch: 'src/legacy/watch-center.js',
  ops: 'src/legacy/ops-workbench.js',
  executive: 'src/legacy/executive-deck.js',
  groundbreaking: 'src/legacy/groundbreaking.js',
});

runPatternChecks('Render optimization check', texts, {
  required: [
    ['fusion render guard', 'fusion', /setInnerHtmlIfChanged\(\s*body,/],
    ['fusion emit signature', 'fusion', /stableSerialize\(\{[\s\S]*summary,[\s\S]*incidents:/],
    ['watch summary render guard', 'watch', /setInnerHtmlIfChanged\(summaryHost,/],
    ['watch suggestions render guard', 'watch', /setInnerHtmlIfChanged\(suggestionsHost,/],
    ['watch zones render guard', 'watch', /setInnerHtmlIfChanged\(zonesHost,/],
    ['watch alerts label guard', 'watch', /setTextContentIfChanged\(alertsBtn,/],
    ['ops pulse render guard', 'ops', /setInnerHtmlIfChanged\(pulse,/],
    ['ops body render guard', 'ops', /setInnerHtmlIfChanged\(body,/],
    ['ops footer text guard', 'ops', /setTextContentIfChanged\([\s\S]*footerMeta/],
    ['ops stable updatedAt', 'ops', /const stableUpdatedAt = Number\(incident\?\.freshestTimestamp\) \|\| Number\(previous\?\.updatedAt\) \|\| Date\.now\(\);/],
    ['executive launcher render guard', 'executive', /setInnerHtmlIfChanged\(launcher,/],
    ['executive panel render guard', 'executive', /setInnerHtmlIfChanged\(panel,/],
    ['executive spotlight render guard', 'executive', /setInnerHtmlIfChanged\(spotlight,/],
    ['executive emit signature', 'executive', /stableSerialize\(\{[\s\S]*summary,[\s\S]*incidents:/],
    ['health panel render guard', 'groundbreaking', /setInnerHtmlIfChanged\(content,/],
    ['palette render guard', 'groundbreaking', /setInnerHtmlIfChanged\(list,/],
  ],
});
