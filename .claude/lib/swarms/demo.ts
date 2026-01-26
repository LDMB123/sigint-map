#!/usr/bin/env node
/**
 * Work Distributor - Interactive Demo
 * Run: npx tsx .claude/lib/swarms/demo.ts
 */

import { WorkDistributor, createSubtask } from './work-distributor';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function clearLine() {
  process.stdout.write('\r\x1b[K');
}

async function runDemo() {
  log('\n╔═══════════════════════════════════════════════════╗', 'bright');
  log('║   Work Distributor - Live Demonstration          ║', 'bright');
  log('╚═══════════════════════════════════════════════════╝\n', 'bright');

  // Configuration
  const TASK_COUNT = 200;
  const WORKER_COUNT = 75;
  const SIMULATE_FAILURES = true;
  const FAILURE_RATE = 0.08; // 8% failure rate

  log(`Configuration:`, 'cyan');
  log(`  • Tasks: ${TASK_COUNT}`, 'dim');
  log(`  • Workers: ${WORKER_COUNT}`, 'dim');
  log(`  • Failure Simulation: ${SIMULATE_FAILURES ? 'Enabled' : 'Disabled'}`, 'dim');
  log(`  • Expected Failure Rate: ${(FAILURE_RATE * 100).toFixed(1)}%\n`, 'dim');

  // Create subtasks with varying priorities
  const subtasks = Array.from({ length: TASK_COUNT }, (_, i) => {
    let priority = 10;

    // High priority for first 20%
    if (i < TASK_COUNT * 0.2) priority = 20;
    // Low priority for last 20%
    else if (i >= TASK_COUNT * 0.8) priority = 5;

    return createSubtask(
      `task-${String(i).padStart(4, '0')}`,
      {
        index: i,
        data: `data-${i}`,
        timestamp: Date.now()
      },
      {
        priority,
        maxRetries: 3,
        estimatedDurationMs: 100
      }
    );
  });

  log('Starting parallel processing...\n', 'green');

  let lastPercentage = -1;
  let completedTasks: string[] = [];
  let failedAttempts = 0;
  let retryAttempts = 0;

  const distributor = new WorkDistributor({
    workerCount: WORKER_COUNT,
    maxRetries: 3,
    enableWorkStealing: true,
    workStealingIntervalMs: 500,
    progressUpdateIntervalMs: 200,

    // Task processor with simulated work
    processor: async (subtask) => {
      // Simulate work duration (50-150ms)
      const duration = 50 + Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, duration));

      // Simulate occasional failures
      if (SIMULATE_FAILURES && Math.random() < FAILURE_RATE) {
        throw new Error(`Simulated failure for ${subtask.id}`);
      }

      return {
        taskId: subtask.id,
        processedData: subtask.payload.data.toUpperCase(),
        completedAt: Date.now(),
        duration
      };
    },

    // Progress callback - real-time updates
    onProgress: (report) => {
      // Only update if percentage changed
      if (report.percentage !== lastPercentage) {
        lastPercentage = report.percentage;

        // Progress bar
        const barWidth = 40;
        const filled = Math.floor((report.percentage / 100) * barWidth);
        const empty = barWidth - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(empty);

        // Clear line and write new progress
        clearLine();
        process.stdout.write(
          `${colors.cyan}[${bar}] ${colors.bright}${report.percentage}%${colors.reset} | ` +
          `${colors.yellow}${report.completed}${colors.reset}/${report.total} | ` +
          `${colors.magenta}ETA: ${report.etaString}${colors.reset} | ` +
          `${colors.green}${report.throughput.toFixed(1)}/s${colors.reset}`
        );
      }
    },

    // Task completion callback
    onSubtaskComplete: (result) => {
      completedTasks.push(result.subtaskId);
    },

    // Task failure callback
    onSubtaskFail: (subtaskId, error, willRetry) => {
      failedAttempts++;
      if (willRetry) {
        retryAttempts++;
      }
    }
  });

  // Execute distribution
  const startTime = Date.now();
  const { results, failures, stats } = await distributor.distribute(subtasks);
  const totalTime = Date.now() - startTime;

  // Final newline after progress bar
  console.log('\n');

  // Results summary
  log('═══════════════════════════════════════════════════', 'bright');
  log('  RESULTS SUMMARY', 'bright');
  log('═══════════════════════════════════════════════════\n', 'bright');

  // Success metrics
  log('Completion:', 'cyan');
  log(`  ✓ Successfully completed: ${colors.green}${results.length}${colors.reset}`, 'dim');
  log(`  ✗ Permanently failed: ${colors.red}${failures.length}${colors.reset}`, 'dim');
  log(`  → Success rate: ${colors.bright}${((results.length / TASK_COUNT) * 100).toFixed(2)}%${colors.reset}\n`, 'dim');

  // Performance metrics
  log('Performance:', 'cyan');
  log(`  ⚡ Total time: ${colors.yellow}${(totalTime / 1000).toFixed(2)}s${colors.reset}`, 'dim');
  log(`  ⚡ Average throughput: ${colors.yellow}${stats.progress.throughput.toFixed(2)} tasks/s${colors.reset}`, 'dim');
  log(`  ⚡ Average processing time: ${colors.yellow}${stats.progress.avgProcessingMs.toFixed(2)}ms${colors.reset}\n`, 'dim');

  // Worker statistics
  log('Workers:', 'cyan');
  log(`  ⚙ Total workers: ${colors.blue}${stats.pool.total}${colors.reset}`, 'dim');
  log(`  ⚙ Total tasks completed: ${colors.blue}${stats.pool.totalCompleted}${colors.reset}`, 'dim');
  log(`  ⚙ Average health score: ${colors.blue}${(stats.pool.avgHealthScore * 100).toFixed(1)}%${colors.reset}\n`, 'dim');

  // Retry statistics
  if (SIMULATE_FAILURES) {
    log('Failure Handling:', 'cyan');
    log(`  🔄 Total failure attempts: ${colors.red}${failedAttempts}${colors.reset}`, 'dim');
    log(`  🔄 Retry attempts: ${colors.yellow}${retryAttempts}${colors.reset}`, 'dim');
    log(`  🔄 Permanent failures: ${colors.red}${failures.length}${colors.reset}`, 'dim');
    log(`  🔄 Actual failure rate: ${colors.yellow}${((failedAttempts / (results.length + failedAttempts)) * 100).toFixed(2)}%${colors.reset}\n`, 'dim');
  }

  // Efficiency calculation
  const theoreticalMin = (TASK_COUNT * stats.progress.avgProcessingMs) / WORKER_COUNT;
  const efficiency = (theoreticalMin / totalTime) * 100;

  log('Efficiency:', 'cyan');
  log(`  📊 Theoretical minimum time: ${colors.magenta}${(theoreticalMin / 1000).toFixed(2)}s${colors.reset}`, 'dim');
  log(`  📊 Actual time: ${colors.magenta}${(totalTime / 1000).toFixed(2)}s${colors.reset}`, 'dim');
  log(`  📊 Parallel efficiency: ${colors.bright}${efficiency.toFixed(1)}%${colors.reset}\n`, 'dim');

  // Show sample results
  if (results.length > 0) {
    log('Sample Results (first 5):', 'cyan');
    results.slice(0, 5).forEach((result, i) => {
      log(`  ${i + 1}. ${result.subtaskId} - ${result.durationMs.toFixed(0)}ms by ${result.workerId}`, 'dim');
    });
    log('');
  }

  // Show failures if any
  if (failures.length > 0) {
    log('Permanent Failures:', 'red');
    failures.slice(0, 5).forEach((failure, i) => {
      log(`  ${i + 1}. ${failure.subtask.id} - ${failure.error.message}`, 'dim');
    });
    if (failures.length > 5) {
      log(`  ... and ${failures.length - 5} more`, 'dim');
    }
    log('');
  }

  log('═══════════════════════════════════════════════════', 'bright');
  log('  Demo completed successfully! ✓', 'green');
  log('═══════════════════════════════════════════════════\n', 'bright');
}

// Run demo
const isMainModule = process.argv[1] && process.argv[1].endsWith('demo.ts');

if (isMainModule) {
  runDemo().catch((error) => {
    log(`\n✗ Demo failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

export { runDemo };
