/**
 * Tier Selector Usage Examples
 * Demonstrates how to use the tier selection system
 */

import {
  selectTier,
  selectTierSimple,
  analyzeBatch,
  createDistributionTracker,
  type Task,
} from './tier-selector';

// Example 1: Basic tier selection
function exampleBasicSelection() {
  console.log('=== Example 1: Basic Tier Selection ===\n');

  const task: Task = {
    description: 'Add new feature to user profile component',
  };

  const selection = selectTier(task);

  console.log(`Task: "${task.description}"`);
  console.log(`Recommended Tier: ${selection.tier}`);
  console.log(`Complexity Score: ${selection.score}`);
  console.log(`Reason: ${selection.reason}`);
  console.log(`In Overlap Zone: ${selection.inOverlapZone}`);
  console.log(`Can Escalate: ${selection.canEscalate}`);
  if (selection.escalationTier) {
    console.log(`Escalation Tier: ${selection.escalationTier}`);
  }
  console.log();
}

// Example 2: Simple tier selection (tier name only)
function exampleSimpleSelection() {
  console.log('=== Example 2: Simple Tier Selection ===\n');

  const tasks: Task[] = [
    { description: 'Fix typo in documentation' },
    { description: 'Implement user authentication with OAuth and JWT' },
    { description: 'Design microservices architecture for distributed system' },
  ];

  tasks.forEach(task => {
    const tier = selectTierSimple(task);
    console.log(`Task: "${task.description}"`);
    console.log(`Tier: ${tier}\n`);
  });
}

// Example 3: Overlap zone handling
function exampleOverlapZones() {
  console.log('=== Example 3: Overlap Zone Handling ===\n');

  // Task that might fall in lower overlap zone (25-30)
  const borderlineTask: Task = {
    description: `
      Update API endpoint to add new field
      - Modify endpoint handler
      - Add validation
      - Update tests
    `,
  };

  const selection = selectTier(borderlineTask);

  console.log(`Task: "${borderlineTask.description.trim()}"`);
  console.log(`Score: ${selection.score}`);
  console.log(`Selected Tier: ${selection.tier}`);

  if (selection.inOverlapZone) {
    console.log('\nThis task is in an overlap zone!');
    console.log(`You can escalate to: ${selection.escalationTier}`);
    console.log('Try the lower tier first, escalate if needed.');
  }
  console.log();
}

// Example 4: Distribution tracking
function exampleDistributionTracking() {
  console.log('=== Example 4: Distribution Tracking ===\n');

  const tracker = createDistributionTracker();

  // Simulate a day's worth of tasks
  const dailyTasks: Task[] = [
    { description: 'Fix bug in component' },
    { description: 'Update documentation' },
    { description: 'Add new feature to dashboard' },
    { description: 'Implement authentication system' },
    { description: 'Fix typo' },
    { description: 'Refactor database queries' },
    { description: 'Add unit tests' },
    { description: 'Update dependencies' },
    { description: 'Design new architecture' },
    { description: 'Fix linting error' },
  ];

  dailyTasks.forEach(task => {
    const selection = selectTier(task);
    tracker.record(selection.tier);
  });

  // Get and display distribution summary
  console.log(tracker.getSummary());
}

// Example 5: Batch analysis
function exampleBatchAnalysis() {
  console.log('=== Example 5: Batch Analysis ===\n');

  const tasks: Task[] = [
    { description: 'Fix typo in README' },
    { description: 'Add new API endpoint with validation' },
    {
      description: `
        Design and implement microservices architecture
        - Event sourcing
        - CQRS pattern
        - Service discovery
      `,
    },
    { description: 'Update package versions' },
    { description: 'Implement user profile page' },
  ];

  const result = analyzeBatch(tasks);

  console.log(`Analyzed ${result.distribution.total} tasks:\n`);

  // Show distribution
  console.log('Distribution:');
  console.log(`  Haiku:  ${result.distribution.haiku} (${result.percentages.haiku}%)`);
  console.log(`  Sonnet: ${result.distribution.sonnet} (${result.percentages.sonnet}%)`);
  console.log(`  Opus:   ${result.distribution.opus} (${result.percentages.opus}%)\n`);

  // Show validation
  console.log(`Validation: ${result.validation.isValid ? 'PASS' : 'FAIL'}`);
  if (!result.validation.isValid) {
    console.log('\nRecommendations:');
    result.validation.recommendations.forEach(rec => {
      console.log(`  - ${rec}`);
    });
  }

  console.log('\nDetailed selections:');
  result.selections.forEach((selection, i) => {
    console.log(
      `  ${i + 1}. [${selection.tier.toUpperCase()}] Score ${selection.score}: ${tasks[i].description.slice(0, 50)}...`
    );
  });
  console.log();
}

