/**
 * Agent Registry - Validates agent existence before routing
 *
 * Prevents "Agent not found" errors by maintaining a registry of available agents
 * and providing fallback routing when requested agents don't exist.
 *
 * Security: ReDoS protection with bounded quantifiers and input size limits.
 *
 * Memory safety:
 *   - Bounded to MAX_AGENTS (10,000) entries to prevent unbounded Map growth.
 *   - Clears existing entries before every (re-)initialization.
 *   - Provides dispose() for explicit teardown and resource release.
 *   - Uses an initPromise to serialize concurrent initialization calls so the
 *     directory scan runs exactly once per cycle.
 *   - All public query methods call ensureInitialized() to guarantee the
 *     registry is ready before returning data.
 */

import { readdir, readFile, realpath, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fastSafeRegexMatch } from '../security/regex-safe';

/** Valid tier values for agent definitions. */
export const VALID_TIERS = ['opus', 'sonnet', 'haiku'] as const;
export type AgentTier = (typeof VALID_TIERS)[number];

/** Default tier used when none is specified. */
const DEFAULT_TIER: AgentTier = 'sonnet';

/** Default fallback agent name. */
const DEFAULT_FALLBACK_AGENT = 'general-purpose';

/**
 * Pattern for valid agent names: alphanumeric, hyphens, and underscores only.
 * Length constrained to 1-100 characters to prevent abuse.
 */
const AGENT_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;

/**
 * Sequences that indicate path traversal attempts in agent name input.
 * Checked against raw input before any normalization.
 */
const PATH_TRAVERSAL_SEQUENCES = ['..', '/', '\\', '%2e', '%2f', '%5c'] as const;

export interface AgentDefinition {
  name: string;
  filePath: string;
  tier: AgentTier;
  exists: boolean;
  description?: string;
}

/** Result of an agent name validation check. */
export interface AgentNameValidationResult {
  valid: boolean;
  reason?: string;
}

/** Return type for getStats(). */
export interface RegistryStats {
  total: number;
  byTier: Record<AgentTier, number>;
  available: number;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/**
 * Type guard: checks whether a value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard: checks whether a value is a valid AgentTier.
 */
export function isValidTier(value: unknown): value is AgentTier {
  return typeof value === 'string' && (VALID_TIERS as readonly string[]).includes(value);
}

/**
 * Type guard: checks whether a value conforms to the AgentDefinition interface.
 */
export function isAgentDefinition(value: unknown): value is AgentDefinition {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.name) &&
    isNonEmptyString(candidate.filePath) &&
    isValidTier(candidate.tier) &&
    typeof candidate.exists === 'boolean'
  );
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/**
 * Validate an agent name string against security and format rules.
 * Returns a result object so callers can inspect the failure reason.
 */
export function validateAgentName(name: unknown): AgentNameValidationResult {
  if (name === null || name === undefined) {
    return { valid: false, reason: 'Agent name must not be null or undefined' };
  }

  if (typeof name !== 'string') {
    return { valid: false, reason: `Agent name must be a string, received ${typeof name}` };
  }

  if (name.trim().length === 0) {
    return { valid: false, reason: 'Agent name must not be empty or whitespace-only' };
  }

  // Check for path traversal sequences before any normalization
  const lowerName = name.toLowerCase();
  for (const seq of PATH_TRAVERSAL_SEQUENCES) {
    if (lowerName.includes(seq)) {
      return { valid: false, reason: `Agent name contains disallowed sequence: ${seq}` };
    }
  }

  if (!AGENT_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      reason: 'Agent name must match pattern ^[a-zA-Z0-9_-]{1,100}$',
    };
  }

  return { valid: true };
}

export class AgentRegistry {
  /** Hard upper-bound on registered agents to prevent unbounded memory growth. */
  static readonly MAX_AGENTS = 10_000;

  private agents: Map<string, AgentDefinition> = new Map();
  private initialized = false;
  private disposed = false;

  /**
   * Serializes concurrent initialize() calls so the directory scan runs
   * exactly once.  Subsequent callers receive the same settled promise.
   */
  private initPromise: Promise<void> | null = null;

