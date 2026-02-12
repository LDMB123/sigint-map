# Compressed Files Index

**Last Updated**: 2026-02-02
**Total Savings**: ~86K tokens (~43% of 200K budget)
**Files Compressed**: 13 files
**Status**: Ready for cache warming

## Quick Reference

### Lib Infrastructure (5 files)

#### 1. Speculation Executor & Intent Predictor
**Original**: `.claude/lib/speculation/README.md` (26 KB)
**Compressed**: `.claude/lib/speculation/README-COMPRESSED.md` (4.9 KB)
- Reduction: 81% | Tokens: 6.6K → 1.2K
- Content: Speculation Executor + Intent Predictor (8 workflow patterns, 8-10x speedup target)

#### 2. Hot Cache (LRU Routing Cache)
**Original**: `.claude/lib/routing/HOT_CACHE.md` (25 KB)
**Compressed**: `.claude/lib/routing/HOT_CACHE-COMPRESSED.md` (4.3 KB)
- Reduction: 83% | Tokens: 6.3K → 1.0K
- Content: LRU cache, O(1) ops, >70% hit rate target, semantic hashing

#### 3. Security Architecture (Defense-in-Depth)
**Original**: `.claude/lib/routing/SECURITY_ARCHITECTURE.md` (20 KB)
**Compressed**: `.claude/lib/routing/SECURITY_ARCHITECTURE-COMPRESSED.md` (4.5 KB)
- Reduction: 78% | Tokens: 5.0K → 1.1K
- Content: 6-layer security model, threat model, compliance (OWASP/CWE/SOC2/GDPR)

#### 4. Escalation Engine (Tier Escalation System)
**Original**: `.claude/lib/tiers/ESCALATION_ENGINE.md` (17 KB)
**Compressed**: `.claude/lib/tiers/ESCALATION_ENGINE-COMPRESSED.md` (6.6 KB)
- Reduction: 62% | Tokens: 4.1K → 1.6K
- Content: Quality detection, complexity mismatch, escalation monitoring

#### 5. Intent Predictor Summary
**Original**: `.claude/lib/speculation/INTENT_PREDICTOR_SUMMARY.md` (16 KB)
**Compressed**: `.claude/lib/speculation/INTENT_PREDICTOR_SUMMARY-COMPRESSED.md` (6.3 KB)
- Reduction: 61% | Tokens: 4.0K → 1.6K
- Content: 8 workflow patterns, prediction strategies, 70%+ accuracy validation

### Docs & Architecture (4 files)

#### 6. API Reference
**Original**: `.claude/docs/API_REFERENCE.md` (45 KB)
**Compressed**: `.claude/docs/API_REFERENCE-COMPRESSED.md` (9.6 KB)
- Reduction: 79% | Tokens: 11.8K → 1.3K
- Content: Cache management, semantic routing, tier selection, skill optimization, parallel processing, speculative execution

#### 7. Skill Cross-References
**Original**: `.claude/docs/reference/SKILL_CROSS_REFERENCES.md` (64 KB)
**Compressed**: `.claude/docs/reference/SKILL_CROSS_REFERENCES-COMPRESSED.md` (12.4 KB)
- Reduction: 81% | Tokens: 16K → 6K
- Content: 226-skill ecosystem map, 89+ cross-links, dependency chains, value multipliers

#### 8. Coordination Guide
**Original**: `.claude/docs/architecture/COORDINATION.md` (25 KB)
**Compressed**: `.claude/docs/architecture/COORDINATION-COMPRESSED.md` (5.4 KB)
- Reduction: 78% | Tokens: 6.1K → 1.4K
- Content: 6 capability lanes, Context Pack contract, orchestrator hierarchies, delegation rules

#### 9. Agent Architecture (ML Bustout Predictor)
**Original**: `.claude/docs/architecture/AGENT_ARCHITECTURE.md` (20 KB)
**Compressed**: `.claude/docs/architecture/AGENT_ARCHITECTURE-COMPRESSED.md` (3.3 KB)
- Reduction: 83% | Tokens: 5.0K → 0.8K
- Content: 3-model ensemble (XGBoost+NN+Bayesian), feature engineering, training pipeline, test performance

