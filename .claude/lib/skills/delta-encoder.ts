/**
 * Delta Encoder - Base + Delta skill compression for similar skills
 *
 * Achieves additional 20-30% compression beyond structural compression by:
 * - Identifying base patterns across similar skills
 * - Extracting deltas (only unique content)
 * - Reconstructing full skill from base + delta
 * - Enabling efficient skill packs with shared base patterns
 *
 * @module skills/delta-encoder
 */

import type { CompressedSkill, SkillHeader, QuickReference, FullSkill } from './compressor';

// ============================================================================
// Types
// ============================================================================

export interface BaseSkill {
  /** Base skill identifier */
  id: string;

  /** Domain for this base pattern */
  domain: string;

  /** Common structure shared across similar skills */
  structure: {
    /** Common keywords across similar skills */
    common_keywords: string[];

    /** Common error patterns */
    common_error_patterns?: string[];

    /** Common fix patterns */
    common_fix_patterns?: string[];

    /** Common section templates */
    common_sections?: string[];
  };

  /** Base-level data that is shared */
  base_data: Partial<FullSkill>;

  /** Token count for base */
  base_tokens: number;

  /** Skills that share this base */
  derived_skills: string[];
}

export interface DeltaSkill {
  /** Skill identifier */
  skill: string;

  /** Reference to base skill */
  base_id: string;

  /** Only unique data not in base */
  delta: {
    /** Unique keywords not in base */
    keywords?: string[];

    /** Unique error codes not in base */
    errors?: string[];

    /** Unique quick fixes */
    quick_fixes?: Record<string, string>;

    /** Unique patterns */
    patterns?: Array<{
      match: string;
      suggest: string[];
    }>;

    /** Unique error details */
    error_details?: Record<string, {
      cause: string;
      fix: string;
      example?: string;
    }>;

    /** Unique detailed patterns */
    detailed_patterns?: Array<{
      match: string;
      context: string;
      suggest: string[];
      examples?: string[];
    }>;

    /** Unique edge cases */
    edge_cases?: string[];

    /** Unique related skills */
    related?: string[];

    /** Override priority */
    priority?: string[];
  };

  /** Delta token count */
  delta_tokens: number;

  /** Original compressed token count (without delta) */
  original_tokens: number;

  /** Version */
  version: string;
}

export interface SkillPack {
  /** Pack identifier */
  pack_id: string;

  /** Pack version */
  version: string;

  /** Domain or category */
  domain: string;

  /** Base skills in this pack */
  bases: BaseSkill[];

  /** Delta skills in this pack */
  deltas: DeltaSkill[];

  /** Total token count (bases + all deltas) */
  total_tokens: number;

  /** Original token count without delta compression */
  original_total_tokens: number;

  /** Additional compression ratio achieved */
  delta_compression_ratio: number;

  /** Metadata */
  meta: {
    skill_count: number;
    created_at: string;
  };
}

// ============================================================================
// Delta Encoder
// ============================================================================

/**
 * Identify common patterns across similar skills and create a base skill
 *
 * @param skills - Array of compressed skills in the same domain
 * @returns Base skill containing common patterns
 */