  // Similarity score cache: 'str1\0str2' -> score
  private similarityCache: Map<string, number> = new Map();
  // Maximum cache size to prevent unbounded memory growth
  private readonly MAX_SIMILARITY_CACHE = 100_000;
  // Maximum agents to check during fuzzy matching
  private readonly MAX_FUZZY_MATCH_ITERATIONS = 50;
  // Similarity threshold for early exit
  private readonly SIMILARITY_THRESHOLD = 0.8;
  // Security limits
  private readonly MAX_RECURSION_DEPTH = 10;
  private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB
  private basePath: string | null = null;

  constructor(private agentDirPath: string) {
    if (!isNonEmptyString(agentDirPath)) {
      throw new Error('AgentRegistry requires a non-empty agentDirPath');
    }
  }

  /**
   * Scan agent directory and build registry.
   *
   * Safe to call from multiple call-sites concurrently -- only the first
   * invocation performs the scan; later callers share the same promise.
   * Calling initialize() after dispose() rehydrates the registry.
   */
  async initialize(): Promise<void> {
    if (this.initialized && !this.disposed) return;

    // Return the in-flight promise if another caller is already initializing.
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();

    try {
      await this.initPromise;
    } finally {
      // Allow future re-initialization after the current attempt settles.
      this.initPromise = null;
    }
  }

  private async doInitialize(): Promise<void> {
    try {
      // Clear any stale data from a previous initialization cycle so we
      // do not leak entries across re-initializations.
      this.agents.clear();
      this.similarityCache.clear();
      this.disposed = false;

      // Resolve and store base path for security validation
      this.basePath = await realpath(this.agentDirPath);
      await this.scanAgentDirectory(this.agentDirPath, 0, new Set());
      this.initialized = true;
      console.log(`AgentRegistry initialized with ${this.agents.size} agents`);
    } catch (error) {
      console.error('Failed to initialize AgentRegistry:', error);
      // Don't mark as initialized on failure - let callers know initialization failed
      throw new Error(
        `AgentRegistry initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Release all held references.  The registry can be re-initialized later
   * via initialize() if needed.
   */
  dispose(): void {
    this.agents.clear();
    this.similarityCache.clear();
    this.initialized = false;
    this.disposed = true;
    this.initPromise = null;
    this.basePath = null;
  }

  /**
   * Returns true when the registry has been initialized and has not been
   * disposed.  Useful for callers that want to check readiness without
   * triggering a scan.
   */
  isReady(): boolean {
    return this.initialized && !this.disposed;
  }

  /**
   * Ensure the registry is initialized before performing any lookup.
   * Throws if the registry was disposed and not re-initialized.
   */
  private ensureInitialized(): void {
    if (this.disposed) {
      throw new Error(
        'AgentRegistry has been disposed. Call initialize() before performing lookups.'
      );
    }
    if (!this.initialized) {
      throw new Error(
        'AgentRegistry is not initialized. Await initialize() before performing lookups.'
      );
    }
  }

  /**
   * Recursively scan directory for agent definition files with security protections
   * @param dirPath - Directory path to scan
   * @param depth - Current recursion depth
   * @param visited - Set of visited real paths to detect symlink cycles
   */
  private async scanAgentDirectory(
    dirPath: string,
    depth: number = 0,
    visited: Set<string> = new Set()
  ): Promise<void> {
    // Bail out early if we have already hit the agent cap.
    if (this.agents.size >= AgentRegistry.MAX_AGENTS) return;

    try {
      // SECURITY: Prevent excessive recursion (DoS protection)
      if (depth > this.MAX_RECURSION_DEPTH) {
        console.warn(`Max recursion depth ${this.MAX_RECURSION_DEPTH} exceeded at: ${dirPath}`);
        return;
      }

      // SECURITY: Detect symbolic link cycles
      const realDirPath = await realpath(dirPath);
      if (visited.has(realDirPath)) {
        console.warn(`Symlink cycle detected, skipping: ${dirPath} -> ${realDirPath}`);
        return;
      }
      visited.add(realDirPath);

      // SECURITY: Ensure path stays within base directory (prevent path traversal)
      if (this.basePath && !realDirPath.startsWith(this.basePath)) {
        console.warn(`Path traversal attempt detected, rejecting: ${dirPath} (resolved: ${realDirPath})`);
        return;
      }

      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // Stop the entire scan if we hit the ceiling.
        if (this.agents.size >= AgentRegistry.MAX_AGENTS) {
          console.warn(
            `AgentRegistry: MAX_AGENTS limit (${AgentRegistry.MAX_AGENTS}) reached. ` +
            'Skipping remaining files.'
          );
          return;
        }

        // SECURITY: Validate filename for suspicious patterns
        if (!this.isValidFilename(entry.name)) {
          console.warn(`Suspicious filename rejected: ${entry.name}`);
          continue;
        }

        const fullPath = join(dirPath, entry.name);

        // SECURITY: Verify resolved path stays within base directory
        const resolvedPath = await realpath(fullPath);
        if (this.basePath && !resolvedPath.startsWith(this.basePath)) {
          console.warn(`Path traversal attempt via symlink, rejecting: ${fullPath} -> ${resolvedPath}`);
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively scan subdirectories with incremented depth
          await this.scanAgentDirectory(fullPath, depth + 1, visited);
        } else if (entry.isFile() && extname(entry.name) === '.md') {
          // Parse agent definition from markdown file
          await this.parseAgentFile(fullPath, entry.name);
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dirPath}:`, error);
    }
  }

