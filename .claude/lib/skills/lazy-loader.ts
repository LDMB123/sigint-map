/**
 * Lazy Skill Loader - Tiered skill loading with token budget management
 *
 * Features:
 * - Load level 1 (headers) by default for routing
 * - Load level 2 (quick ref) on demand for simple cases
 * - Load level 3 (full) only when needed for complex cases
 * - Track token budget (max 8000 tokens)
 * - Auto-unload unused skills to stay within budget
 * - LRU (Least Recently Used) eviction strategy
 *
 * @module skills/lazy-loader
 */

import type {
  CompressedSkill,
  SkillHeader,
  QuickReference,
  FullSkill,
} from './compressor';

// ============================================================================
// Configuration
// ============================================================================

export interface LoaderConfig {
  /** Maximum token budget (default: 8000) */
  maxTokens: number;

  /** Minimum tokens to free when evicting (default: 1000) */
  evictionThreshold: number;

  /** Enable debug logging */
  debug: boolean;

  /** Skill storage directory */
  skillsDir?: string;
}

const DEFAULT_CONFIG: LoaderConfig = {
  maxTokens: 8000,
  evictionThreshold: 1000,
  debug: false,
};

// ============================================================================
// Types
// ============================================================================

export enum LoadLevel {
  /** Headers only - for routing decisions */
  HEADER = 1,
  /** Quick reference - for simple cases */
  QUICK = 2,
  /** Full detail - for complex cases */
  FULL = 3,
}

interface SkillEntry {
  /** Skill identifier */
  id: string;

  /** Current load level */
  level: LoadLevel;

  /** Cached skill data */
  data: SkillHeader | QuickReference | FullSkill;

  /** Token count for current level */
  tokens: number;

  /** Last access timestamp */
  lastAccess: number;

  /** Access count */
  accessCount: number;
}

export interface LoaderStats {
  /** Total skills loaded */
  totalSkills: number;

  /** Skills at each level */
  levelCounts: {
    header: number;
    quick: number;
    full: number;
  };

  /** Current token usage */
  currentTokens: number;

  /** Maximum token budget */
  maxTokens: number;

  /** Token utilization percentage */
  utilization: number;

  /** Cache hit ratio */
  hitRatio: number;

  /** Total evictions */
  evictions: number;
}

// ============================================================================
// Lazy Loader
// ============================================================================

export class SkillLazyLoader {
  private config: LoaderConfig;
  private skills: Map<string, SkillEntry> = new Map();
  private currentTokens = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private evictionCount = 0;

  constructor(config: Partial<LoaderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log('Initialized with config:', this.config);
  }

  // ==========================================================================
  // Public API - Loading
  // ==========================================================================

  /**
   * Load skill headers (Level 1) - always loaded for routing
   *
   * @param skillId - Skill identifier
   * @returns Skill header or null if not found
   */
  async loadHeader(skillId: string): Promise<SkillHeader | null> {
    return this.loadSkill(skillId, LoadLevel.HEADER) as Promise<SkillHeader | null>;
  }

  /**
   * Load quick reference (Level 2) - on demand for simple cases
   *
   * @param skillId - Skill identifier
   * @returns Quick reference or null if not found
   */
  async loadQuick(skillId: string): Promise<QuickReference | null> {
    return this.loadSkill(skillId, LoadLevel.QUICK) as Promise<QuickReference | null>;
  }

  /**
   * Load full skill (Level 3) - only when needed for complex cases
   *
   * @param skillId - Skill identifier
   * @returns Full skill or null if not found
   */
  async loadFull(skillId: string): Promise<FullSkill | null> {
    return this.loadSkill(skillId, LoadLevel.FULL) as Promise<FullSkill | null>;
  }

  /**
   * Load all skills at header level for routing
   *
   * @returns Array of skill headers
   */
  async loadAllHeaders(): Promise<SkillHeader[]> {
    const skillIds = await this.discoverSkills();
    const headers: SkillHeader[] = [];

    for (const id of skillIds) {
      const header = await this.loadHeader(id);
      if (header) {
        headers.push(header);
      }
    }

    return headers;
  }

  /**
   * Preload multiple skills at specified level
   *
   * @param skillIds - Array of skill identifiers
   * @param level - Load level (default: HEADER)
   */
  async preload(skillIds: string[], level: LoadLevel = LoadLevel.HEADER): Promise<void> {
    for (const id of skillIds) {
      await this.loadSkill(id, level);
    }
  }