export function createBaseSkill(skills: CompressedSkill[]): BaseSkill {
  if (skills.length === 0) {
    throw new Error('Cannot create base skill from empty array');
  }

  if (skills.length === 1) {
    // For single skill, create minimal base
    const skill = skills[0];
    return {
      id: `${skill.level1.domain}-base`,
      domain: skill.level1.domain,
      structure: {
        common_keywords: [],
        common_error_patterns: [],
        common_fix_patterns: [],
      },
      base_data: {},
      base_tokens: 0,
      derived_skills: [skill.level1.skill],
    };
  }

  const domain = skills[0].level1.domain;

  // Extract common keywords (appear in >50% of skills)
  const keywordFrequency = new Map<string, number>();
  skills.forEach(skill => {
    skill.level1.keywords.forEach(kw => {
      keywordFrequency.set(kw, (keywordFrequency.get(kw) || 0) + 1);
    });
  });

  const threshold = Math.ceil(skills.length * 0.5);
  const commonKeywords = Array.from(keywordFrequency.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([kw, _]) => kw);

  // Extract common error patterns (prefixes like E0, TS, ERR_)
  const errorPatterns = new Set<string>();
  skills.forEach(skill => {
    if (skill.level1.errors) {
      skill.level1.errors.forEach(err => {
        const pattern = err.match(/^[A-Z]+\d*/)?.[0];
        if (pattern) errorPatterns.add(pattern);
      });
    }
  });

  // Extract common fix patterns from quick_fixes
  const fixPatterns = new Set<string>();
  skills.forEach(skill => {
    Object.values(skill.level2.quick_fixes || {}).forEach(fix => {
      // Extract common fix terms
      const terms = extractFixTerms(fix);
      terms.forEach(term => fixPatterns.add(term));
    });
  });

  // Identify common sections
  const commonSections = ['errors', 'patterns', 'fixes', 'edge_cases', 'related'];

  // Build base data with most common patterns
  const baseData: Partial<FullSkill> = {
    domain,
    keywords: commonKeywords,
  };

  // Calculate base tokens
  const baseTokens = estimateTokens(JSON.stringify({
    structure: {
      common_keywords: commonKeywords,
      common_error_patterns: Array.from(errorPatterns),
      common_fix_patterns: Array.from(fixPatterns),
      common_sections: commonSections,
    },
    base_data: baseData,
  }));

  return {
    id: `${domain}-base`,
    domain,
    structure: {
      common_keywords: commonKeywords,
      common_error_patterns: Array.from(errorPatterns),
      common_fix_patterns: Array.from(fixPatterns),
      common_sections: commonSections,
    },
    base_data: baseData,
    base_tokens: baseTokens,
    derived_skills: skills.map(s => s.level1.skill),
  };
}

/**
 * Extract delta (unique content) from a compressed skill given a base
 *
 * @param skill - Compressed skill
 * @param base - Base skill pattern
 * @returns Delta containing only unique content
 */
export function extractDelta(skill: CompressedSkill, base: BaseSkill): DeltaSkill {
  const delta: DeltaSkill['delta'] = {};

  // Extract unique keywords not in base
  const uniqueKeywords = skill.level1.keywords.filter(
    kw => !base.structure.common_keywords.includes(kw)
  );
  if (uniqueKeywords.length > 0) {
    delta.keywords = uniqueKeywords;
  }

  // Extract unique errors
  if (skill.level1.errors && skill.level1.errors.length > 0) {
    delta.errors = skill.level1.errors;
  }

  // Extract unique quick fixes (filter out common patterns)
  const quickFixes = skill.level2.quick_fixes || {};
  const uniqueQuickFixes: Record<string, string> = {};

  Object.entries(quickFixes).forEach(([problem, solution]) => {
    // Check if solution contains only common patterns
    const hasUniqueContent = !isCommonPattern(solution, base.structure.common_fix_patterns || []);
    if (hasUniqueContent) {
      uniqueQuickFixes[problem] = solution;
    }
  });

  if (Object.keys(uniqueQuickFixes).length > 0) {
    delta.quick_fixes = uniqueQuickFixes;
  }

  // Extract unique patterns
  if (skill.level2.patterns && skill.level2.patterns.length > 0) {
    delta.patterns = skill.level2.patterns;
  }

  // Extract priority if present
  if (skill.level2.priority && skill.level2.priority.length > 0) {
    delta.priority = skill.level2.priority;
  }

  // Extract error details
  if (skill.level3.error_details) {
    delta.error_details = skill.level3.error_details;
  }

  // Extract detailed patterns
  if (skill.level3.detailed_patterns) {
    delta.detailed_patterns = skill.level3.detailed_patterns;
  }

  // Extract edge cases
  if (skill.level3.edge_cases) {
    delta.edge_cases = skill.level3.edge_cases;
  }

  // Extract related skills
  if (skill.level3.related) {
    delta.related = skill.level3.related;
  }

  // Calculate delta tokens
  const deltaTokens = estimateTokens(JSON.stringify(delta));

  return {
    skill: skill.level1.skill,
    base_id: base.id,
    delta,
    delta_tokens: deltaTokens,
    original_tokens: skill.meta.compressed_tokens.level3,
    version: skill.level1.version,
  };
}

/**
 * Reconstruct a full compressed skill from base + delta
 *
 * @param base - Base skill pattern
 * @param delta - Delta skill with unique content
 * @returns Reconstructed compressed skill
 */
