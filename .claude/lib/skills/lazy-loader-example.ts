/**
 * SkillLazyLoader Usage Examples
 *
 * Demonstrates practical usage patterns for the tiered skill loading system.
 */

import {
  SkillLazyLoader,
  createLoader,
  createLoaderWithStorage,
  LoadLevel,
  type LoaderStats,
} from './lazy-loader';

// ============================================================================
// Example 1: Basic Usage
// ============================================================================

async function example1_BasicUsage() {
  console.log('\n=== Example 1: Basic Usage ===\n');

  // Create loader with default config (8000 token budget)
  const loader = createLoader({ debug: true });

  // Load a skill header for routing decisions
  const header = await loader.loadHeader('rust-borrow-checker');
  console.log('Skill:', header?.skill);
  console.log('Domain:', header?.domain);
  console.log('Keywords:', header?.keywords.join(', '));

  // Load quick reference for simple fixes
  const quick = await loader.loadQuick('rust-borrow-checker');
  if (quick && 'quick_fixes' in quick) {
    console.log('\nQuick fixes:', quick.quick_fixes);
  }

  // Load full detail when needed
  const full = await loader.loadFull('rust-borrow-checker');
  if (full && 'error_details' in full) {
    console.log('\nError details:', full.error_details);
  }

  // Check stats
  const stats = loader.getStats();
  console.log(`\nToken usage: ${stats.currentTokens}/${stats.maxTokens}`);
}

// ============================================================================
// Example 2: Error Handler with Tiered Loading
// ============================================================================

async function example2_ErrorHandler() {
  console.log('\n=== Example 2: Error Handler ===\n');

  const loader = createLoader({ maxTokens: 5000 });

  async function handleError(errorCode: string): Promise<string> {
    // Step 1: Load all headers to find relevant skill
    const headers = await loader.loadAllHeaders();
    const relevantSkill = headers.find(h => h.errors?.includes(errorCode));

    if (!relevantSkill) {
      return `No skill found for error ${errorCode}`;
    }

    console.log(`Found skill: ${relevantSkill.skill}`);

    // Step 2: Try quick fix first
    const quick = await loader.loadQuick(relevantSkill.skill);
    if (quick && 'quick_fixes' in quick && quick.quick_fixes[errorCode]) {
      console.log(`Quick fix: ${quick.quick_fixes[errorCode]}`);
      return quick.quick_fixes[errorCode];
    }

    // Step 3: Load full details if needed
    const full = await loader.loadFull(relevantSkill.skill);
    if (full && 'error_details' in full && full.error_details![errorCode]) {
      const details = full.error_details![errorCode];
      console.log(`Detailed fix: ${details.fix}`);
      console.log(`Cause: ${details.cause}`);
      if (details.example) {
        console.log(`Example: ${details.example}`);
      }
      return details.fix;
    }

    return `No fix found for ${errorCode}`;
  }

  // Simulate error handling
  await handleError('E0502');
  await handleError('TS2345');

  const stats = loader.getStats();
  console.log(`\nLoaded ${stats.totalSkills} skills using ${stats.currentTokens} tokens`);
}

// ============================================================================
// Example 3: Progressive Loading with Budget Management
// ============================================================================

async function example3_BudgetManagement() {
  console.log('\n=== Example 3: Budget Management ===\n');

  // Create loader with tight budget
  const loader = createLoader({
    maxTokens: 1000,
    evictionThreshold: 200,
    debug: false,
  });

  function logStats(label: string) {
    const stats = loader.getStats();
    console.log(`${label}:`);
    console.log(`  Skills: ${stats.totalSkills} (H:${stats.levelCounts.header} Q:${stats.levelCounts.quick} F:${stats.levelCounts.full})`);
    console.log(`  Tokens: ${stats.currentTokens}/${stats.maxTokens} (${stats.utilization.toFixed(1)}%)`);
    console.log(`  Evictions: ${stats.evictions}`);
  }

  // Load multiple skills at header level
  await loader.preload([
    'rust-borrow-checker',
    'typescript-types',
    'debug-workflow',
  ]);
  logStats('\nAfter preload (headers only)');

  // User needs details on one skill
  await loader.loadFull('rust-borrow-checker');
  logStats('\nAfter loading full rust skill');

  // Load more full skills (triggers eviction)
  await loader.loadFull('typescript-types');
  logStats('\nAfter loading full typescript skill');

  await loader.loadFull('debug-workflow');
  logStats('\nAfter loading full debug skill');

  // Check what's still loaded
  console.log('\nCurrently loaded skills:', loader.getLoadedSkills());
}

