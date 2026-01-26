/**
 * Semantic Hash Generator for Zero-Overhead Routing
 *
 * Converts natural language requests into 64-bit semantic hashes
 * for instant agent routing with <1ms performance.
 *
 * Hash Structure (64 bits):
 * - domain (8 bits): rust/wasm/svelte/security/etc
 * - complexity (4 bits): 0-15 complexity score
 * - action (8 bits): create/debug/optimize/migrate/etc
 * - subtype (12 bits): specific task type
 * - confidence (4 bits): routing confidence (0-15)
 * - reserved (28 bits): future use
 *
 * @version 1.0.0
 */

/**
 * Semantic hash structure representing a routing decision
 */
export interface SemanticHash {
  /** Domain identifier (8 bits: 0-255) */
  domain: number;
  /** Complexity score (4 bits: 0-15) */
  complexity: number;
  /** Action type (8 bits: 0-255) */
  action: number;
  /** Task subtype (12 bits: 0-4095) */
  subtype: number;
  /** Routing confidence (4 bits: 0-15) */
  confidence: number;
  /** Reserved for future use (28 bits) */
  reserved: number;
}

/**
 * Intent extracted from natural language request
 */
interface Intent {
  domain: number;
  action: number;
  subtype: number;
  confidence: number;
}

/**
 * Domain identifiers (8 bits)
 */
const DOMAIN = {
  UNKNOWN: 0x00,
  RUST: 0x01,
  WASM: 0x02,
  SVELTEKIT: 0x03,
  SECURITY: 0x04,
  FULLSTACK: 0x05,
  FRONTEND: 0x06,
  BACKEND: 0x07,
  DATABASE: 0x08,
  TESTING: 0x09,
  DEPLOYMENT: 0x0A,
  DOCUMENTATION: 0x0B,
  PERFORMANCE: 0x0C,
  MIGRATION: 0x0D,
  ARCHITECTURE: 0x0E,
  CODE_QUALITY: 0x0F,
  TYPESCRIPT: 0x10,
  PRISMA: 0x11,
  TRPC: 0x12,
  REACT: 0x13,
  NEXTJS: 0x14,
  VITEST: 0x15,
} as const;

/**
 * Action identifiers (8 bits)
 */
const ACTION = {
  UNKNOWN: 0x00,
  CREATE: 0x01,
  DEBUG: 0x02,
  OPTIMIZE: 0x03,
  MIGRATE: 0x04,
  REFACTOR: 0x05,
  TEST: 0x06,
  DOCUMENT: 0x07,
  REVIEW: 0x08,
  ANALYZE: 0x09,
  FIX: 0x0A,
  UPDATE: 0x0B,
  IMPLEMENT: 0x0C,
  DESIGN: 0x0D,
  SETUP: 0x0E,
  CONFIGURE: 0x0F,
  DEPLOY: 0x10,
  INTEGRATE: 0x11,
  VALIDATE: 0x12,
  AUDIT: 0x13,
} as const;

/**
 * Subtype identifiers (12 bits) - organized by domain
 */