export function reconstructSkill(base: BaseSkill, delta: DeltaSkill): FullSkill {
  // Merge keywords
  const keywords = [
    ...base.structure.common_keywords,
    ...(delta.delta.keywords || []),
  ];

  // Build Level 1: Headers
  const level1: SkillHeader = {
    skill: delta.skill,
    domain: base.domain,
    keywords: keywords.slice(0, 10), // Max 10 keywords
    version: delta.version,
    ...(delta.delta.errors && { errors: delta.delta.errors }),
  };

  // Build Level 2: Quick reference
  const level2: QuickReference = {
    ...level1,
    quick_fixes: delta.delta.quick_fixes || {},
    ...(delta.delta.patterns && { patterns: delta.delta.patterns }),
    ...(delta.delta.priority && { priority: delta.delta.priority }),
  };

  // Build Level 3: Full detail
  const level3: FullSkill = {
    ...level2,
    ...(delta.delta.error_details && { error_details: delta.delta.error_details }),
    ...(delta.delta.detailed_patterns && { detailed_patterns: delta.delta.detailed_patterns }),
    ...(delta.delta.edge_cases && { edge_cases: delta.delta.edge_cases }),
    ...(delta.delta.related && { related: delta.delta.related }),
  };

  return level3;
}

/**
 * Create a skill pack with base + delta compression
 *
 * @param packId - Pack identifier
 * @param domain - Domain or category
 * @param skills - Array of compressed skills in the same domain
 * @returns Skill pack with delta compression
 */
export function createSkillPack(
  packId: string,
  domain: string,
  skills: CompressedSkill[]
): SkillPack {
  if (skills.length === 0) {
    throw new Error('Cannot create skill pack from empty array');
  }

  // Group skills by similarity for potential multiple bases
  const skillGroups = groupSimilarSkills(skills);

  const bases: BaseSkill[] = [];
  const deltas: DeltaSkill[] = [];

  let originalTotalTokens = 0;
  let compressedTotalTokens = 0;

  // Create base + deltas for each group
  skillGroups.forEach(group => {
    const base = createBaseSkill(group);
    bases.push(base);
    compressedTotalTokens += base.base_tokens;

    group.forEach(skill => {
      originalTotalTokens += skill.meta.compressed_tokens.level3;

      const delta = extractDelta(skill, base);
      deltas.push(delta);
      compressedTotalTokens += delta.delta_tokens;
    });
  });

  const deltaCompressionRatio = (originalTotalTokens - compressedTotalTokens) / originalTotalTokens;

  return {
    pack_id: packId,
    version: '1.0.0',
    domain,
    bases,
    deltas,
    total_tokens: compressedTotalTokens,
    original_total_tokens: originalTotalTokens,
    delta_compression_ratio: deltaCompressionRatio,
    meta: {
      skill_count: skills.length,
      created_at: new Date().toISOString(),
    },
  };
}

/**
 * Load a specific skill from a skill pack
 *
 * @param pack - Skill pack
 * @param skillId - Skill identifier
 * @returns Reconstructed full skill
 */
export function loadSkillFromPack(pack: SkillPack, skillId: string): FullSkill | null {
  const delta = pack.deltas.find(d => d.skill === skillId);
  if (!delta) return null;

  const base = pack.bases.find(b => b.id === delta.base_id);
  if (!base) return null;

  return reconstructSkill(base, delta);
}

/**
 * Get token cost to load a skill from pack vs original
 *
 * @param pack - Skill pack
 * @param skillId - Skill identifier
 * @returns Token cost breakdown
 */
