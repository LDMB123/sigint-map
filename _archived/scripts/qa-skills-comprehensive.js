#!/usr/bin/env node

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { parse as parseYaml } from 'yaml';

const LOCATIONS = [
  '/Users/louisherman/.claude/skills',
  '/Users/louisherman/ClaudeCodeProjects/.claude/skills',
  '/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude/skills'
];

const LOCATION_NAMES = ['Global', 'ClaudeCodeProjects', 'DMB-Almanac'];

class QAReport {
  constructor() {
    this.results = {
      fileLocationValidation: { pass: true, issues: [], warnings: [] },
      yamlIntegrity: { pass: true, issues: [], warnings: [] },
      crossLocationConsistency: { pass: true, issues: [], warnings: [] },
      referenceIntegrity: { pass: true, issues: [], warnings: [] },
      invocability: { pass: true, issues: [], warnings: [] },
      contentQuality: { pass: true, issues: [], warnings: [] },
      coordinationValidation: { pass: true, issues: [], warnings: [] },
      documentationSync: { pass: true, issues: [], warnings: [] }
    };
  }

  fail(category, issue) {
    this.results[category].pass = false;
    this.results[category].issues.push(issue);
  }

  warn(category, warning) {
    this.results[category].warnings.push(warning);
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('CLAUDE CODE SKILLS ECOSYSTEM - COMPREHENSIVE QA REPORT');
    console.log('='.repeat(80) + '\n');

    let totalIssues = 0;
    let totalWarnings = 0;
    let passCount = 0;
    let failCount = 0;

    for (const [category, result] of Object.entries(this.results)) {
      const status = result.pass ? '✅ PASS' : '❌ FAIL';
      const categoryName = category.replace(/([A-Z])/g, ' $1').trim().toUpperCase();

      console.log(`${status} - ${categoryName}`);

      if (result.issues.length > 0) {
        failCount++;
        console.log(`  Critical Issues: ${result.issues.length}`);
        result.issues.forEach((issue, i) => {
          console.log(`    ${i + 1}. ${issue}`);
        });
        totalIssues += result.issues.length;
      } else {
        passCount++;
      }

      if (result.warnings.length > 0) {
        console.log(`  Warnings: ${result.warnings.length}`);
        result.warnings.forEach((warning, i) => {
          console.log(`    ${i + 1}. ${warning}`);
        });
        totalWarnings += result.warnings.length;
      }
      console.log();
    }

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Checks: ${Object.keys(this.results).length}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Critical Issues: ${totalIssues}`);
    console.log(`Warnings: ${totalWarnings}`);
    console.log();

    const productionReady = failCount === 0;
    console.log(`Production Ready: ${productionReady ? '✅ YES' : '❌ NO'}`);
    console.log('='.repeat(80) + '\n');

    return productionReady;
  }
}

function getAllSkills(location) {
  const skills = [];

  function traverse(dir, depth = 0) {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && depth < 10) {
        traverse(fullPath, depth + 1);
      } else if (stat.isFile() && entry.endsWith('.md')) {
        skills.push({ path: fullPath, depth, name: entry });
      }
    }
  }

  traverse(location);
  return skills;
}

function getTopLevelSkills(location) {
  if (!existsSync(location)) return [];
  return readdirSync(location)
    .filter(f => f.endsWith('.md') && statSync(join(location, f)).isFile())
    .map(f => join(location, f));
}

function extractYamlFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return match[1];
}

function parseSkillFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const yamlContent = extractYamlFrontmatter(content);

    if (!yamlContent) {
      return { error: 'No YAML frontmatter found', content };
    }

    const yaml = parseYaml(yamlContent);
    const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');

    return { yaml, body, content };
  } catch (error) {
    return { error: error.message };
  }
}

function checkFileLocations(report) {
  console.log('Running Check 1: File Location Validation...');

  LOCATIONS.forEach((location, i) => {
    const locationName = LOCATION_NAMES[i];

    if (!existsSync(location)) {
      report.fail('fileLocationValidation', `${locationName}: Directory does not exist at ${location}`);
      return;
    }

    const allSkills = getAllSkills(location);
    const topLevel = getTopLevelSkills(location);
    const inSubdirs = allSkills.filter(s => s.depth > 0);

    console.log(`  ${locationName}: ${topLevel.length} top-level, ${inSubdirs.length} in subdirectories`);

    if (inSubdirs.length > 0) {
      report.warn('fileLocationValidation',
        `${locationName}: ${inSubdirs.length} skills in subdirectories (non-invocable)`);
    }

    // Check for expected minimums
    if (locationName === 'Global' && topLevel.length < 250) {
      report.warn('fileLocationValidation',
        `${locationName}: Expected 277+ top-level skills, found ${topLevel.length}`);
    }
    if (locationName === 'DMB-Almanac' && topLevel.length < 250) {
      report.warn('fileLocationValidation',
        `${locationName}: Expected 278+ top-level skills, found ${topLevel.length}`);
    }
  });
}

function checkYamlIntegrity(report) {
  console.log('\nRunning Check 2: YAML Integrity...');

  let totalSkills = 0;
  let totalErrors = 0;
  let missingFields = 0;
  let nameMismatches = 0;

  LOCATIONS.forEach((location, i) => {
    const locationName = LOCATION_NAMES[i];
    if (!existsSync(location)) return;

    const skills = getTopLevelSkills(location);
    totalSkills += skills.length;

    skills.forEach(skillPath => {
      const parsed = parseSkillFile(skillPath);
      const filename = basename(skillPath, '.md');

      if (parsed.error) {
        totalErrors++;
        report.fail('yamlIntegrity',
          `${locationName}/${filename}.md: ${parsed.error}`);
        return;
      }

      // Check required fields
      if (!parsed.yaml) {
        missingFields++;
        report.fail('yamlIntegrity',
          `${locationName}/${filename}.md: Missing YAML frontmatter`);
        return;
      }

      if (!parsed.yaml.name) {
        missingFields++;
        report.fail('yamlIntegrity',
          `${locationName}/${filename}.md: Missing 'name' field`);
      }

      if (!parsed.yaml.description) {
        missingFields++;
        report.warn('yamlIntegrity',
          `${locationName}/${filename}.md: Missing 'description' field`);
      }

      // Check name/filename sync
      if (parsed.yaml.name && parsed.yaml.name !== filename) {
        nameMismatches++;
        report.fail('yamlIntegrity',
          `${locationName}/${filename}.md: Name mismatch (YAML: '${parsed.yaml.name}', File: '${filename}')`);
      }
    });
  });

  console.log(`  Validated ${totalSkills} skills`);
  console.log(`  Parse errors: ${totalErrors}`);
  console.log(`  Missing fields: ${missingFields}`);
  console.log(`  Name mismatches: ${nameMismatches}`);
}

function checkCrossLocationConsistency(report) {
  console.log('\nRunning Check 3: Cross-Location Consistency...');

  const locationSkills = LOCATIONS.map((location, i) => {
    if (!existsSync(location)) return { location: LOCATION_NAMES[i], skills: new Set() };

    const skills = getTopLevelSkills(location);
    const names = new Set(skills.map(s => basename(s, '.md')));
    return { location: LOCATION_NAMES[i], skills: names };
  });

  // Find skills unique to each location
  locationSkills.forEach((loc, i) => {
    const others = locationSkills.filter((_, j) => j !== i);
    const uniqueToThis = [...loc.skills].filter(skill =>
      !others.some(other => other.skills.has(skill))
    );

    if (uniqueToThis.length > 0) {
      console.log(`  ${loc.location}: ${uniqueToThis.length} unique skills`);
      if (uniqueToThis.length <= 5) {
        report.warn('crossLocationConsistency',
          `${loc.location} has unique skills: ${uniqueToThis.join(', ')}`);
      } else {
        report.warn('crossLocationConsistency',
          `${loc.location} has ${uniqueToThis.length} unique skills`);
      }
    }
  });

  // Check for critical skills in all locations
  const criticalSkills = ['commit', 'review', 'debug', 'test-generate', 'perf-audit'];
  criticalSkills.forEach(skill => {
    const locations = locationSkills.filter(loc => loc.skills.has(skill));
    if (locations.length < locationSkills.length) {
      report.warn('crossLocationConsistency',
        `Critical skill '${skill}' missing from some locations`);
    }
  });
}

function checkReferenceIntegrity(report) {
  console.log('\nRunning Check 4: Reference Integrity...');

  let totalReferences = 0;
  let brokenReferences = 0;
  let hardcodedPaths = 0;

  LOCATIONS.forEach((location, i) => {
    const locationName = LOCATION_NAMES[i];
    if (!existsSync(location)) return;

    const skills = getTopLevelSkills(location);

    skills.forEach(skillPath => {
      const parsed = parseSkillFile(skillPath);
      if (parsed.error || !parsed.body) return;

      // Check for file references
      const fileRefs = parsed.body.match(/\[(.*?)\]\((.*?)\)/g) || [];
      totalReferences += fileRefs.length;

      fileRefs.forEach(ref => {
        const match = ref.match(/\[(.*?)\]\((.*?)\)/);
        if (!match) return;

        const [, , path] = match;

        // Check for hardcoded absolute paths
        if (path.startsWith('/Users/') || path.startsWith('/home/')) {
          hardcodedPaths++;
          report.fail('referenceIntegrity',
            `${locationName}/${basename(skillPath)}: Hardcoded path: ${path}`);
        }

        // Check if relative path exists (skip URLs)
        if (!path.startsWith('http') && !path.startsWith('#')) {
          const refPath = path.startsWith('.')
            ? join(location, path)
            : join(location, path);

          if (!existsSync(refPath)) {
            brokenReferences++;
            report.warn('referenceIntegrity',
              `${locationName}/${basename(skillPath)}: Broken reference: ${path}`);
          }
        }
      });

      // Check coordination references
      if (parsed.yaml?.coordination) {
        const coordination = parsed.yaml.coordination;
        ['before', 'after', 'related'].forEach(key => {
          if (coordination[key]) {
            const refs = Array.isArray(coordination[key]) ? coordination[key] : [coordination[key]];
            refs.forEach(ref => {
              totalReferences++;
              const refPath = join(location, `${ref}.md`);
              if (!existsSync(refPath)) {
                brokenReferences++;
                report.fail('referenceIntegrity',
                  `${locationName}/${basename(skillPath)}: Broken coordination ref: ${ref}`);
              }
            });
          }
        });
      }
    });
  });

  console.log(`  Checked ${totalReferences} references`);
  console.log(`  Broken references: ${brokenReferences}`);
  console.log(`  Hardcoded paths: ${hardcodedPaths}`);
}

function checkInvocability(report) {
  console.log('\nRunning Check 5: Invocability Test...');

  // Check for phantom skills that were reported
  const phantomSkills = ['lighthouse-webvitals-expert', 'accessibility-specialist'];

  LOCATIONS.forEach((location, i) => {
    const locationName = LOCATION_NAMES[i];
    if (!existsSync(location)) return;

    phantomSkills.forEach(skill => {
      const skillPath = join(location, `${skill}.md`);
      if (existsSync(skillPath)) {
        report.warn('invocability',
          `${locationName}: Phantom skill '${skill}' exists (should not be invocable)`);
      }
    });
  });

  // Sample test of actual skills
  const testSkills = ['commit', 'review', 'debug', 'perf-audit', 'parallel-audit'];

  LOCATIONS.forEach((location, i) => {
    const locationName = LOCATION_NAMES[i];
    if (!existsSync(location)) return;

    testSkills.forEach(skill => {
      const skillPath = join(location, `${skill}.md`);
      if (!existsSync(skillPath)) {
        report.fail('invocability',
          `${locationName}: Expected skill '${skill}' not found`);
        return;
      }

      const parsed = parseSkillFile(skillPath);
      if (parsed.error) {
        report.fail('invocability',
          `${locationName}/${skill}.md: Cannot parse - ${parsed.error}`);
      }
    });
  });

  console.log(`  Checked phantom skills: ${phantomSkills.length}`);
  console.log(`  Tested sample skills: ${testSkills.length}`);
}

function checkContentQuality(report) {
  console.log('\nRunning Check 6: Content Quality...');

  let unclosedBlocks = 0;
  let todoMarkers = 0;
  let placeholderText = 0;

  LOCATIONS.forEach((location, i) => {
    const locationName = LOCATION_NAMES[i];
    if (!existsSync(location)) return;

    const skills = getTopLevelSkills(location);

    skills.forEach(skillPath => {
      const parsed = parseSkillFile(skillPath);
      if (parsed.error || !parsed.body) return;

      const body = parsed.body;

      // Check for unclosed code blocks
      const codeBlockCount = (body.match(/```/g) || []).length;
      if (codeBlockCount % 2 !== 0) {
        unclosedBlocks++;
        report.fail('contentQuality',
          `${locationName}/${basename(skillPath)}: Unclosed code block`);
      }

      // Check for TODO/FIXME
      if (/TODO|FIXME/i.test(body)) {
        todoMarkers++;
        report.warn('contentQuality',
          `${locationName}/${basename(skillPath)}: Contains TODO/FIXME markers`);
      }

      // Check for placeholder text
      if (/\[placeholder\]|\[TBD\]|\[TODO\]/i.test(body)) {
        placeholderText++;
        report.fail('contentQuality',
          `${locationName}/${basename(skillPath)}: Contains placeholder text`);
      }
    });
  });

  console.log(`  Unclosed code blocks: ${unclosedBlocks}`);
  console.log(`  TODO/FIXME markers: ${todoMarkers}`);
  console.log(`  Placeholder text: ${placeholderText}`);
}