  // ==========================================================================
  // Public API - Cache Management
  // ==========================================================================

  /**
   * Unload specific skill to free tokens
   *
   * @param skillId - Skill identifier
   */
  unload(skillId: string): void {
    const entry = this.skills.get(skillId);
    if (entry) {
      this.currentTokens -= entry.tokens;
      this.skills.delete(skillId);
      this.log(`Unloaded skill: ${skillId} (freed ${entry.tokens} tokens)`);
    }
  }

  /**
   * Unload all skills
   */
  unloadAll(): void {
    this.skills.clear();
    this.currentTokens = 0;
    this.log('Unloaded all skills');
  }

  /**
   * Downgrade skill to lower level to save tokens
   *
   * @param skillId - Skill identifier
   * @param targetLevel - Target load level
   */
  async downgrade(skillId: string, targetLevel: LoadLevel): Promise<void> {
    const entry = this.skills.get(skillId);
    if (!entry || entry.level <= targetLevel) {
      return;
    }

    // Reload at lower level
    await this.loadSkill(skillId, targetLevel, true);
  }

  /**
   * Get current statistics
   */
  getStats(): LoaderStats {
    const levelCounts = {
      header: 0,
      quick: 0,
      full: 0,
    };

    for (const entry of this.skills.values()) {
      if (entry.level === LoadLevel.HEADER) levelCounts.header++;
      if (entry.level === LoadLevel.QUICK) levelCounts.quick++;
      if (entry.level === LoadLevel.FULL) levelCounts.full++;
    }

    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRatio = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    return {
      totalSkills: this.skills.size,
      levelCounts,
      currentTokens: this.currentTokens,
      maxTokens: this.config.maxTokens,
      utilization: (this.currentTokens / this.config.maxTokens) * 100,
      hitRatio,
      evictions: this.evictionCount,
    };
  }

  /**
   * Get currently loaded skill IDs
   */
  getLoadedSkills(): string[] {
    return Array.from(this.skills.keys());
  }

  /**
   * Check if skill is loaded at specified level
   */
  isLoaded(skillId: string, level: LoadLevel): boolean {
    const entry = this.skills.get(skillId);
    return entry !== undefined && entry.level >= level;
  }

  // ==========================================================================
  // Private - Core Loading Logic
  // ==========================================================================

  private async loadSkill(
    skillId: string,
    targetLevel: LoadLevel,
    force = false
  ): Promise<SkillHeader | QuickReference | FullSkill | null> {
    // Check cache
    const cached = this.skills.get(skillId);
    if (cached && cached.level >= targetLevel && !force) {
      this.cacheHits++;
      this.updateAccess(skillId);
      this.log(`Cache hit: ${skillId} (level ${targetLevel})`);
      return cached.data;
    }

    this.cacheMisses++;

    // Load compressed skill from storage
    const compressed = await this.loadCompressedSkill(skillId);
    if (!compressed) {
      this.log(`Skill not found: ${skillId}`);
      return null;
    }

    // Select data based on target level
    let data: SkillHeader | QuickReference | FullSkill;
    let tokens: number;

    switch (targetLevel) {
      case LoadLevel.HEADER:
        data = compressed.level1;
        tokens = compressed.meta.compressed_tokens.level1;
        break;
      case LoadLevel.QUICK:
        data = compressed.level2;
        tokens = compressed.meta.compressed_tokens.level2;
        break;
      case LoadLevel.FULL:
        data = compressed.level3;
        tokens = compressed.meta.compressed_tokens.level3;
        break;
      default:
        throw new Error(`Invalid load level: ${targetLevel}`);
    }

    // Calculate required tokens (accounting for upgrade/downgrade)
    const requiredTokens = cached ? tokens - cached.tokens : tokens;

    // Ensure we have budget for this skill (exclude current skill from eviction)
    if (requiredTokens > 0) {
      await this.ensureBudget(requiredTokens, skillId);
    }

    // Update or create entry
    if (cached) {
      this.currentTokens -= cached.tokens;
    }

    const entry: SkillEntry = {
      id: skillId,
      level: targetLevel,
      data,
      tokens,
      lastAccess: Date.now(),
      accessCount: cached ? cached.accessCount + 1 : 1,
    };

    this.skills.set(skillId, entry);
    this.currentTokens += tokens;

    this.log(
      `Loaded ${skillId} at level ${targetLevel} (${tokens} tokens, total: ${this.currentTokens})`
    );

    return data;
  }