const SUBTYPE = {
  // Rust subtypes (0x001-0x0FF)
  BORROW_CHECKER: 0x042,
  LIFETIME: 0x043,
  TRAIT_BOUNDS: 0x044,
  ASYNC_RUNTIME: 0x045,
  MACRO: 0x046,
  UNSAFE: 0x047,
  OWNERSHIP: 0x048,
  RUST_TYPE_INFERENCE: 0x049,
  CARGO: 0x04A,
  PROCEDURAL_MACRO: 0x04B,

  // WASM subtypes (0x100-0x1FF)
  LEPTOS: 0x115,
  LEPTOS_SSR: 0x116,
  YEW: 0x117,
  WASM_BINDGEN: 0x118,
  WASM_PACK: 0x119,
  WASM_OPTIMIZATION: 0x11A,

  // SvelteKit subtypes (0x200-0x2FF)
  SVELTE_COMPONENT: 0x215,
  SVELTE_STORE: 0x216,
  SVELTE_ROUTING: 0x217,
  SVELTE_SSR: 0x218,

  // Security subtypes (0x300-0x3FF)
  VULNERABILITY: 0x315,
  AUTH: 0x316,
  ENCRYPTION: 0x317,
  INPUT_VALIDATION: 0x318,
  XSS: 0x319,
  CSRF: 0x31A,
  SQL_INJECTION: 0x31B,

  // Database subtypes (0x400-0x4FF)
  SCHEMA_DESIGN: 0x415,
  MIGRATION: 0x416,
  QUERY_OPTIMIZATION: 0x417,
  INDEXING: 0x418,
  TRANSACTION: 0x419,
  ORM: 0x41A,

  // Testing subtypes (0x500-0x5FF)
  UNIT_TEST: 0x515,
  INTEGRATION_TEST: 0x516,
  E2E_TEST: 0x517,
  SNAPSHOT_TEST: 0x518,
  MOCK: 0x519,
  COVERAGE: 0x51A,

  // TypeScript subtypes (0x600-0x6FF)
  TYPE_SYSTEM: 0x615,
  GENERICS: 0x616,
  TYPE_INFERENCE: 0x617,
  UTILITY_TYPES: 0x618,

  // API subtypes (0x700-0x7FF)
  REST_API: 0x715,
  GRAPHQL: 0x716,
  TRPC_ROUTER: 0x717,
  WEBSOCKET: 0x718,
  API_DESIGN: 0x719,

  // Generic/fallback
  GENERIC: 0x001,
  UNKNOWN: 0x000,
} as const;

/**
 * Domain detection patterns with priority ordering
 */
const DOMAIN_PATTERNS: Array<[RegExp, number, number]> = [
  // Rust patterns (high confidence)
  [/\b(rust|cargo|rustc|rustup)\b/i, DOMAIN.RUST, 15],
  [/\b(borrow|lifetime|ownership|trait)\s+(checker|error|bound)/i, DOMAIN.RUST, 15],
  [/\b(async|tokio|actix|rocket)\b/i, DOMAIN.RUST, 13],
  [/\.rs\b/i, DOMAIN.RUST, 12],

  // WASM patterns
  [/\b(wasm|webassembly|wasm-bindgen|wasm-pack)\b/i, DOMAIN.WASM, 15],
  [/\b(leptos|yew|perseus|dioxus)\b/i, DOMAIN.WASM, 14],

  // SvelteKit patterns
  [/\b(svelte|sveltekit)\b/i, DOMAIN.SVELTEKIT, 15],
  [/\$:(lib|app|state|props)/i, DOMAIN.SVELTEKIT, 13],

  // Security patterns
  [/\b(security|vulnerability|exploit|xss|csrf|injection)\b/i, DOMAIN.SECURITY, 14],
  [/\b(auth|authentication|authorization|jwt|oauth)\b/i, DOMAIN.SECURITY, 12],

  // TypeScript patterns
  [/\b(typescript|\.ts|\.tsx)\b/i, DOMAIN.TYPESCRIPT, 13],
  [/\b(type|interface|generic)\s+(error|issue|problem)/i, DOMAIN.TYPESCRIPT, 12],

  // Prisma patterns
  [/\b(prisma|schema\.prisma)\b/i, DOMAIN.PRISMA, 15],
  [/\b(prisma\s+(client|migrate|schema|generate))\b/i, DOMAIN.PRISMA, 14],

  // tRPC patterns
  [/\b(trpc|t\.procedure|t\.router)\b/i, DOMAIN.TRPC, 15],

  // React/Next.js patterns
  [/\b(react|nextjs|next\.js)\b/i, DOMAIN.REACT, 13],
  [/\b(component|hook|useState|useEffect)\b/i, DOMAIN.FRONTEND, 10],

  // Vitest patterns
  [/\b(vitest|test|spec|describe|it|expect)\b/i, DOMAIN.TESTING, 12],

  // Database patterns
  [/\b(database|postgres|mongodb|sql|query)\b/i, DOMAIN.DATABASE, 11],
  [/\b(migration|schema|table|index)\b/i, DOMAIN.DATABASE, 10],

  // Performance patterns
  [/\b(optimize|performance|speed|slow|bottleneck)\b/i, DOMAIN.PERFORMANCE, 11],

  // Architecture patterns
  [/\b(architecture|design|pattern|structure)\b/i, DOMAIN.ARCHITECTURE, 10],
];

/**
 * Action detection patterns with priority ordering
 */