  /**
   * Validate filename for suspicious patterns
   * @param filename - Filename to validate
   * @returns true if filename is safe, false otherwise
   */
  private isValidFilename(filename: string): boolean {
    // SECURITY: Reject filenames with path traversal patterns
    if (filename.includes('..')) {
      return false;
    }

    // SECURITY: Reject filenames with path separators
    if (filename.includes('/') || filename.includes('\\')) {
      return false;
    }

    // SECURITY: Reject filenames with null bytes (path injection)
    if (filename.includes('\0')) {
      return false;
    }

    // SECURITY: Reject hidden files starting with dot (except .md extension)
    if (filename.startsWith('.')) {
      return false;
    }

    return true;
  }

  /**
   * Parse agent definition file and extract metadata
   */
  private async parseAgentFile(filePath: string, fileName: string): Promise<void> {
    if (this.agents.size >= AgentRegistry.MAX_AGENTS) return;

    try {
      // SECURITY: Check file size before reading
      const fileStats = await stat(filePath);
      if (fileStats.size > this.MAX_FILE_SIZE) {
        console.warn(`File too large (${fileStats.size} bytes), rejecting: ${filePath}`);
        return;
      }

      // SECURITY: Verify file size is reasonable (not 0 bytes)
      if (fileStats.size === 0) {
        console.warn(`Empty file, skipping: ${filePath}`);
        return;
      }

      const content = await readFile(filePath, 'utf-8');

      // Extract agent name from filename (remove .md extension)
      const agentName = fileName.replace('.md', '');

      // Extract tier from frontmatter or content
      const tier = this.extractTier(content);
      const description = this.extractDescription(content);

      this.agents.set(agentName, {
        name: agentName,
        filePath,
        tier,
        exists: true,
        description
      });
    } catch (error) {
      console.warn(`Failed to parse agent file ${filePath}:`, error);
    }
  }

  /**
   * Extract tier from agent file content with ReDoS protection
   */
  private extractTier(content: string): AgentTier {
    // Look for tier in frontmatter or agent description (with ReDoS protection)
    const tierMatch = fastSafeRegexMatch(
      /tier:\s{0,10}(opus|sonnet|haiku)/i,
      content,
      this.MAX_FILE_SIZE,
      100
    );
    if (tierMatch) {
      const parsed = tierMatch[1].toLowerCase();
      if (isValidTier(parsed)) {
        return parsed;
      }
    }

    // Default to sonnet if not specified
    return DEFAULT_TIER;
  }