// ============================================================================
// Example 4: Context-Aware Loading
// ============================================================================

async function example4_ContextAwareLoading() {
  console.log('\n=== Example 4: Context-Aware Loading ===\n');

  const loader = createLoader({ maxTokens: 8000 });

  interface Context {
    language: string;
    errorPattern?: RegExp;
    complexity: 'simple' | 'moderate' | 'complex';
  }

  async function loadRelevantSkills(context: Context): Promise<void> {
    console.log(`Loading skills for context:`, context);

    // Load all headers for filtering
    const headers = await loader.loadAllHeaders();

    // Filter by domain/language
    const relevant = headers.filter(h => {
      if (context.language && h.domain !== context.language) {
        return false;
      }
      return true;
    });

    console.log(`Found ${relevant.length} relevant skills`);

    // Load at appropriate level based on complexity
    for (const header of relevant) {
      switch (context.complexity) {
        case 'simple':
          // Just keep headers loaded
          break;
        case 'moderate':
          // Load quick reference
          await loader.loadQuick(header.skill);
          break;
        case 'complex':
          // Load full details
          await loader.loadFull(header.skill);
          break;
      }
    }

    const stats = loader.getStats();
    console.log(`Loaded at complexity level '${context.complexity}':`);
    console.log(`  Token usage: ${stats.currentTokens}/${stats.maxTokens}`);
  }

  // Different contexts
  await loadRelevantSkills({
    language: 'rust',
    complexity: 'simple',
  });

  await loadRelevantSkills({
    language: 'typescript',
    complexity: 'moderate',
  });

  await loadRelevantSkills({
    language: 'debug',
    complexity: 'complex',
  });
}

// ============================================================================
// Example 5: Skill Recommendation System
// ============================================================================

async function example5_RecommendationSystem() {
  console.log('\n=== Example 5: Skill Recommendation System ===\n');

  const loader = createLoader({ maxTokens: 5000 });

  async function recommendSkills(userQuery: string): Promise<string[]> {
    console.log(`User query: "${userQuery}"\n`);

    // Load all headers for matching
    const headers = await loader.loadAllHeaders();

    // Score skills by keyword match
    const scored = headers.map(header => {
      const queryWords = userQuery.toLowerCase().split(/\s+/);
      const matches = queryWords.filter(word =>
        header.keywords.some(kw => kw.includes(word) || word.includes(kw))
      );

      return {
        skill: header.skill,
        score: matches.length,
        header,
      };
    });

    // Sort by score
    const sorted = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    // Load quick ref for top matches
    const recommendations: string[] = [];
    for (const match of sorted.slice(0, 3)) {
      const quick = await loader.loadQuick(match.skill);
      recommendations.push(match.skill);
      console.log(`${match.skill} (score: ${match.score})`);

      if (quick && 'quick_fixes' in quick) {
        const fixes = Object.entries(quick.quick_fixes).slice(0, 2);
        fixes.forEach(([err, fix]) => {
          console.log(`  - ${err}: ${fix}`);
        });
      }
      console.log();
    }

    return recommendations;
  }

  await recommendSkills('rust borrow mutable reference error');
  await recommendSkills('typescript type checking problem');
  await recommendSkills('debugging workflow best practices');

  const stats = loader.getStats();
  console.log(`Total token usage: ${stats.currentTokens}/${stats.maxTokens}`);
  console.log(`Cache hit ratio: ${(stats.hitRatio * 100).toFixed(1)}%`);
}