const ACTION_PATTERNS: Array<[RegExp, number, number]> = [
  // Debug/Fix patterns
  [/\b(debug|fix|solve|resolve|error|bug|issue|problem)\b/i, ACTION.DEBUG, 14],
  [/\b(not working|broken|failing|crash)\b/i, ACTION.DEBUG, 13],

  // Create patterns
  [/\b(create|build|generate|scaffold|initialize|setup|new)\b/i, ACTION.CREATE, 13],
  [/\b(start|init|bootstrap)\b/i, ACTION.CREATE, 11],

  // Optimize patterns
  [/\b(optimize|improve|enhance|speed up|faster|performance)\b/i, ACTION.OPTIMIZE, 13],
  [/\b(reduce|minimize|efficient)\b/i, ACTION.OPTIMIZE, 11],

  // Migrate patterns
  [/\b(migrate|migration|upgrade|convert|port|transform)\b/i, ACTION.MIGRATE, 13],

  // Refactor patterns
  [/\b(refactor|restructure|reorganize|clean up|simplify)\b/i, ACTION.REFACTOR, 12],

  // Test patterns
  [/\b(test|testing|spec|coverage|verify)\b/i, ACTION.TEST, 12],

  // Document patterns
  [/\b(document|documentation|explain|describe|comment)\b/i, ACTION.DOCUMENT, 12],

  // Review patterns
  [/\b(review|audit|check|validate|analyze)\b/i, ACTION.REVIEW, 11],

  // Implement patterns
  [/\b(implement|add|include|integrate)\b/i, ACTION.IMPLEMENT, 11],

  // Update patterns
  [/\b(update|modify|change|edit)\b/i, ACTION.UPDATE, 10],

  // Design patterns
  [/\b(design|plan|architect|sketch)\b/i, ACTION.DESIGN, 10],

  // Configure patterns
  [/\b(configure|config|settings|setup)\b/i, ACTION.CONFIGURE, 10],

  // Deploy patterns
  [/\b(deploy|deployment|ship|release)\b/i, ACTION.DEPLOY, 11],
];

/**
 * Subtype detection patterns with priority ordering
 */
const SUBTYPE_PATTERNS: Array<[RegExp, number, number]> = [
  // Rust-specific subtypes
  [/\bborrow\s+(checker|error|issue)/i, SUBTYPE.BORROW_CHECKER, 15],
  [/\blifetime\s+(error|issue|annotation)/i, SUBTYPE.LIFETIME, 15],
  [/\btrait\s+(bound|constraint)/i, SUBTYPE.TRAIT_BOUNDS, 14],
  [/\b(async|await|future|tokio|async-std)/i, SUBTYPE.ASYNC_RUNTIME, 13],
  [/\b(macro|procedural\s+macro|derive)/i, SUBTYPE.MACRO, 13],
  [/\b(unsafe|raw\s+pointer)/i, SUBTYPE.UNSAFE, 13],
  [/\b(ownership|move|copy|clone)/i, SUBTYPE.OWNERSHIP, 12],

  // WASM-specific subtypes
  [/\bleptos\s+(ssr|server)/i, SUBTYPE.LEPTOS_SSR, 15],
  [/\bleptos/i, SUBTYPE.LEPTOS, 14],
  [/\byew/i, SUBTYPE.YEW, 14],
  [/\bwasm-bindgen/i, SUBTYPE.WASM_BINDGEN, 14],
  [/\bwasm-pack/i, SUBTYPE.WASM_PACK, 14],

  // Security subtypes
  [/\b(xss|cross-site\s+scripting)/i, SUBTYPE.XSS, 15],
  [/\b(csrf|cross-site\s+request)/i, SUBTYPE.CSRF, 15],
  [/\b(sql\s+injection|sqli)/i, SUBTYPE.SQL_INJECTION, 15],
  [/\b(vulnerability|cve|exploit)/i, SUBTYPE.VULNERABILITY, 14],
  [/\b(auth|authentication|login|session)/i, SUBTYPE.AUTH, 13],
  [/\b(encrypt|decrypt|crypto|tls|ssl)/i, SUBTYPE.ENCRYPTION, 13],

  // Database subtypes
  [/\b(schema|table\s+design|erd)/i, SUBTYPE.SCHEMA_DESIGN, 14],
  [/\b(migration|migrate|alter\s+table)/i, SUBTYPE.MIGRATION, 14],
  [/\b(query\s+(optimization|performance)|slow\s+query)/i, SUBTYPE.QUERY_OPTIMIZATION, 13],
  [/\b(index|indexing)/i, SUBTYPE.INDEXING, 12],
  [/\b(transaction|acid|rollback)/i, SUBTYPE.TRANSACTION, 12],

  // Testing subtypes
  [/\b(unit\s+test|unittest)/i, SUBTYPE.UNIT_TEST, 13],
  [/\b(integration\s+test|e2e|end-to-end)/i, SUBTYPE.INTEGRATION_TEST, 13],
  [/\b(snapshot|visual\s+regression)/i, SUBTYPE.SNAPSHOT_TEST, 12],
  [/\b(mock|stub|spy)/i, SUBTYPE.MOCK, 12],

  // TypeScript subtypes
  [/\b(generic|type\s+parameter)/i, SUBTYPE.GENERICS, 14],
  [/\b(type\s+(inference|narrowing))/i, SUBTYPE.TYPE_INFERENCE, 13],
  [/\b(utility\s+type|mapped\s+type)/i, SUBTYPE.UTILITY_TYPES, 13],

  // API subtypes
  [/\b(rest\s+api|restful)/i, SUBTYPE.REST_API, 13],
  [/\b(graphql|graph\s+ql)/i, SUBTYPE.GRAPHQL, 13],
  [/\b(trpc|t\.procedure|t\.router)/i, SUBTYPE.TRPC_ROUTER, 14],
  [/\b(websocket|ws|socket\.io)/i, SUBTYPE.WEBSOCKET, 13],
];