  /**
   * Extract description from agent file with ReDoS protection
   */
  private extractDescription(content: string): string | undefined {
    // Look for description in frontmatter with bounded quantifiers (ReDoS protection)
    const descMatch = fastSafeRegexMatch(
      /description:\s{0,10}(.{1,500})/i,
      content,
      this.MAX_FILE_SIZE,
      500
    );
    if (descMatch) {
      return descMatch[1].trim();
    }

    // Extract first non-empty line after heading (limit to first 50 lines for performance)
    const lines = content.split('\n');
    const MAX_LINES_TO_SCAN = 50;
    const limit = Math.min(lines.length, MAX_LINES_TO_SCAN);

    for (let i = 0; i < limit; i++) {
      const trimmed = lines[i].trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
        return trimmed.substring(0, 500); // Truncate to prevent large descriptions
      }
    }

    return undefined;
  }

  // -------------------------------------------------------------------------
  // Public query methods - with comprehensive input validation
  // -------------------------------------------------------------------------

  /**
   * Check if agent exists in registry.
   *
   * Validates the agent name format before performing the lookup.
   * Returns false (rather than throwing) for invalid names so callers
   * can use this in boolean contexts without try/catch.
   *
   * Accepts `unknown` to act as a type guard at the boundary layer.
   */
  validateAgent(agentName: unknown): boolean {
    this.ensureInitialized();

    const validation = validateAgentName(agentName);
    if (!validation.valid) {
      return false;
    }

    // validateAgentName confirmed this is a safe string
    const name = agentName as string;

    const agent = this.agents.get(name);
    if (agent === undefined) {
      return false;
    }

    return agent.exists;
  }

  /**
   * Get list of all available agents.
   *
   * Iterates entries directly to avoid non-null assertions on Map.get().
   */
  getAvailableAgents(): string[] {
    this.ensureInitialized();

    const available: string[] = [];
    for (const [name, definition] of this.agents) {
      if (definition.exists) {
        available.push(name);
      }
    }
    return available;
  }

  /**
   * Get agent definition by name.
   *
   * Returns undefined for invalid names or names not present in the registry.
   * Never throws for bad input -- callers should check the return value.
   *
   * Accepts `unknown` to act as a type guard at the boundary layer.
   */
  getAgent(agentName: unknown): AgentDefinition | undefined {
    this.ensureInitialized();

    const validation = validateAgentName(agentName);
    if (!validation.valid) {
      return undefined;
    }

    return this.agents.get(agentName as string);
  }

  /**
   * Get fallback agent when requested agent doesn't exist.
   *
   * Both parameters are validated:
   *  - originalAgent: must be a valid agent name string (used for fuzzy matching)
   *  - tier: if provided, must be a valid AgentTier; invalid values are ignored
   *
   * Always returns a safe, validated fallback agent name.
   */
  getFallbackAgent(originalAgent: unknown, tier?: unknown): string {
    this.ensureInitialized();

    // Validate originalAgent -- if it is invalid we skip the fuzzy match
    // and go straight to the tier-based fallback.
    const nameValidation = validateAgentName(originalAgent);

    if (nameValidation.valid) {
      const safeName = originalAgent as string;

      // Try to find similar agent
      const similar = this.findSimilarAgent(safeName);
      if (similar !== null) {
        console.warn(
          `Agent '${safeName}' not found, using similar agent '${similar}'`,
        );
        return similar;
      }
    }

    // Determine the tier to use for fallback selection.
    // Accept only known tier values; anything else falls back to DEFAULT_TIER.
    const safeTier: AgentTier = isValidTier(tier) ? tier : DEFAULT_TIER;

    const fallbackByTier: Record<AgentTier, string> = {
      opus: DEFAULT_FALLBACK_AGENT,
      sonnet: DEFAULT_FALLBACK_AGENT,
      haiku: DEFAULT_FALLBACK_AGENT,
    };

    const fallback = fallbackByTier[safeTier];
    const displayName =
      nameValidation.valid && typeof originalAgent === 'string'
        ? originalAgent
        : '<invalid>';
    console.warn(
      `Agent '${displayName}' not found, using fallback '${fallback}'`,
    );
    return fallback;
  }

  /**
   * Find agent with similar name (fuzzy match).
   *
   * Optimized with:
   * - Length-based filtering (30% tolerance)
   * - Early exit on first match above threshold
   * - Sorted by length difference for better early exit probability
   * - Bounded by MAX_FUZZY_MATCH_ITERATIONS
   */
  private findSimilarAgent(agentName: string): string | null {
    const normalized = agentName.toLowerCase().replace(/[-_]/g, '');
    const normalizedLen = normalized.length;

    // Pre-filter by length before expensive similarity calculation
    // Only check strings within 30% length difference
    const lengthTolerance = Math.ceil(normalizedLen * 0.3);
    const minLen = normalizedLen - lengthTolerance;
    const maxLen = normalizedLen + lengthTolerance;

    const candidates: Array<{ name: string; normalized: string; lenDiff: number }> = [];

    for (const [name] of this.agents) {
      const candidateNormalized = name.toLowerCase().replace(/[-_]/g, '');
      const candidateLen = candidateNormalized.length;

      // Length-based filtering: skip if length difference is too large
      if (candidateLen >= minLen && candidateLen <= maxLen) {
        candidates.push({
          name,
          normalized: candidateNormalized,
          lenDiff: Math.abs(candidateLen - normalizedLen)
        });
      }
    }

    // Sort candidates by length difference (closest first) for better early exit
    candidates.sort((a, b) => a.lenDiff - b.lenDiff);

    // Limit iterations to prevent performance degradation with large agent sets
    const maxIterations = Math.min(candidates.length, this.MAX_FUZZY_MATCH_ITERATIONS);

    for (let i = 0; i < maxIterations; i++) {
      const candidate = candidates[i];

      // Check similarity (cached internally)
      const score = this.similarity(normalized, candidate.normalized);

      // Early exit: return first match above threshold
      if (score > this.SIMILARITY_THRESHOLD) {
        return candidate.name;
      }
    }

    return null;
  }

  /**
   * Calculate string similarity (Jaro similarity).
   *
   * Results are cached to avoid redundant computation.
   * Cache is bounded to prevent unbounded memory growth.
   */
  private similarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;

    // Use null byte as separator -- cannot appear in validated agent names.
    const cacheKey = `${s1}\0${s2}`;
    const cached = this.similarityCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Clear cache if at capacity (simple strategy - could use LRU for better hit rate)
    if (this.similarityCache.size >= this.MAX_SIMILARITY_CACHE) {
      console.warn(
        `Similarity cache reached max size (${this.MAX_SIMILARITY_CACHE}), clearing cache`
      );
      this.similarityCache.clear();
    }

    const score = this.computeJaroSimilarity(s1, s2);
    this.similarityCache.set(cacheKey, score);
    return score;
  }

  /**
   * Core Jaro similarity computation (extracted for clarity).
   * Optimized with Uint8Array for memory efficiency (8x less memory than boolean[])
   */
  private computeJaroSimilarity(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0 || len2 === 0) return 0;

    // Ensure matchDistance is at least 0 to handle single-character strings
    const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);

    // Use Uint8Array instead of boolean arrays for memory efficiency
    // 0 = false, 1 = true (8x less memory than Array<boolean>)
    const s1Matches = new Uint8Array(len1);
    const s2Matches = new Uint8Array(len2);

    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, len2);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = 1;
        s2Matches[j] = 1;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    return (
      (matches / len1 +
        matches / len2 +
        (matches - transpositions / 2) / matches) /
      3
    );
  }

  /**
   * Get registry statistics.
   *
   * Returns a strongly-typed RegistryStats object.
   * Optimized to avoid double iteration.
   */
  getStats(): RegistryStats {
    this.ensureInitialized();

    const byTier: Record<AgentTier, number> = {
      opus: 0,
      sonnet: 0,
      haiku: 0,
    };

    let availableCount = 0;

    for (const agent of this.agents.values()) {
      if (isValidTier(agent.tier)) {
        byTier[agent.tier]++;
      } else {
        console.warn(`Agent '${agent.name}' has invalid tier: ${agent.tier}`);
      }

      if (agent.exists) {
        availableCount++;
      }
    }

    return {
      total: this.agents.size,
      byTier,
      available: availableCount,
    };
  }
}