// Example 6: Real-world workflow simulation
function exampleRealWorldWorkflow() {
  console.log('=== Example 6: Real-World Workflow Simulation ===\n');

  const tracker = createDistributionTracker();

  // Week 1: Bug fixes and small features (mostly Haiku)
  const week1Tasks: Task[] = [
    { description: 'Fix button styling' },
    { description: 'Update error messages' },
    { description: 'Add tooltip to icon' },
    { description: 'Fix typo in label' },
    { description: 'Update README' },
  ];

  // Week 2: Feature development (mix of Haiku and Sonnet)
  const week2Tasks: Task[] = [
    { description: 'Implement search functionality with filters and pagination' },
    { description: 'Add form validation and error handling' },
    { description: 'Create dashboard with charts using D3.js' },
    { description: 'Fix loading states' },
    { description: 'Add unit tests for components' },
  ];

  // Week 3: Architecture work (Sonnet and Opus)
  const week3Tasks: Task[] = [
    {
      description: `
        Design and implement authentication system
        - OAuth integration
        - JWT tokens
        - Role-based access control
        - Session management
      `,
    },
    { description: 'Refactor API to use GraphQL' },
    { description: 'Update dependencies' },
  ];

  const allTasks = [...week1Tasks, ...week2Tasks, ...week3Tasks];

  console.log(`Processing ${allTasks.length} tasks across 3 weeks...\n`);

  allTasks.forEach(task => {
    const selection = selectTier(task);
    tracker.record(selection.tier);
  });

  console.log(tracker.getSummary());
}

// Example 7: Complexity breakdown analysis
function exampleComplexityBreakdown() {
  console.log('=== Example 7: Complexity Breakdown Analysis ===\n');

  const task: Task = {
    description: `
      Implement real-time chat feature with WebSocket
      - Set up WebSocket server with Socket.io
      - Create chat UI with React
      - Add message persistence with MongoDB
      - Implement user presence tracking
      - Add file upload support
    `,
  };

  const selection = selectTier(task);

  console.log(`Task: "${task.description.trim()}"`);
  console.log(`\nComplexity Score: ${selection.score}`);
  console.log(`Selected Tier: ${selection.tier}\n`);

  console.log('Score Contributions:');
  const { contributions, signals } = selection.breakdown;

  console.log(`  Token Count:       ${signals.tokenCount} tokens → ${contributions.tokenCount.toFixed(2)} points`);
  console.log(`  Question Count:    ${signals.questionCount} questions → ${contributions.questionCount.toFixed(2)} points`);
  console.log(`  Step Count:        ${signals.stepCount} steps → ${contributions.stepCount.toFixed(2)} points`);
  console.log(`  Domain Count:      ${signals.domainCount} domains → ${contributions.domainCount.toFixed(2)} points`);
  console.log(`  File Count:        ${signals.fileCount} files → ${contributions.fileCount.toFixed(2)} points`);
  console.log(`  Abstraction Level: ${signals.abstractionLevel}/5 → ${contributions.abstractionLevel.toFixed(2)} points`);

  console.log(`\nTotal Score: ${selection.score}/100`);
  console.log();
}

// Run all examples
function runAllExamples() {
  exampleBasicSelection();
  exampleSimpleSelection();
  exampleOverlapZones();
  exampleDistributionTracking();
  exampleBatchAnalysis();
  exampleRealWorldWorkflow();
  exampleComplexityBreakdown();
}

// Run examples if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export {
  exampleBasicSelection,
  exampleSimpleSelection,
  exampleOverlapZones,
  exampleDistributionTracking,
  exampleBatchAnalysis,
  exampleRealWorldWorkflow,
  exampleComplexityBreakdown,
  runAllExamples,
};
