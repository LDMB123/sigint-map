/**
 * Semantic Encoder for Cache Keys
 * Extracts semantic intent from natural language requests for 90%+ cache hit rate
 *
 * Converts variations like:
 * - "Fix borrow error in src/lib.rs"
 * - "Resolve borrow checker issue in src/lib.rs"
 * - "Help with borrowing problem in src/lib.rs"
 *
 * Into the same semantic key:
 * { intent: "borrow-fix", target: "src/lib.rs", context: ["rust"], params: {} }
 */

import { createHash } from 'crypto';

/**
 * Semantic key structure for cache lookup
 */
export interface SemanticKey {
  /** Normalized intent: what the user wants to do (e.g., "borrow-fix", "component-create") */
  intent: string;

  /** Target of the operation: file path, module name, function name, etc. */
  target: string;

  /** Contextual information: language, domain, keywords */
  context: string[];

  /** Task-specific parameters extracted from the request */
  params: Record<string, any>;
}

/**
 * Intent patterns for normalizing user requests
 * Maps various phrasings to canonical intent names
 */
const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: string; category: string }> = [
  // Code fixes and debugging (order matters - more specific first)
  { pattern: /\b(fix|resolve|help)\b.*\b(borrow|borrowing|borrow checker)\b/i, intent: 'borrow-fix', category: 'debug' },
  { pattern: /\b(fix|resolve|debug|solve|repair)\b.*\b(error|issue|problem|bug)\b/i, intent: 'error-fix', category: 'debug' },
  { pattern: /\b(fix|resolve)\b.*\b(type|typing)\b.*\b(error|issue)\b/i, intent: 'type-fix', category: 'debug' },
  { pattern: /\b(fix|resolve)\b.*\b(compilation|compile|build)\b/i, intent: 'compile-fix', category: 'debug' },

  // Creation and generation
  { pattern: /\b(create|add|generate|make|build|new)\b.*\b(component|widget|module)\b/i, intent: 'component-create', category: 'create' },
  { pattern: /\b(create|add|generate|write)\b.*\b(test|tests|spec)\b/i, intent: 'test-create', category: 'create' },
  { pattern: /\b(create|add|generate)\b.*\b(function|method|procedure)\b/i, intent: 'function-create', category: 'create' },
  { pattern: /\b(create|add|generate)\b.*\b(class|type|interface|struct)\b/i, intent: 'type-create', category: 'create' },
  { pattern: /\b(generate|create|write)\b.*\b(documentation|docs|comments)\b/i, intent: 'docs-generate', category: 'create' },

  // Refactoring and optimization
  { pattern: /\b(refactor|restructure|reorganize)\b/i, intent: 'refactor', category: 'refactor' },
  { pattern: /\b(optimize|improve|enhance)\b.*\b(performance|speed)\b/i, intent: 'performance-optimize', category: 'optimize' },
  { pattern: /\b(simplify|clean|cleanup)\b/i, intent: 'code-simplify', category: 'refactor' },
  { pattern: /\b(extract|move)\b.*\b(function|method|component)\b/i, intent: 'extract-function', category: 'refactor' },

  // Analysis and explanation
  { pattern: /\b(explain|describe|what does|what is|how does|how works)\b/i, intent: 'explain', category: 'analyze' },
  { pattern: /\b(analyze|review|audit|check|validate)\b/i, intent: 'analyze', category: 'analyze' },
  { pattern: /\b(find|search|locate|look for)\b.*\b(usage|reference|call)\b/i, intent: 'find-usage', category: 'analyze' },
  { pattern: /\b(list|show|display)\b.*\b(dependencies|imports|exports)\b/i, intent: 'list-dependencies', category: 'analyze' },

  // Updates and modifications
  { pattern: /\b(update|modify|change|alter)\b/i, intent: 'update', category: 'modify' },
  { pattern: /\b(rename|change name)\b/i, intent: 'rename', category: 'modify' },
  { pattern: /\b(remove|delete|drop)\b/i, intent: 'remove', category: 'modify' },
  { pattern: /\b(add|insert|include)\b/i, intent: 'add', category: 'modify' },

  // Configuration and setup
  { pattern: /\b(configure|setup|set up|initialize)\b/i, intent: 'configure', category: 'setup' },
  { pattern: /\b(install|add)\b.*\b(dependency|package|library)\b/i, intent: 'dependency-install', category: 'setup' },

  // Testing
  { pattern: /\b(test|verify|validate|check)\b/i, intent: 'test', category: 'test' },
  { pattern: /\b(run|execute)\b.*\b(test|tests|spec)\b/i, intent: 'test-run', category: 'test' },
];

