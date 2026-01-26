/**
 * Complexity Analyzer
 * Analyzes task complexity to determine optimal model tier selection
 * Implements weighted scoring algorithm for accurate tier assignment
 */

/**
 * Task interface for complexity analysis
 */
export interface Task {
  description: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Complexity signals extracted from task analysis
 */
export interface ComplexitySignals {
  // Task complexity indicators
  tokenCount: number;           // Prompt length (character count / 4 approximation)
  questionCount: number;        // Number of questions in task
  stepCount: number;            // Number of implied steps/actions
  domainCount: number;          // Cross-domain references (tech stacks, languages)

  // Context complexity indicators
  fileCount: number;            // Number of files mentioned or involved
  abstractionLevel: number;     // Conceptual abstraction level (0-5)
}

/**
 * Complexity score breakdown for debugging/transparency
 */
export interface ComplexityBreakdown {
  score: number;
  signals: ComplexitySignals;
  contributions: {
    tokenCount: number;
    questionCount: number;
    stepCount: number;
    domainCount: number;
    fileCount: number;
    abstractionLevel: number;
  };
}

/**
 * Extract complexity signals from task description
 */
export function extractSignals(task: Task): ComplexitySignals {
  const description = task.description || '';
  const context = task.context || {};

  // Token count (approximate: chars / 4)
  const tokenCount = Math.ceil(description.length / 4);

  // Question count (count question marks and question words/phrases)
  const questionMarks = (description.match(/\?/g) || []).length;
  const questionWords = (description.match(/\b(how|what|why|when|where|which)\b[^?]*\?/gi) || []).length;
  const implicitQuestions = (description.match(/\b(should|could|would|can we|how to|what about|consider:|address:)\b/gi) || []).length;
  const questionCount = questionMarks + questionWords + implicitQuestions;

  // Step count (implied steps from connectors, action verbs, and list items)
  const sequenceWords = (description.match(/\b(first|second|third|fourth|then|next|finally|after|before|subsequently)\b/gi) || []).length;
  const bulletPoints = (description.match(/\n\s*[-*•]\s/g) || []).length;
  const numberedItems = (description.match(/\n\s*\d+\.\s/g) || []).length;
  const actionVerbs = (description.match(/\b(implement|create|build|design|refactor|test|deploy|add|update|remove|fix|analyze|investigate|plan|migrate)\b/gi) || []).length;
  const stepCount = sequenceWords + bulletPoints + numberedItems + Math.min(actionVerbs, 5); // Cap action verbs to avoid over-counting

  // Domain count (technical domains mentioned)
  const domains = [
    /\b(react|vue|angular|svelte|nextjs|next\.js)\b/gi,         // Frontend frameworks
    /\b(typescript|javascript|python|rust|go|java|c\+\+)\b/gi,  // Languages
    /\b(node|express|fastapi|django|rails|spring)\b/gi,         // Backend frameworks
    /\b(postgres|mongodb|redis|mysql|sqlite)\b/gi,              // Databases
    /\b(docker|kubernetes|aws|gcp|azure|vercel)\b/gi,           // Infrastructure
    /\b(graphql|rest|grpc|websocket|trpc)\b/gi,                 // API patterns
    /\b(jest|vitest|pytest|playwright|cypress)\b/gi,            // Testing
    /\b(webpack|vite|rollup|esbuild|turbopack)\b/gi,            // Build tools
    /\b(git|github|gitlab|ci\/cd|pipeline)\b/gi,                // DevOps
    /\b(authentication|authorization|security|oauth)\b/gi       // Security
  ];
  const domainMatches = new Set<string>();
  domains.forEach(regex => {
    const matches = description.match(regex) || [];
    matches.forEach(m => domainMatches.add(m.toLowerCase()));
  });
  const domainCount = Math.min(domainMatches.size, 10); // Cap at 10 to avoid over-weighting

  // File count (files mentioned in description or context)
  const filePatterns = [
    /\b[\w-]+\.(ts|js|tsx|jsx|py|rs|go|java|c|cpp|h|hpp)\b/gi,
    /\b[\w-]+\.(json|yaml|yml|toml|xml|md|txt)\b/gi,
    /\b[\w\/.-]+\/[\w\/.-]+\.(ts|js|tsx|jsx|py|rs|go)\b/gi
  ];
  const fileMatches = new Set<string>();
  filePatterns.forEach(regex => {
    const matches = description.match(regex) || [];
    matches.forEach(m => fileMatches.add(m));
  });
  const contextFileCount = context.fileCount || context.files?.length || 0;
  const fileCount = Math.min(fileMatches.size + contextFileCount, 20); // Cap at 20

  // Abstraction level (0-5 scale based on architectural/conceptual keywords)
  const abstractionKeywords = [
    // Level 5: High-level architecture
    { regex: /\b(architecture|system design|scalability|distributed|microservices|event-driven)\b/gi, level: 5 },
    // Level 4: Design patterns and patterns
    { regex: /\b(pattern|strategy|factory|observer|singleton|dependency injection)\b/gi, level: 4 },
    // Level 3: Component design
    { regex: /\b(component|module|interface|abstraction|encapsulation)\b/gi, level: 3 },
    // Level 2: Feature implementation
    { regex: /\b(feature|functionality|behavior|workflow|integration)\b/gi, level: 2 },
    // Level 1: Code-level tasks
    { regex: /\b(function|method|variable|loop|condition|import)\b/gi, level: 1 },
  ];

  let abstractionLevel = 0;
  for (const { regex, level } of abstractionKeywords) {
    if (regex.test(description)) {
      abstractionLevel = Math.max(abstractionLevel, level);
    }
  }

  // If no abstraction keywords found, default to level 1
  if (abstractionLevel === 0) {
    abstractionLevel = 1;
  }

  return {
    tokenCount,
    questionCount,
    stepCount,
    domainCount,
    fileCount,
    abstractionLevel
  };
}

/**
 * Calculate complexity score from signals using weighted algorithm
 *
 * Scoring formula:
 * - tokenCount / 1000 × 0.15
 * - questionCount × 10 × 0.20
 * - stepCount × 8 × 0.20
 * - domainCount × 15 × 0.15
 * - fileCount × 5 × 0.10
 * - abstractionLevel × 20 × 0.20
 *
 * @returns Complexity score from 0-100
 */
export function calculateComplexity(signals: ComplexitySignals): number {
  const contributions = {
    tokenCount: (signals.tokenCount / 1000) * 0.15,
    questionCount: (signals.questionCount * 10) * 0.20,
    stepCount: (signals.stepCount * 8) * 0.20,
    domainCount: (signals.domainCount * 15) * 0.15,
    fileCount: (signals.fileCount * 5) * 0.10,
    abstractionLevel: (signals.abstractionLevel * 20) * 0.20
  };

  const totalScore = Object.values(contributions).reduce((sum, value) => sum + value, 0);

  // Normalize to 0-100 scale and apply soft cap at 100
  const normalizedScore = Math.min(totalScore, 100);

  return Math.round(normalizedScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Analyze task complexity and return score with breakdown
 */
export function analyzeComplexityDetailed(task: Task): ComplexityBreakdown {
  const signals = extractSignals(task);

  const contributions = {
    tokenCount: (signals.tokenCount / 1000) * 0.15,
    questionCount: (signals.questionCount * 10) * 0.20,
    stepCount: (signals.stepCount * 8) * 0.20,
    domainCount: (signals.domainCount * 15) * 0.15,
    fileCount: (signals.fileCount * 5) * 0.10,
    abstractionLevel: (signals.abstractionLevel * 20) * 0.20
  };

  const score = calculateComplexity(signals);

  return {
    score,
    signals,
    contributions
  };
}

/**
 * Main complexity analysis function
 * Analyzes task and returns complexity score from 0-100
 *
 * @param task - Task to analyze
 * @returns Complexity score (0-100)
 */
export function analyzeComplexity(task: Task): number {
  // Input validation
  if (!task || typeof task !== 'object') {
    throw new TypeError('Task must be an object');
  }
  if (typeof task.description !== 'string') {
    throw new TypeError('Task description must be a string');
  }
  if (!task.description || task.description.trim().length === 0) {
    throw new Error('Task description cannot be empty');
  }
  if (task.description.length > 50000) {
    throw new Error(`Task description too long: ${task.description.length} characters (max 50000)`);
  }

  const signals = extractSignals(task);
  return calculateComplexity(signals);
}

/**
 * Tier thresholds for model selection
 */
export const TIER_THRESHOLDS = {
  haiku: { max: 30 },           // Simple: 0-30
  sonnet: { min: 25, max: 70 }, // Medium: 25-70 (overlap zone 25-30)
  opus: { min: 65 },            // Complex: 65+ (overlap zone 65-70)
} as const;

/**
 * Recommended tier type
 */
export type TierRecommendation = 'haiku' | 'sonnet' | 'opus';

/**
 * Get recommended tier based on complexity score
 * Overlap zones allow for graceful degradation:
 * - Score 25-30: Try Haiku first, escalate if needed
 * - Score 65-70: Try Sonnet first, escalate if needed
 */
export function getRecommendedTier(score: number): TierRecommendation {
  if (score <= TIER_THRESHOLDS.haiku.max) {
    return 'haiku';
  } else if (score >= TIER_THRESHOLDS.opus.min) {
    return 'opus';
  } else {
    return 'sonnet';
  }
}

/**
 * Analyze task and get recommended tier
 */
export function analyzeTier(task: Task): {
  tier: TierRecommendation;
  score: number;
  breakdown: ComplexityBreakdown;
} {
  const breakdown = analyzeComplexityDetailed(task);
  const tier = getRecommendedTier(breakdown.score);

  return {
    tier,
    score: breakdown.score,
    breakdown
  };
}
