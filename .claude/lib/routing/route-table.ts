/**
 * Zero-Overhead Router - Route Table
 * Implements O(1) agent lookup with semantic hashing and hot path caching
 * Target: <0.1ms lookup time, <5% re-routing rate
 *
 * Security: Path traversal protection, symlink resolution, size limits
 */

import { readFileSync, statSync, realpathSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, join, dirname, normalize, extname } from 'path';

/**
 * Semantic hash components (64-bit routing hash)
 */
interface SemanticHash {
  domain: number;      // 8 bits: rust/wasm/svelte/security/etc
  complexity: number;  // 4 bits: 0-15 complexity score
  action: number;      // 8 bits: create/debug/optimize/migrate/etc
  subtype: number;     // 12 bits: specific task type
  confidence: number;  // 4 bits: routing confidence (0-15)
  reserved: number;    // 28 bits: future use
}

/**
 * Agent route with tier assignment
 */
interface AgentRoute {
  agent: string;
  tier: 'opus' | 'sonnet' | 'haiku';
  confidence?: number;
  avgLatency?: number;
}

/**
 * Hot path cache entry
 */
interface HotPathEntry {
  requestPattern: string;  // Normalized request pattern
  semanticHash: bigint;    // Computed hash
  agent: string;
  tier: 'opus' | 'sonnet' | 'haiku';
  avgLatency: number;
  successRate: number;
  lastUsed: number;
  hits: number;
}

/**
 * Route table JSON structure
 */
interface RouteTableData {
  version: string;
  routes: Record<string, AgentRoute>;
  domains: Record<string, number>;
  actions: Record<string, number>;
  subtypes: Record<string, number>;
  default_route?: AgentRoute;
}

/**
 * Fuzzy match result
 */
interface FuzzyMatchResult {
  route: AgentRoute;
  similarity: number;
  matchedHash: bigint;
}

/**
 * RouteTable - Zero-overhead agent routing
 *
 * Features:
 * - O(1) hash-based lookups
 * - LRU hot path cache (1000 entries)
 * - Fuzzy matching for unknown patterns
 * - Sub-millisecond performance
 */
export class RouteTable {
  private routeMap: Map<bigint, AgentRoute>;
  private hotPathCache: Map<string, HotPathEntry>;
  private hotPathLRU: string[];
  private readonly maxCacheSize = 1000;

  private domainMap: Map<string, number>;
  private actionMap: Map<string, number>;
  private subtypeMap: Map<string, number>;
  private defaultRoute: AgentRoute;

  // Security configuration
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_EXTENSIONS = ['.json'];
  private readonly allowedDirectories: Set<string>;
  private readonly projectRoot: string;

  private stats = {
    lookups: 0,
    cacheHits: 0,
    cacheMisses: 0,
    fuzzyMatches: 0,
    defaultFallbacks: 0,
    avgLookupTimeMs: 0,
    securityViolations: 0
  };

  constructor(routeTablePath?: string) {
    this.routeMap = new Map();
    this.hotPathCache = new Map();
    this.hotPathLRU = [];
    this.domainMap = new Map();
    this.actionMap = new Map();
    this.subtypeMap = new Map();
    this.defaultRoute = {
      agent: 'full-stack-developer',
      tier: 'sonnet',
      confidence: 5
    };

    // Security: Sanitize project root (prevent env var injection)
    this.projectRoot = this.sanitizeProjectRoot();

    // Security: Initialize whitelist of allowed directories
    this.allowedDirectories = new Set([
      join(this.projectRoot, '.claude', 'config'),
      join(this.projectRoot, '.claude', 'lib', 'routing'),
      join(this.projectRoot, 'config')
    ]);

    // Load pre-compiled routes if path provided
    if (routeTablePath) {
      this.loadRouteTable(routeTablePath);
    } else {
      // Use sanitized path (no environment variable for path itself)
      const defaultPath = join(this.projectRoot, '.claude', 'config', 'route-table.json');
      try {
        this.loadRouteTable(defaultPath);
      } catch (error) {
        // Initialize with empty route table if file doesn't exist
        this.initializeDefaultMappings();
      }
    }
  }