function checkCoordination(report) {
  console.log('\nRunning Check 7: Coordination Validation...');

  let skillsWithCoordination = 0;
  let workflowChains = 0;
  let brokenChains = 0;

  LOCATIONS.forEach((location, i) => {
    const locationName = LOCATION_NAMES[i];
    if (!existsSync(location)) return;

    const skills = getTopLevelSkills(location);

    skills.forEach(skillPath => {
      const parsed = parseSkillFile(skillPath);
      if (parsed.error || !parsed.yaml) return;

      if (parsed.yaml.coordination) {
        skillsWithCoordination++;

        const coord = parsed.yaml.coordination;
        if (coord.workflow) workflowChains++;

        // Check workflow chain completeness
        if (coord.before) {
          const refs = Array.isArray(coord.before) ? coord.before : [coord.before];
          refs.forEach(ref => {
            const refPath = join(location, `${ref}.md`);
            if (!existsSync(refPath)) {
              brokenChains++;
            }
          });
        }

        if (coord.after) {
          const refs = Array.isArray(coord.after) ? coord.after : [coord.after];
          refs.forEach(ref => {
            const refPath = join(location, `${ref}.md`);
            if (!existsSync(refPath)) {
              brokenChains++;
            }
          });
        }
      }
    });
  });

  console.log(`  Skills with coordination: ${skillsWithCoordination}`);
  console.log(`  Workflow chains: ${workflowChains}`);
  console.log(`  Broken chains: ${brokenChains}`);

  if (skillsWithCoordination < 20) {
    report.warn('coordinationValidation',
      `Expected 25+ skills with coordination, found ${skillsWithCoordination}`);
  }
}

function checkDocumentation(report) {
  console.log('\nRunning Check 8: Documentation Sync...');

  const docFiles = [
    'SKILL_INDEX.md',
    'SKILL_COORDINATION_MATRIX.md',
    'TOKEN_OPTIMIZATION_PRINCIPLES.md',
    'SKILL_INTEGRATION_PATTERNS.md'
  ];

  LOCATIONS.forEach((location, i) => {
    const locationName = LOCATION_NAMES[i];
    if (!existsSync(location)) return;

    docFiles.forEach(doc => {
      const docPath = join(location, doc);
      if (!existsSync(docPath)) {
        report.warn('documentationSync',
          `${locationName}: Documentation file '${doc}' missing`);
      }
    });
  });
}

async function main() {
  const report = new QAReport();

  try {
    checkFileLocations(report);
    checkYamlIntegrity(report);
    checkCrossLocationConsistency(report);
    checkReferenceIntegrity(report);
    checkInvocability(report);
    checkContentQuality(report);
    checkCoordination(report);
    checkDocumentation(report);

    const productionReady = report.generateReport();
    process.exit(productionReady ? 0 : 1);
  } catch (error) {
    console.error('\n❌ QA Script Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