// ============================================================================
// Example 6: Session Management
// ============================================================================

async function example6_SessionManagement() {
  console.log('\n=== Example 6: Session Management ===\n');

  const loader = createLoader({
    maxTokens: 3000,
    evictionThreshold: 500,
  });

  class Session {
    private activeSkills: Set<string> = new Set();

    async startTask(taskType: string) {
      console.log(`\nStarting task: ${taskType}`);

      // Load relevant skills for this task
      const skillsForTask: Record<string, string[]> = {
        'rust-debugging': ['rust-borrow-checker', 'rust-ownership'],
        'typescript-refactor': ['typescript-types', 'debug-workflow'],
        'general-debug': ['debug-workflow'],
      };

      const skills = skillsForTask[taskType] || [];

      for (const skillId of skills) {
        await loader.loadQuick(skillId);
        this.activeSkills.add(skillId);
      }

      console.log(`Loaded ${skills.length} skills for ${taskType}`);
      this.logSessionStats();
    }

    async focusSkill(skillId: string) {
      console.log(`\nFocusing on skill: ${skillId}`);
      await loader.loadFull(skillId);
      this.activeSkills.add(skillId);
      this.logSessionStats();
    }

    endTask() {
      console.log('\nEnding task, cleaning up...');
      // Optionally downgrade or unload skills
      for (const skillId of this.activeSkills) {
        loader.downgrade(skillId, LoadLevel.HEADER);
      }
      this.activeSkills.clear();
      this.logSessionStats();
    }

    private logSessionStats() {
      const stats = loader.getStats();
      console.log(`Session stats: ${stats.currentTokens}/${stats.maxTokens} tokens, ${stats.totalSkills} skills`);
    }
  }

  const session = new Session();
  await session.startTask('rust-debugging');
  await session.focusSkill('rust-borrow-checker');
  await session.endTask();

  await session.startTask('typescript-refactor');
  await session.focusSkill('typescript-types');
  await session.endTask();
}

// ============================================================================
// Example 7: With File System Storage
// ============================================================================

async function example7_FileSystemStorage() {
  console.log('\n=== Example 7: File System Storage ===\n');

  // This example shows how to use loader with actual files
  const skillsDir = '/path/to/compressed/skills';

  const loader = createLoaderWithStorage(skillsDir, {
    maxTokens: 8000,
    debug: true,
  });

  try {
    // Load skills from file system
    const headers = await loader.loadAllHeaders();
    console.log(`Discovered ${headers.length} skills from ${skillsDir}`);

    for (const header of headers.slice(0, 3)) {
      console.log(`  - ${header.skill} (${header.domain})`);
    }
  } catch (error) {
    console.log('Note: This example requires actual skill files in:', skillsDir);
    console.log('Error:', error);
  }
}

// ============================================================================
// Run Examples
// ============================================================================

async function runExamples() {
  console.log('='.repeat(60));
  console.log('SkillLazyLoader Usage Examples');
  console.log('='.repeat(60));

  const examples = [
    { name: 'Basic Usage', fn: example1_BasicUsage },
    { name: 'Error Handler', fn: example2_ErrorHandler },
    { name: 'Budget Management', fn: example3_BudgetManagement },
    { name: 'Context-Aware Loading', fn: example4_ContextAwareLoading },
    { name: 'Recommendation System', fn: example5_RecommendationSystem },
    { name: 'Session Management', fn: example6_SessionManagement },
    { name: 'File System Storage', fn: example7_FileSystemStorage },
  ];

  for (const example of examples) {
    try {
      await example.fn();
    } catch (error) {
      console.error(`\nExample '${example.name}' failed:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Examples complete!');
  console.log('='.repeat(60));
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export { runExamples };
