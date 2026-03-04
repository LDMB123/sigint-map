#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();

const FILES = {
  taxonomyConfig: 'config/skill-taxonomy.json',
  rustGenerated: 'rust/skill_taxonomy_generated.rs',
  jsGenerated: 'public/skill-taxonomy.js',
  tracker: 'rust/tracker.rs',
  adaptiveQuests: 'rust/adaptive_quests.rs',
  skillProgression: 'rust/skill_progression.rs',
  worker: 'public/db-worker.js',
};

async function readText(relativePath) {
  return readFile(path.join(ROOT_DIR, relativePath), 'utf8');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractTrackerCategories(source) {
  const categories = new Set();
  const pattern = /\(\s*"[^"]*"\s*,\s*"([a-z-]+)"\s*,\s*"[^"]*"\s*\)/g;
  for (const match of source.matchAll(pattern)) {
    categories.add(match[1]);
  }
  return [...categories].sort();
}

async function main() {
  const failures = [];

  const [
    taxonomyRaw,
    rustGenerated,
    jsGenerated,
    tracker,
    adaptiveQuests,
    skillProgression,
    worker,
  ] = await Promise.all([
    readText(FILES.taxonomyConfig),
    readText(FILES.rustGenerated),
    readText(FILES.jsGenerated),
    readText(FILES.tracker),
    readText(FILES.adaptiveQuests),
    readText(FILES.skillProgression),
    readText(FILES.worker),
  ]);

  const taxonomy = JSON.parse(taxonomyRaw);
  const canonicalSkills = taxonomy.canonical_skills.map((skill) => skill.id);

  if (!Number.isInteger(taxonomy.version) || taxonomy.version < 1) {
    failures.push('config/skill-taxonomy.json: version must be positive integer');
  }

  if (canonicalSkills.length === 0) {
    failures.push('config/skill-taxonomy.json: canonical_skills must be non-empty');
  }

  for (const skillId of canonicalSkills) {
    const rustPattern = new RegExp(`"${escapeRegex(skillId)}"`);
    if (!rustPattern.test(rustGenerated)) {
      failures.push(`rust/skill_taxonomy_generated.rs: missing canonical skill ${skillId}`);
    }
    const jsPattern = new RegExp(`"${escapeRegex(skillId)}"`);
    if (!jsPattern.test(jsGenerated)) {
      failures.push(`public/skill-taxonomy.js: missing canonical skill ${skillId}`);
    }
  }

  const trackerCategories = extractTrackerCategories(tracker);
  const nonCanonicalTrackerCategories = trackerCategories.filter((cat) => !canonicalSkills.includes(cat));
  if (nonCanonicalTrackerCategories.length > 0) {
    failures.push(
      `rust/tracker.rs: non-canonical categories detected: ${nonCanonicalTrackerCategories.join(', ')}`,
    );
  }

  const requiredSourcePatterns = [
    {
      source: adaptiveQuests,
      file: FILES.adaptiveQuests,
      regex: /skill_taxonomy::skill_quest_indices\(/,
      description: 'adaptive quest indices sourced from taxonomy contract',
    },
    {
      source: skillProgression,
      file: FILES.skillProgression,
      regex: /skill_taxonomy::canonicalize_skill\(/,
      description: 'skill progression canonicalization',
    },
    {
      source: worker,
      file: FILES.worker,
      regex: /from "\.\/skill-taxonomy\.js"/,
      description: 'DB worker taxonomy import',
    },
    {
      source: worker,
      file: FILES.worker,
      regex: /CANONICAL_SKILLS/,
      description: 'DB worker canonical skill seeding path',
    },
    {
      source: worker,
      file: FILES.worker,
      regex: /SKILL_ALIASES/,
      description: 'DB worker alias mapping path',
    },
  ];

  for (const pattern of requiredSourcePatterns) {
    if (!pattern.regex.test(pattern.source)) {
      failures.push(`${pattern.file}: missing ${pattern.description}`);
    }
  }

  if (failures.length > 0) {
    console.error('❌ Taxonomy contract check failed:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `✅ Taxonomy contract check passed (canonical_skills=${canonicalSkills.length}, tracker_categories=${trackerCategories.length})`,
  );
}

main().catch((error) => {
  console.error(`❌ Taxonomy contract check crashed: ${error?.stack || error}`);
  process.exit(1);
});