### Guides & Audits (3 files)

#### 10. Agent Template Guide
**Original**: `.claude/docs/guides/AGENT_TEMPLATE.md` (24 KB)
**Compressed**: `.claude/docs/guides/AGENT_TEMPLATE-COMPRESSED.md` (4.4 KB)
- Reduction: 82% | Tokens: 6.1K → 1.1K
- Content: YAML frontmatter template, required sections, tier selection, anti-patterns, certification

#### 11. Systematic Debugging Audit
**Original**: `.claude/docs/SYSTEMATIC_DEBUGGING_AUDIT.md` (19 KB)
**Compressed**: `.claude/docs/SYSTEMATIC_DEBUGGING_AUDIT-COMPRESSED.md` (3.4 KB)
- Reduction: 82% | Tokens: 4.7K → 0.5K
- Content: Ecosystem grade A (96/100), 1 critical routing bug fixed, inventory of 20 agents + 53 skills

#### 12. Audit Reports Index
**Original**: 13 audit files totaling 252 KB (compressed to tar.gz)
**Compressed**: `.claude/docs/reports/COMPRESSED_AUDITS_INDEX.md` (5.8 KB)
- Reduction: 97% | Tokens: ~63K → 1.5K
- Content: Skills audit, Chrome 143+ CSS, DMB scraper, general audits summary

### Skills Index (1 file)

#### 13. Skills Index (Largest File)
**Original**: `.claude/audit/skills-audit/skills-index.md` (104 KB)
**Compressed**: `.claude/audit/skills-audit/skills-index-COMPRESSED.md` (19 KB)
- Reduction: 82% | Tokens: 26K → 4.8K
- Content: 570 skills across 10 categories, tier distribution, imported agents list

## Compression Summary

| # | File | Original | Compressed | Reduction | Tokens Saved |
|---|------|----------|-----------|-----------|-------------|
| 1 | Speculation README | 26 KB | 4.9 KB | 81% | 5.4K |
| 2 | Hot Cache | 25 KB | 4.3 KB | 83% | 5.3K |
| 3 | Security Architecture | 20 KB | 4.5 KB | 78% | 3.9K |
| 4 | Escalation Engine | 17 KB | 6.6 KB | 62% | 2.5K |
| 5 | Intent Predictor | 16 KB | 6.3 KB | 61% | 2.4K |
| 6 | API Reference | 45 KB | 9.6 KB | 79% | 10.5K |
| 7 | Skill Cross-Refs | 64 KB | 12.4 KB | 81% | 10.0K |
| 8 | Coordination | 25 KB | 5.4 KB | 78% | 4.7K |
| 9 | Agent Architecture | 20 KB | 3.3 KB | 83% | 4.2K |
| 10 | Agent Template | 24 KB | 4.4 KB | 82% | 5.0K |
| 11 | Debugging Audit | 19 KB | 3.4 KB | 82% | 4.2K |
| 12 | Audit Reports (13) | 252 KB | 5.8 KB | 97% | 61.5K |
| 13 | Skills Index | 104 KB | 19 KB | 82% | 21.2K |
| | **TOTAL** | **657 KB** | **90 KB** | **86%** | **~141K** |

## Usage Guide

**Session start**: Load compressed files (90 KB total vs 657 KB originals)
**Deep dive**: Read original file (path in compressed header)
**API reference**: Compressed versions keep all signatures and config values

## Cache Warming Order

```
Priority 1 (core): README-COMPRESSED + HOT_CACHE-COMPRESSED (~2.2K tokens)
Priority 2 (architecture): COORDINATION-COMPRESSED + API_REFERENCE-COMPRESSED (~2.7K tokens)
Priority 3 (reference): skills-index-COMPRESSED + SKILL_CROSS_REFERENCES-COMPRESSED (~10.8K tokens)
Total: ~15.7K tokens for full system context (vs ~141K uncompressed)
```

## Next Candidates

- Large skill SKILL.md files (`.claude/skills/*/SKILL.md`)
- MCP optimization docs
- Archived experiment notes

---

**Maintained By**: Token Optimizer Agent
**Compression Framework**: Context Compressor Skill
**Review Frequency**: Monthly
**Last Compression**: 2026-02-02