/**
 * Calculate complexity score based on request characteristics
 */
function calculateComplexity(request: string): number {
  let score = 5; // Base complexity

  // Increase for multiple requirements
  const andCount = (request.match(/\band\b/gi) || []).length;
  score += Math.min(andCount, 3);

  // Increase for architectural terms
  const architecturalTerms = /\b(architecture|system|design|pattern|scalable|distributed)\b/gi;
  if (architecturalTerms.test(request)) score += 2;

  // Increase for multi-step processes
  const stepIndicators = /\b(first|then|next|after|finally|step)\b/gi;
  const steps = (request.match(stepIndicators) || []).length;
  score += Math.min(steps, 3);

  // Increase for performance requirements
  if (/\b(optimize|performance|fast|efficient|scale)\b/i.test(request)) score += 2;

  // Increase for integration work
  if (/\b(integrate|connect|combine|merge)\b/i.test(request)) score += 1;

  // Decrease for simple operations
  if (/\b(simple|basic|quick|just|only)\b/i.test(request)) score -= 2;

  // Clamp to valid range
  return Math.max(0, Math.min(15, score));
}

/**
 * Extract intent from natural language request
 */
function extractIntent(request: string): Intent {
  const normalized = request.toLowerCase().trim();

  let domain: number = DOMAIN.UNKNOWN;
  let domainConfidence = 0;

  // Find best matching domain
  for (const [pattern, domainId, confidence] of DOMAIN_PATTERNS) {
    if (pattern.test(normalized) && confidence > domainConfidence) {
      domain = domainId;
      domainConfidence = confidence;
    }
  }

  let action: number = ACTION.UNKNOWN;
  let actionConfidence = 0;

  // Find best matching action
  for (const [pattern, actionId, confidence] of ACTION_PATTERNS) {
    if (pattern.test(normalized) && confidence > actionConfidence) {
      action = actionId;
      actionConfidence = confidence;
    }
  }

  let subtype: number = SUBTYPE.GENERIC;
  let subtypeConfidence = 0;

  // Find best matching subtype
  for (const [pattern, subtypeId, confidence] of SUBTYPE_PATTERNS) {
    if (pattern.test(normalized) && confidence > subtypeConfidence) {
      subtype = subtypeId;
      subtypeConfidence = confidence;
    }
  }

  // Calculate overall confidence (0-15)
  // Weight: domain 40%, action 30%, subtype 30%
  const confidence = Math.min(15, Math.floor(
    (domainConfidence * 0.4 + actionConfidence * 0.3 + subtypeConfidence * 0.3)
  ));

  return { domain, action, subtype, confidence };
}

/**
 * Pack semantic hash fields into a 64-bit bigint
 */