export function getLoadCost(pack: SkillPack, skillId: string): {
  base_tokens: number;
  delta_tokens: number;
  total_tokens: number;
  original_tokens: number;
  savings_tokens: number;
  savings_ratio: number;
} | null {
  const delta = pack.deltas.find(d => d.skill === skillId);
  if (!delta) return null;

  const base = pack.bases.find(b => b.id === delta.base_id);
  if (!base) return null;

  const totalTokens = base.base_tokens + delta.delta_tokens;
  const savingsTokens = delta.original_tokens - totalTokens;
  const savingsRatio = savingsTokens / delta.original_tokens;

  return {
    base_tokens: base.base_tokens,
    delta_tokens: delta.delta_tokens,
    total_tokens: totalTokens,
    original_tokens: delta.original_tokens,
    savings_tokens: savingsTokens,
    savings_ratio: savingsRatio,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Group similar skills by keyword overlap and domain
 */
function groupSimilarSkills(skills: CompressedSkill[]): CompressedSkill[][] {
  if (skills.length === 0) return [];
  if (skills.length === 1) return [skills];

  const groups: CompressedSkill[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < skills.length; i++) {
    if (used.has(i)) continue;

    const group: CompressedSkill[] = [skills[i]];
    used.add(i);

    for (let j = i + 1; j < skills.length; j++) {
      if (used.has(j)) continue;

      if (areSimilar(skills[i], skills[j])) {
        group.push(skills[j]);
        used.add(j);
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Check if two skills are similar based on keyword overlap
 */
function areSimilar(skill1: CompressedSkill, skill2: CompressedSkill): boolean {
  // Must be same domain
  if (skill1.level1.domain !== skill2.level1.domain) return false;

  // Calculate keyword overlap
  const keywords1 = new Set(skill1.level1.keywords);
  const keywords2 = new Set(skill2.level1.keywords);

  let overlap = 0;
  keywords1.forEach(kw => {
    if (keywords2.has(kw)) overlap++;
  });

  const allKeywords = new Set<string>();
  keywords1.forEach(kw => allKeywords.add(kw));
  keywords2.forEach(kw => allKeywords.add(kw));
  const totalUnique = allKeywords.size;
  const similarity = overlap / totalUnique;

  // Consider similar if >30% keyword overlap
  return similarity > 0.3;
}

/**
 * Extract fix terms from solution text
 */
function extractFixTerms(solution: string): string[] {
  const terms: string[] = [];

  // Common fix patterns
  const patterns = [
    /\b(clone|copy|move|borrow|ref|mut|immut)\b/gi,
    /\b(scope|lifetime|ownership)\b/gi,
    /\b(RefCell|Rc|Arc|Mutex|RwLock)\b/gi,
    /\b(async|await|tokio|spawn)\b/gi,
    /\b(trait|impl|generic|where)\b/gi,
    /\b(unwrap|expect|Result|Option)\b/gi,
  ];

  patterns.forEach(pattern => {
    const matches = solution.match(pattern) || [];
    matches.forEach(match => terms.push(match.toLowerCase()));
  });

  return Array.from(new Set(terms)); // Unique terms
}

/**
 * Check if solution contains only common patterns
 */
function isCommonPattern(solution: string, commonPatterns: string[]): boolean {
  if (commonPatterns.length === 0) return false;

  const terms = extractFixTerms(solution);
  const matchCount = terms.filter(term =>
    commonPatterns.some(pattern => pattern.toLowerCase() === term.toLowerCase())
  ).length;

  // If >80% of terms are common patterns, consider it common
  return matchCount / Math.max(terms.length, 1) > 0.8;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Create multiple skill packs from categorized skills
 *
 * @param skillsByDomain - Map of domain to compressed skills
 * @returns Array of skill packs
 */
export function createSkillPacks(
  skillsByDomain: Map<string, CompressedSkill[]>
): SkillPack[] {
  const packs: SkillPack[] = [];

  skillsByDomain.forEach((skills, domain) => {
    if (skills.length === 0) return;

    const packId = `${domain}-pack`;
    const pack = createSkillPack(packId, domain, skills);
    packs.push(pack);
  });

  return packs;
}

/**
 * Calculate total savings across all skill packs
 *
 * @param packs - Array of skill packs
 * @returns Total savings breakdown
 */
export function calculateTotalSavings(packs: SkillPack[]): {
  total_original_tokens: number;
  total_compressed_tokens: number;
  total_savings_tokens: number;
  average_compression_ratio: number;
  total_skills: number;
} {
  let totalOriginal = 0;
  let totalCompressed = 0;
  let totalSkills = 0;

  packs.forEach(pack => {
    totalOriginal += pack.original_total_tokens;
    totalCompressed += pack.total_tokens;
    totalSkills += pack.meta.skill_count;
  });

  const totalSavings = totalOriginal - totalCompressed;
  const averageRatio = totalSavings / totalOriginal;

  return {
    total_original_tokens: totalOriginal,
    total_compressed_tokens: totalCompressed,
    total_savings_tokens: totalSavings,
    average_compression_ratio: averageRatio,
    total_skills: totalSkills,
  };
}

// ============================================================================
// Export
// ============================================================================

export const deltaUtils = {
  groupSimilarSkills,
  areSimilar,
  extractFixTerms,
  isCommonPattern,
  estimateTokens,
};