/**
 * File/target extraction patterns
 * Extracts file paths, module names, function names, etc.
 */
const TARGET_PATTERNS: Array<{ pattern: RegExp; extractor: (match: RegExpMatchArray) => string }> = [
  // File paths (with or without line numbers)
  {
    pattern: /(?:in |at |file |path )?(['"`]?)([a-zA-Z0-9_\-./]+\.[a-z]{1,5})(?::\d+)?(?::\d+)?\1/i,
    extractor: (m) => m[2]
  },
  // Unix-style paths without quotes
  {
    pattern: /\b([a-z0-9_\-]+\/[a-z0-9_\-/.]+)/i,
    extractor: (m) => m[1]
  },
  // Module/class names (PascalCase or camelCase)
  {
    pattern: /\b([A-Z][a-zA-Z0-9]*(?:Service|Controller|Component|Module|Manager|Handler|Provider|Store|Repository))\b/,
    extractor: (m) => m[1]
  },
  // Function names
  {
    pattern: /\b(?:function |fn |def |method )([a-zA-Z_][a-zA-Z0-9_]*)/,
    extractor: (m) => m[1]
  },
  // Generic identifiers with backticks
  {
    pattern: /`([a-zA-Z0-9_\-./]+)`/,
    extractor: (m) => m[1]
  },
];

/**
 * Context extraction patterns
 * Identifies programming languages, frameworks, domains
 */
const CONTEXT_PATTERNS: Array<{ pattern: RegExp; context: string[] }> = [
  // Programming languages
  { pattern: /\b(rust|\.rs\b)/i, context: ['rust'] },
  { pattern: /\b(typescript|\.ts\b|\.tsx\b)/i, context: ['typescript'] },
  { pattern: /\b(javascript|\.js\b|\.jsx\b)/i, context: ['javascript'] },
  { pattern: /\b(python|\.py\b)/i, context: ['python'] },
  { pattern: /\b(java|\.java\b)/i, context: ['java'] },
  { pattern: /\b(go|golang|\.go\b)/i, context: ['go'] },
  { pattern: /\b(c\+\+|cpp|\.cpp\b|\.hpp\b)/i, context: ['cpp'] },
  { pattern: /\b(c#|csharp|\.cs\b)/i, context: ['csharp'] },
  { pattern: /\b(ruby|\.rb\b)/i, context: ['ruby'] },
  { pattern: /\b(php|\.php\b)/i, context: ['php'] },

  // Frameworks and libraries
  { pattern: /\breact\b/i, context: ['react', 'javascript'] },
  { pattern: /\bnext\.?js\b/i, context: ['nextjs', 'react', 'javascript'] },
  { pattern: /\bvue\b/i, context: ['vue', 'javascript'] },
  { pattern: /\bangular\b/i, context: ['angular', 'typescript'] },
  { pattern: /\bsvelte\b/i, context: ['svelte', 'javascript'] },
  { pattern: /\bnode\.?js\b/i, context: ['nodejs', 'javascript'] },
  { pattern: /\bexpress\b/i, context: ['express', 'nodejs'] },
  { pattern: /\bnest\.?js\b/i, context: ['nestjs', 'typescript'] },
  { pattern: /\bdjango\b/i, context: ['django', 'python'] },
  { pattern: /\bflask\b/i, context: ['flask', 'python'] },
  { pattern: /\bspring\b/i, context: ['spring', 'java'] },

  // Domains and concepts
  { pattern: /\b(borrow|borrowing|ownership|lifetime)\b/i, context: ['memory-management', 'rust'] },
  { pattern: /\b(async|await|promise|future)\b/i, context: ['async'] },
  { pattern: /\b(database|sql|query)\b/i, context: ['database'] },
  { pattern: /\b(api|rest|graphql|endpoint)\b/i, context: ['api'] },
  { pattern: /\b(test|testing|spec|unit test|integration test)\b/i, context: ['testing'] },
  { pattern: /\b(performance|optimization|speed|latency)\b/i, context: ['performance'] },
  { pattern: /\b(security|authentication|authorization)\b/i, context: ['security'] },
  { pattern: /\b(ui|ux|interface|component)\b/i, context: ['ui'] },
  { pattern: /\b(error handling|exception|try catch)\b/i, context: ['error-handling'] },
  { pattern: /\b(type|typing|generic|interface)\b/i, context: ['type-system'] },
];

/**
 * Parameter extraction patterns
 * Extracts specific values, numbers, flags, etc.
 */
const PARAM_PATTERNS: Array<{ pattern: RegExp; name: string; extractor: (match: RegExpMatchArray) => any }> = [
  // Boolean flags (more specific to avoid false positives like "help with error")
  { pattern: /\b(create|generate|build|make)\b.+\b(with|including)\s+([a-z-]+)/i, name: 'flags', extractor: (m) => ({ [m[3]]: true }) },
  { pattern: /\b(without|excluding|disable|disabled)\s+([a-z-]+)/i, name: 'flags', extractor: (m) => ({ [m[2]]: false }) },

  // Numbers and counts
  { pattern: /\b(\d+)\s+(lines|functions|components|files|tests)/i, name: 'count', extractor: (m) => parseInt(m[1]) },

  // Severity/priority
  { pattern: /\b(high|medium|low)\s+(priority|severity)/i, name: 'priority', extractor: (m) => m[1].toLowerCase() },

  // Versions
  { pattern: /\bversion\s+(\d+(?:\.\d+)*)/i, name: 'version', extractor: (m) => m[1] },

  // File extensions
  { pattern: /\b(\.[a-z]{1,5})\s+files?\b/i, name: 'extension', extractor: (m) => m[1] },
];

/**
 * Extract semantic key from natural language request
 */
export function extractSemanticKey(request: string): SemanticKey {
  // Input validation
  if (typeof request !== 'string') {
    throw new TypeError(`Expected string, got ${typeof request}`);
  }
  if (!request || request.trim().length === 0) {
    throw new Error('Request cannot be empty');
  }
  if (request.length > 10000) {
    throw new Error(`Request too long: ${request.length} characters (max 10000)`);
  }

  const intent = extractIntent(request);
  const target = extractTarget(request);
  const context = extractContext(request);
  const params = extractParams(request);

  return {
    intent,
    target,
    context: [...new Set(context)], // Remove duplicates
    params,
  };
}

/**
 * Extract and normalize intent from request
 */
function extractIntent(request: string): string {
  // Try to match against known patterns
  for (const { pattern, intent } of INTENT_PATTERNS) {
    if (pattern.test(request)) {
      return intent;
    }
  }

  // Fallback: extract main verb + object
  const verbMatch = request.match(/\b(add|create|update|delete|fix|analyze|explain|refactor|optimize|test|generate|build|remove|configure|setup|install|run|execute|find|search|list|show|help)\b/i);
  const objectMatch = request.match(/\b(component|function|class|test|documentation|error|bug|issue|file|module|package|dependency|code|feature|api)\b/i);

  if (verbMatch && objectMatch) {
    return `${objectMatch[1].toLowerCase()}-${verbMatch[1].toLowerCase()}`;
  }

  if (verbMatch) {
    return verbMatch[1].toLowerCase();
  }

  // Ultimate fallback: generic
  return 'generic';
}

/**
 * Extract target (file, module, function, etc.) from request
 */
function extractTarget(request: string): string {
  // Try patterns in order of specificity
  for (const { pattern, extractor } of TARGET_PATTERNS) {
    const match = request.match(pattern);
    if (match) {
      let target = extractor(match);
      // Normalize path: remove leading ./ and clean up
      target = target.replace(/^\.\//, '').trim();
      return target;
    }
  }

  // No specific target found
  return '';
}

/**
 * Extract context (language, framework, domain) from request
 */
function extractContext(request: string): string[] {
  const contexts: string[] = [];

  for (const { pattern, context } of CONTEXT_PATTERNS) {
    if (pattern.test(request)) {
      contexts.push(...context);
    }
  }

  // Add file extension-based context if target is a file
  const target = extractTarget(request);
  if (target) {
    const ext = target.split('.').pop()?.toLowerCase();
    if (ext) {
      const extContextMap: Record<string, string[]> = {
        'rs': ['rust'],
        'ts': ['typescript'],
        'tsx': ['typescript', 'react'],
        'js': ['javascript'],
        'jsx': ['javascript', 'react'],
        'py': ['python'],
        'java': ['java'],
        'go': ['go'],
        'cpp': ['cpp'],
        'hpp': ['cpp'],
        'c': ['c'],
        'h': ['c'],
        'cs': ['csharp'],
        'rb': ['ruby'],
        'php': ['php'],
      };

      if (extContextMap[ext]) {
        contexts.push(...extContextMap[ext]);
      }
    }
  }

  return contexts;
}

/**
 * Extract parameters from request
 */
function extractParams(request: string): Record<string, any> {
  const params: Record<string, any> = {};

  for (const { pattern, name, extractor } of PARAM_PATTERNS) {
    const match = request.match(pattern);
    if (match) {
      const value = extractor(match);

      // Merge if the parameter already exists (e.g., multiple flags)
      if (params[name] && typeof params[name] === 'object' && typeof value === 'object') {
        params[name] = { ...params[name], ...value };
      } else {
        params[name] = value;
      }
    }
  }

  return params;
}

/**
 * Hash semantic key for exact matching
 * Generates deterministic hash from semantic key components
 */
export function hashSemanticKey(key: SemanticKey): string {
  // Sort context to ensure consistent ordering
  const sortedContext = [...key.context].sort();

  // Sort param keys for consistent ordering
  const sortedParams = Object.keys(key.params).sort().reduce((acc, k) => {
    acc[k] = key.params[k];
    return acc;
  }, {} as Record<string, any>);

  // Create canonical string representation
  const canonical = JSON.stringify({
    intent: key.intent,
    target: key.target,
    context: sortedContext,
    params: sortedParams,
  });

  // Hash it
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Calculate similarity score between two semantic keys (0-1)
 * Used for fuzzy cache matching
 */
export function calculateSimilarity(a: SemanticKey, b: SemanticKey): number {
  const weights = {
    intent: 0.50,  // Intent match is most important
    target: 0.30,  // Target is very important
    context: 0.20, // Context provides additional signals
  };

  const intentSim = intentSimilarity(a.intent, b.intent);
  const targetSim = targetSimilarity(a.target, b.target);
  const contextSim = contextOverlap(a.context, b.context);

  return (
    intentSim * weights.intent +
    targetSim * weights.target +
    contextSim * weights.context
  );
}

/**
 * Calculate intent similarity
 * Exact match = 1.0, same category = 0.6, partial match = 0.4, different = 0.0
 */
function intentSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;

  // Check if same category
  const categoryA = INTENT_PATTERNS.find(p => p.intent === a)?.category;
  const categoryB = INTENT_PATTERNS.find(p => p.intent === b)?.category;

  if (categoryA && categoryB && categoryA === categoryB) {
    return 0.6; // Same category but different specific intent
  }

  // Check for partial matches (e.g., "fix" vs "error-fix")
  if (a.includes(b) || b.includes(a)) {
    return 0.4;
  }

  return 0.0;
}

/**
 * Calculate target similarity
 * Exact match = 1.0, same basename = 0.8, substring = 0.6, same directory = 0.4, different = 0.0
 */
function targetSimilarity(a: string, b: string): number {
  if (!a || !b) return a === b ? 1.0 : 0.0;
  if (a === b) return 1.0;

  // Normalize paths
  const normA = a.replace(/\\/g, '/');
  const normB = b.replace(/\\/g, '/');

  // Extract components
  const partsA = normA.split('/');
  const partsB = normB.split('/');

  const basenameA = partsA[partsA.length - 1];
  const basenameB = partsB[partsB.length - 1];

  // Same basename (e.g., lib.rs vs src/lib.rs)
  if (basenameA === basenameB) return 0.8;

  // Check for substring matches (e.g., UserService vs UserServiceImpl)
  if (a.includes(b) || b.includes(a)) {
    return 0.6;
  }

  // Same directory
  const dirA = partsA.slice(0, -1).join('/');
  const dirB = partsB.slice(0, -1).join('/');
  if (dirA && dirB && dirA === dirB) return 0.4;

  return 0.0;
}

/**
 * Calculate context overlap using Jaccard similarity
 * Intersection / Union
 */
function contextOverlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const setA = new Set(a);
  const setB = new Set(b);

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Find similar semantic keys from a list
 * Returns matches sorted by similarity score (highest first)
 */
export interface SimilarityMatch {
  key: SemanticKey;
  score: number;
}

export function findSimilar(
  key: SemanticKey,
  candidates: SemanticKey[],
  threshold: number = 0.85
): SimilarityMatch[] {
  return candidates
    .map(candidate => ({
      key: candidate,
      score: calculateSimilarity(key, candidate),
    }))
    .filter(match => match.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

/**
 * Normalize a semantic key for consistent representation
 * Useful for debugging and logging
 */
export function normalizeSemanticKey(key: SemanticKey): SemanticKey {
  return {
    intent: key.intent.toLowerCase(),
    target: key.target.trim(),
    context: [...new Set(key.context.map(c => c.toLowerCase()))].sort(),
    params: key.params,
  };
}

/**
 * Convert semantic key to human-readable string
 */
export function semanticKeyToString(key: SemanticKey): string {
  const parts: string[] = [];

  parts.push(`Intent: ${key.intent}`);

  if (key.target) {
    parts.push(`Target: ${key.target}`);
  }

  if (key.context.length > 0) {
    parts.push(`Context: [${key.context.join(', ')}]`);
  }

  if (Object.keys(key.params).length > 0) {
    parts.push(`Params: ${JSON.stringify(key.params)}`);
  }

  return parts.join(' | ');
}