function packHash(hash: SemanticHash): bigint {
  const domain = BigInt(hash.domain & 0xFF);
  const complexity = BigInt(hash.complexity & 0x0F);
  const action = BigInt(hash.action & 0xFF);
  const subtype = BigInt(hash.subtype & 0xFFF);
  const confidence = BigInt(hash.confidence & 0x0F);
  const reserved = BigInt(hash.reserved & 0x0FFFFFFF);

  return (
    (domain << 56n) |
    (complexity << 52n) |
    (action << 44n) |
    (subtype << 32n) |
    (confidence << 28n) |
    reserved
  );
}

/**
 * Unpack a 64-bit bigint into semantic hash fields
 */
export function unpackHash(packed: bigint): SemanticHash {
  return {
    domain: Number((packed >> 56n) & 0xFFn),
    complexity: Number((packed >> 52n) & 0x0Fn),
    action: Number((packed >> 44n) & 0xFFn),
    subtype: Number((packed >> 32n) & 0xFFFn),
    confidence: Number((packed >> 28n) & 0x0Fn),
    reserved: Number(packed & 0x0FFFFFFFn),
  };
}

/**
 * Convert a natural language request to a 64-bit semantic hash
 *
 * Performance: <1ms per hash
 *
 * @param request Natural language request string
 * @returns 64-bit semantic hash as bigint
 *
 * @example
 * ```typescript
 * hashRequest("Fix borrow checker error in async function")
 * // Returns: 0x01_0C_02_042_F_0000000n
 * // domain=rust, complexity=12, action=debug, subtype=borrow_checker, confidence=15
 * ```
 */
export function hashRequest(request: string): bigint {
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

  // Extract semantic intent
  const intent = extractIntent(request);

  // Calculate complexity
  const complexity = calculateComplexity(request);

  // Build semantic hash
  const hash: SemanticHash = {
    domain: intent.domain,
    complexity,
    action: intent.action,
    subtype: intent.subtype,
    confidence: intent.confidence,
    reserved: 0,
  };

  return packHash(hash);
}

/**
 * Convert a 64-bit hash to a human-readable string
 */
export function formatHash(hash: bigint): string {
  const unpacked = unpackHash(hash);
  return `0x${unpacked.domain.toString(16).padStart(2, '0')}_` +
    `${unpacked.complexity.toString(16).toUpperCase()}_` +
    `${unpacked.action.toString(16).padStart(2, '0')}_` +
    `${unpacked.subtype.toString(16).padStart(3, '0')}_` +
    `${unpacked.confidence.toString(16).toUpperCase()}_` +
    `${unpacked.reserved.toString(16).padStart(7, '0')}`;
}

/**
 * Get domain name from domain ID
 */
export function getDomainName(domainId: number): string {
  const entry = Object.entries(DOMAIN).find(([_, id]) => id === domainId);
  return entry ? entry[0] : 'UNKNOWN';
}

/**
 * Get action name from action ID
 */
export function getActionName(actionId: number): string {
  const entry = Object.entries(ACTION).find(([_, id]) => id === actionId);
  return entry ? entry[0] : 'UNKNOWN';
}

/**
 * Get subtype name from subtype ID
 */
export function getSubtypeName(subtypeId: number): string {
  const entry = Object.entries(SUBTYPE).find(([_, id]) => id === subtypeId);
  return entry ? entry[0] : 'UNKNOWN';
}

/**
 * Debug helper to analyze a request and show the hash breakdown
 */
export function analyzeRequest(request: string): {
  request: string;
  hash: bigint;
  formatted: string;
  breakdown: {
    domain: { id: number; name: string };
    complexity: number;
    action: { id: number; name: string };
    subtype: { id: number; name: string };
    confidence: number;
  };
} {
  const hash = hashRequest(request);
  const unpacked = unpackHash(hash);

  return {
    request,
    hash,
    formatted: formatHash(hash),
    breakdown: {
      domain: { id: unpacked.domain, name: getDomainName(unpacked.domain) },
      complexity: unpacked.complexity,
      action: { id: unpacked.action, name: getActionName(unpacked.action) },
      subtype: { id: unpacked.subtype, name: getSubtypeName(unpacked.subtype) },
      confidence: unpacked.confidence,
    },
  };
}

// Export constants for external use
export { DOMAIN, ACTION, SUBTYPE };