  /**
   * Load compressed skill from storage
   */
  private async loadCompressedSkill(skillId: string): Promise<CompressedSkill | null> {
    // In a real implementation, this would load from file system or database
    // For now, return null to indicate skill not found
    // This should be overridden by a subclass or configured with a loader function

    if (this.config.skillsDir) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(this.config.skillsDir, `${skillId}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content) as CompressedSkill;
      } catch (error) {
        this.log(`Failed to load skill ${skillId}:`, error);
        return null;
      }
    }

    // No storage configured
    return null;
  }

  /**
   * Discover available skills
   */
  private async discoverSkills(): Promise<string[]> {
    if (this.config.skillsDir) {
      try {
        const fs = await import('fs/promises');
        const files = await fs.readdir(this.config.skillsDir);
        return files
          .filter(f => f.endsWith('.json'))
          .map(f => f.replace(/\.json$/, ''));
      } catch (error) {
        this.log('Failed to discover skills:', error);
        return [];
      }
    }

    return [];
  }

  // ==========================================================================
  // Private - Budget Management
  // ==========================================================================

  /**
   * Ensure we have enough budget for additional tokens
   *
   * @param requiredTokens - Number of tokens needed
   * @param excludeSkillId - Skill ID to exclude from eviction (e.g., when upgrading)
   */
  private async ensureBudget(requiredTokens: number, excludeSkillId?: string): Promise<void> {
    const available = this.config.maxTokens - this.currentTokens;

    if (available >= requiredTokens) {
      return;
    }

    const toFree = requiredTokens - available + this.config.evictionThreshold;
    await this.evict(toFree, excludeSkillId);
  }

  /**
   * Evict skills to free up tokens using LRU strategy
   *
   * @param targetTokens - Number of tokens to free
   * @param excludeSkillId - Skill ID to exclude from eviction
   */
  private async evict(targetTokens: number, excludeSkillId?: string): Promise<void> {
    this.log(`Evicting to free ${targetTokens} tokens`);

    // Sort by last access time (LRU), excluding the specified skill
    const entries = Array.from(this.skills.values())
      .filter(entry => entry.id !== excludeSkillId)
      .sort((a, b) => a.lastAccess - b.lastAccess);

    let freedTokens = 0;

    for (const entry of entries) {
      if (freedTokens >= targetTokens) {
        break;
      }

      // Try to downgrade before evicting
      if (entry.level === LoadLevel.FULL) {
        // Downgrade FULL -> QUICK
        await this.downgrade(entry.id, LoadLevel.QUICK);
        const newEntry = this.skills.get(entry.id);
        if (newEntry) {
          freedTokens += entry.tokens - newEntry.tokens;
          this.evictionCount++;
        }
      } else if (entry.level === LoadLevel.QUICK) {
        // Downgrade QUICK -> HEADER
        await this.downgrade(entry.id, LoadLevel.HEADER);
        const newEntry = this.skills.get(entry.id);
        if (newEntry) {
          freedTokens += entry.tokens - newEntry.tokens;
          this.evictionCount++;
        }
      } else {
        // Unload completely
        this.unload(entry.id);
        freedTokens += entry.tokens;
        this.evictionCount++;
      }
    }

    this.log(`Evicted ${freedTokens} tokens (${this.evictionCount} operations)`);

    if (freedTokens < targetTokens) {
      this.log(`Warning: Could not free enough tokens (freed ${freedTokens}/${targetTokens})`);
    }
  }

  /**
   * Update access timestamp for LRU tracking
   */
  private updateAccess(skillId: string): void {
    const entry = this.skills.get(skillId);
    if (entry) {
      entry.lastAccess = Date.now();
      entry.accessCount++;
    }
  }

  // ==========================================================================
  // Private - Utilities
  // ==========================================================================

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[SkillLazyLoader]', ...args);
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a loader with default configuration
 */
export function createLoader(config?: Partial<LoaderConfig>): SkillLazyLoader {
  return new SkillLazyLoader(config);
}

/**
 * Create a loader with custom skill storage
 */
export function createLoaderWithStorage(
  skillsDir: string,
  config?: Partial<LoaderConfig>
): SkillLazyLoader {
  return new SkillLazyLoader({
    ...config,
    skillsDir,
  });
}

// ============================================================================
// Export Types
// ============================================================================

export type { CompressedSkill, SkillHeader, QuickReference, FullSkill };