  /**
   * Sanitize project root to prevent environment variable injection
   * Only allows: current working directory or explicitly validated paths
   */
  private sanitizeProjectRoot(): string {
    // Never trust CLAUDE_PROJECT_ROOT from environment - use cwd() only
    const root = process.cwd();

    // Validate it's a real directory
    try {
      const resolved = realpathSync(root);
      // Ensure it's not a sensitive system directory
      if (this.isSensitiveSystemPath(resolved)) {
        throw new Error('Security: Project root cannot be a system directory');
      }
      return resolved;
    } catch (error) {
      throw new Error(`Security: Invalid project root: ${error}`);
    }
  }

  /**
   * Check if path is a sensitive system directory
   */
  private isSensitiveSystemPath(path: string): boolean {
    const sensitive = ['/etc', '/bin', '/sbin', '/usr/bin', '/usr/sbin', '/root', '/var', '/sys', '/proc'];
    const normalized = normalize(path).toLowerCase();
    return sensitive.some(s => normalized === s || normalized.startsWith(s + '/'));
  }

  /**
   * Validate path is safe to read
   * Checks:
   * 1. Path is within project directory
   * 2. Extension is whitelisted (.json only)
   * 3. File size is within limits
   * 4. Resolves symlinks to prevent directory traversal
   * 5. Path is in allowed directory whitelist
   */
  private validatePath(inputPath: string): string {
    try {
      // Step 1: Resolve path relative to project root (prevent relative path attacks)
      const absolutePath = resolve(this.projectRoot, inputPath);

      // Step 2: Resolve symlinks to real path (prevent symlink attacks)
      let resolvedPath: string;
      try {
        resolvedPath = realpathSync(absolutePath);
      } catch (error) {
        throw new Error(`Path does not exist or cannot be resolved: ${inputPath}`);
      }

      // Step 3: Verify resolved path is still within project root (prevent traversal)
      if (!resolvedPath.startsWith(this.projectRoot + '/') && resolvedPath !== this.projectRoot) {
        this.stats.securityViolations++;
        throw new Error(`Security: Path traversal detected - path outside project: ${inputPath}`);
      }

      // Step 4: Verify file extension is whitelisted
      const ext = extname(resolvedPath).toLowerCase();
      if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
        this.stats.securityViolations++;
        throw new Error(`Security: Invalid file extension - only ${this.ALLOWED_EXTENSIONS.join(', ')} allowed: ${ext}`);
      }

      // Step 5: Check if path is in allowed directories
      const fileDir = dirname(resolvedPath);
      let isAllowed = false;
      for (const allowedDir of this.allowedDirectories) {
        if (fileDir === allowedDir || fileDir.startsWith(allowedDir + '/')) {
          isAllowed = true;
          break;
        }
      }
      if (!isAllowed) {
        this.stats.securityViolations++;
        throw new Error(`Security: Path not in allowed directories: ${fileDir}`);
      }

      // Step 6: Check file size before reading
      const stats = statSync(resolvedPath);
      if (stats.size > this.MAX_FILE_SIZE) {
        this.stats.securityViolations++;
        throw new Error(`Security: File too large (${stats.size} bytes > ${this.MAX_FILE_SIZE} bytes): ${inputPath}`);
      }

      // Additional check: ensure it's a regular file, not a device or socket
      if (!stats.isFile()) {
        this.stats.securityViolations++;
        throw new Error(`Security: Path is not a regular file: ${inputPath}`);
      }

      return resolvedPath;
    } catch (error) {
      // Re-throw security errors with additional context
      if (error instanceof Error) {
        throw new Error(`Path validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Load pre-compiled route table from JSON (with security validation)
   */
  private loadRouteTable(path: string): void {
    // Security: Validate path before reading
    const validatedPath = this.validatePath(path);

    // Security: Read file with validated path
    const data: RouteTableData = JSON.parse(readFileSync(validatedPath, 'utf-8'));

    // Load domain/action/subtype mappings
    for (const [key, value] of Object.entries(data.domains)) {
      this.domainMap.set(key.toLowerCase(), value);
    }
    for (const [key, value] of Object.entries(data.actions)) {
      this.actionMap.set(key.toLowerCase(), value);
    }
    for (const [key, value] of Object.entries(data.subtypes)) {
      this.subtypeMap.set(key.toLowerCase(), value);
    }

    // Load routes into hash map
    for (const [hashStr, route] of Object.entries(data.routes)) {
      const hash = BigInt('0x' + hashStr);
      this.routeMap.set(hash, route);
    }

    // Set default route if provided
    if (data.default_route) {
      this.defaultRoute = data.default_route;
    }
  }

  /**
   * Initialize default domain/action/subtype mappings
   */
  private initializeDefaultMappings(): void {
    // Domains (0x01-0xFF)
    const domains: Record<string, number> = {
      rust: 0x01,
      wasm: 0x02,
      sveltekit: 0x03,
      svelte: 0x03,
      security: 0x04,
      frontend: 0x05,
      react: 0x05,
      backend: 0x06,
      database: 0x07,
      testing: 0x08,
      performance: 0x09,
      architecture: 0x0A,
      documentation: 0x0B,
      devops: 0x0C,
      general: 0x0F
    };

    // Actions (0x01-0xFF)
    const actions: Record<string, number> = {
      create: 0x01,
      debug: 0x02,
      optimize: 0x03,
      refactor: 0x04,
      migrate: 0x05,
      review: 0x06,
      analyze: 0x07,
      test: 0x08,
      document: 0x09,
      fix: 0x0A,
      update: 0x0B,
      implement: 0x0C
    };

    // Subtypes (0x001-0xFFF)
    const subtypes: Record<string, number> = {
      borrow: 0x042,
      lifetime: 0x043,
      'leptos-ssr': 0x015,
      component: 0x020,
      api: 0x030,
      schema: 0x040,
      route: 0x050,
      state: 0x060,
      auth: 0x070,
      validation: 0x080
    };

    for (const [key, value] of Object.entries(domains)) {
      this.domainMap.set(key, value);
    }
    for (const [key, value] of Object.entries(actions)) {
      this.actionMap.set(key, value);
    }
    for (const [key, value] of Object.entries(subtypes)) {
      this.subtypeMap.set(key, value);
    }
  }

  /**
   * Route a request to the optimal agent
   * @param request - User request or task description
   * @param context - Additional context for routing decision
   * @returns Agent route with tier assignment
   */
  route(request: string, context?: Record<string, any>): AgentRoute {
    const startTime = performance.now();
    this.stats.lookups++;

    const normalizedRequest = this.normalizeRequest(request);

    // Step 1: Check hot path cache (0ms)
    const cached = this.checkHotCache(normalizedRequest);
    if (cached) {
      this.stats.cacheHits++;
      this.updateStats(performance.now() - startTime);
      return { agent: cached.agent, tier: cached.tier };
    }

    this.stats.cacheMisses++;

    // Step 2: Generate semantic hash (<1ms)
    const hash = this.generateSemanticHash(request, context);
    const hashValue = this.packHash(hash);

    // Step 3: Lookup in route table (O(1), ~0.1ms)
    let route = this.routeMap.get(hashValue);

    if (!route) {
      // Step 4: Try fuzzy matching with wildcard patterns (~5ms)
      const fuzzyMatch = this.fuzzyMatch(hash);
      if (fuzzyMatch && fuzzyMatch.similarity > 0.7) {
        route = fuzzyMatch.route;
        this.stats.fuzzyMatches++;
      }
    }

    // Step 5: Fallback to default route
    if (!route) {
      route = this.defaultRoute;
      this.stats.defaultFallbacks++;
    }

    // Update hot path cache
    this.updateHotCache(normalizedRequest, hashValue, route);

    this.updateStats(performance.now() - startTime);
    return route;
  }

  /**
   * Generate semantic hash from request
   */
  generateSemanticHash(request: string, context?: Record<string, any>): SemanticHash {
    const lower = request.toLowerCase();
    const words = lower.split(/\s+/);

    // Detect domain
    let domain = 0x0F; // default: general
    for (const [key, value] of this.domainMap.entries()) {
      if (lower.includes(key)) {
        domain = value;
        break;
      }
    }

    // Detect action
    let action = 0x01; // default: create
    for (const [key, value] of this.actionMap.entries()) {
      if (words.includes(key) || lower.includes(key)) {
        action = value;
        break;
      }
    }

    // Detect subtype
    let subtype = 0x000;
    for (const [key, value] of this.subtypeMap.entries()) {
      if (lower.includes(key)) {
        subtype = value;
        break;
      }
    }

    // Calculate complexity (0-15)
    const complexity = this.estimateComplexity(request, context);

    // Calculate confidence (0-15)
    const confidence = this.calculateConfidence(domain, action, subtype);

    return {
      domain,
      complexity,
      action,
      subtype,
      confidence,
      reserved: 0
    };
  }

  /**
   * Pack semantic hash into 64-bit bigint
   *
   * Uses BigInt to avoid JavaScript's 32-bit truncation on bitwise operators.
   * Standard JS bitwise ops (<<, |, &, >>) coerce operands to signed 32-bit
   * integers, which silently destroys any bits shifted past position 31.
   * Layout: [domain:8][complexity:4][action:8][subtype:12][confidence:4][reserved:28]
   */
  private packHash(hash: SemanticHash): bigint {
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
   * Unpack 64-bit bigint into components
   */
  private unpackHash(packed: bigint): SemanticHash {
    return {
      domain: Number((packed >> 56n) & 0xFFn),
      complexity: Number((packed >> 52n) & 0x0Fn),
      action: Number((packed >> 44n) & 0xFFn),
      subtype: Number((packed >> 32n) & 0xFFFn),
      confidence: Number((packed >> 28n) & 0x0Fn),
      reserved: Number(packed & 0x0FFFFFFFn)
    };
  }

  /**
   * Fuzzy match against existing routes using wildcard patterns
   */
  private fuzzyMatch(hash: SemanticHash): FuzzyMatchResult | null {
    let bestMatch: FuzzyMatchResult | null = null;
    let bestSimilarity = 0;

    // Try matching with wildcards in different components
    const variants = this.generateHashVariants(hash);

    for (const variant of variants) {
      const route = this.routeMap.get(variant.hash);
      if (route && variant.similarity > bestSimilarity) {
        bestSimilarity = variant.similarity;
        bestMatch = {
          route,
          similarity: variant.similarity,
          matchedHash: variant.hash
        };
      }
    }

    return bestMatch;
  }

  /**
   * Generate hash variants with wildcards for fuzzy matching
   */
  private generateHashVariants(hash: SemanticHash): Array<{ hash: bigint; similarity: number }> {
    const variants: Array<{ hash: bigint; similarity: number }> = [];

    // Variant 1: Match domain + action (ignore subtype)
    variants.push({
      hash: this.packHash({ ...hash, subtype: 0x000, complexity: 0 }),
      similarity: 0.8
    });

    // Variant 2: Match domain only (ignore action and subtype)
    variants.push({
      hash: this.packHash({ ...hash, action: 0x00, subtype: 0x000, complexity: 0 }),
      similarity: 0.6
    });

    // Variant 3: Match action only (ignore domain and subtype)
    variants.push({
      hash: this.packHash({ ...hash, domain: 0x00, subtype: 0x000, complexity: 0 }),
      similarity: 0.5
    });

    return variants;
  }

  /**
   * Estimate task complexity (0-15)
   */
  private estimateComplexity(request: string, context?: Record<string, any>): number {
    let complexity = 5; // baseline

    const lower = request.toLowerCase();

    // Increase for complex keywords
    const complexKeywords = ['architecture', 'system', 'migration', 'optimize', 'refactor', 'design'];
    const simpleKeywords = ['fix', 'update', 'small', 'simple', 'quick'];

    for (const keyword of complexKeywords) {
      if (lower.includes(keyword)) complexity += 2;
    }
    for (const keyword of simpleKeywords) {
      if (lower.includes(keyword)) complexity -= 2;
    }

    // Adjust based on request length
    if (request.length > 200) complexity += 2;
    if (request.length < 50) complexity -= 1;

    // Clamp to 0-15
    return Math.max(0, Math.min(15, complexity));
  }

  /**
   * Calculate routing confidence (0-15)
   */
  private calculateConfidence(domain: number, action: number, subtype: number): number {
    let confidence = 10; // baseline

    // Higher confidence if all components detected
    if (domain !== 0x0F) confidence += 2; // not default domain
    if (action !== 0x01) confidence += 1; // not default action
    if (subtype !== 0x000) confidence += 2; // specific subtype detected

    return Math.min(15, confidence);
  }

  /**
   * Normalize request for caching
   */
  private normalizeRequest(request: string): string {
    return request
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200); // Truncate for cache key
  }

  /**
   * Check hot path cache
   */
  private checkHotCache(normalizedRequest: string): HotPathEntry | null {
    const entry = this.hotPathCache.get(normalizedRequest);
    if (!entry) return null;

    // Update LRU
    entry.lastUsed = Date.now();
    entry.hits++;

    // Move to front of LRU list
    const index = this.hotPathLRU.indexOf(normalizedRequest);
    if (index > -1) {
      this.hotPathLRU.splice(index, 1);
    }
    this.hotPathLRU.unshift(normalizedRequest);

    return entry;
  }

  /**
   * Update hot path cache with new entry
   */
  private updateHotCache(normalizedRequest: string, hash: bigint, route: AgentRoute): void {
    // Create or update entry
    const existing = this.hotPathCache.get(normalizedRequest);
    const entry: HotPathEntry = existing || {
      requestPattern: normalizedRequest,
      semanticHash: hash,
      agent: route.agent,
      tier: route.tier,
      avgLatency: route.avgLatency || 0,
      successRate: 1.0,
      lastUsed: Date.now(),
      hits: 0
    };

    // Update if route changed
    if (!existing || existing.agent !== route.agent) {
      entry.agent = route.agent;
      entry.tier = route.tier;
      entry.semanticHash = hash;
    }

    this.hotPathCache.set(normalizedRequest, entry);

    // Update LRU list
    const index = this.hotPathLRU.indexOf(normalizedRequest);
    if (index > -1) {
      this.hotPathLRU.splice(index, 1);
    }
    this.hotPathLRU.unshift(normalizedRequest);

    // Evict if over capacity (LRU)
    if (this.hotPathLRU.length > this.maxCacheSize) {
      const evicted = this.hotPathLRU.pop();
      if (evicted) {
        this.hotPathCache.delete(evicted);
      }
    }
  }

  /**
   * Update routing statistics
   */
  private updateStats(lookupTimeMs: number): void {
    const total = this.stats.lookups;
    this.stats.avgLookupTimeMs =
      (this.stats.avgLookupTimeMs * (total - 1) + lookupTimeMs) / total;
  }

  /**
   * Get routing statistics (including security metrics)
   */
  getStats() {
    const hitRate = this.stats.lookups > 0
      ? this.stats.cacheHits / this.stats.lookups
      : 0;

    return {
      ...this.stats,
      cacheHitRate: hitRate,
      cacheSize: this.hotPathCache.size,
      routeTableSize: this.routeMap.size,
      projectRoot: this.projectRoot,
      allowedDirectoryCount: this.allowedDirectories.size
    };
  }

  /**
   * Clear hot path cache
   */
  clearCache(): void {
    this.hotPathCache.clear();
    this.hotPathLRU = [];
  }

  /**
   * Get cache entry for debugging
   */
  getCacheEntry(request: string): HotPathEntry | undefined {
    const normalized = this.normalizeRequest(request);
    return this.hotPathCache.get(normalized);
  }

  /**
   * Manually add route to table
   */
  addRoute(hash: SemanticHash, route: AgentRoute): void {
    const packed = this.packHash(hash);
    this.routeMap.set(packed, route);
  }

  /**
   * Get route for specific hash
   */
  getRoute(hash: SemanticHash): AgentRoute | undefined {
    const packed = this.packHash(hash);
    return this.routeMap.get(packed);
  }

  /**
   * Batch route multiple requests (for parallel optimization)
   */
  batchRoute(requests: string[], context?: Record<string, any>): AgentRoute[] {
    return requests.map(req => this.route(req, context));
  }

  /**
   * Export current cache state for persistence.
   *
   * BigInt values (semanticHash) are serialized as hex strings prefixed with
   * "0x" so they survive JSON round-tripping. Use importCache() to restore.
   */
  exportCache(): string {
    const obj = Object.fromEntries(this.hotPathCache.entries());
    return JSON.stringify(obj, (_key, value) =>
      typeof value === 'bigint' ? `0x${value.toString(16)}` : value
    );
  }

  /**
   * Import cache state from persistence (JSON string produced by exportCache).
   *
   * Hex-string semanticHash values are revived back to BigInt.
   */
  importCache(cacheJson: string): void {
    const cacheData: Record<string, HotPathEntry> = JSON.parse(cacheJson, (_key, value) => {
      if (typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value)) {
        return BigInt(value);
      }
      return value;
    });

    this.hotPathCache.clear();
    this.hotPathLRU = [];

    const entries = Object.entries(cacheData)
      .sort((a, b) => b[1].lastUsed - a[1].lastUsed)
      .slice(0, this.maxCacheSize);

    for (const [key, entry] of entries) {
      this.hotPathCache.set(key, entry);
      this.hotPathLRU.push(key);
    }
  }
}

// Export singleton instance with default route table
export const routeTable = new RouteTable();

// Export types
export type { SemanticHash, AgentRoute, HotPathEntry, RouteTableData };
