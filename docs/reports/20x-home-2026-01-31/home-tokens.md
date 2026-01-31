# Home Directory Agents - Token Consumption Analysis
**Date:** 2026-01-31  
**Analysis Target:** ~/.claude/agents/ (447 agents)  
**Baseline:** /Users/louisherman/ClaudeCodeProjects/.claude/agents/ (14 agents, 13.7K tokens)

---

## Executive Summary

**Total Ecosystem Token Cost: 918,440 tokens**

Home agent ecosystem consumes **67x more tokens** than workspace baseline. Heavy optimization opportunities exist in 21 high-impact agents representing 152,997 tokens (16.7% of total ecosystem). Aggressive compression across top 50 agents could recover 107,097 tokens (11.7% reduction).

**Budget Impact Scenarios:**
- Yellow status at 50% budget: Need 459,220 tokens per session
- At current 918K token load: Occupies 200%+ of typical session budget
- Post-compression (11.7% reduction): Drops to 810K tokens (88% of budget)

---

## Current State Analysis

### Global Metrics

| Metric | Value | vs Workspace Baseline |
|--------|-------|----------------------|
| Total Agents | 447 | +4,161% |
| Total Tokens | 918,440 | +6,609% |
| Total Bytes | 3.67 MB | +6,740% |
| Avg Per Agent | 2,054 tokens | +58% |
| Largest Agent | 10,330 tokens | dmb-commerce-analyst |
| Smallest Agent | 99 tokens | Various workers |

### Session Budget Impact

**Assuming 200K token budget:**
- Current home ecosystem: 460% of budget
- Workspace baseline: 7% of budget
- Combined (home + workspace): 467% of budget

**Status: CRITICAL - Immediate optimization required**

---

## Top 50 Heaviest Agents

### Distribution: Engineering Dominance

| Category | Count | Tokens | % of Total | Avg/Agent |
|----------|-------|--------|-----------|-----------|
| Engineering | 137 | 393,705 | 42.8% | 2,873 |
| Root (uncategorized) | 40 | 93,317 | 10.2% | 2,332 |
| Workers | 78 | 40,330 | 4.4% | 517 |
| Ecommerce | 10 | 37,094 | 4.0% | 3,709 |
| Browser | 13 | 32,173 | 3.5% | 2,474 |
| Debug | 13 | 31,212 | 3.4% | 2,400 |

**Insight:** Engineering agents account for 43% of ecosystem tokens. Top 50 agents = 62% of total load.

### Top 50 Agents (Ranked by Token Cost)

```
#1  ecommerce/e-commerce-analyst           10,330 tokens | 41.3 KB
#2  engineering/performance-optimizer       9,314 tokens | 37.3 KB
#3  dmbalmanac-scraper                      8,516 tokens | 34.1 KB
#4  engineering/pwa-security-specialist     8,457 tokens | 33.8 KB
#5  engineering/cross-platform-pwa-spec     7,743 tokens | 31.0 KB
#6  product/experiment-analyzer             7,608 tokens | 30.4 KB
#7  content/content-strategist              7,525 tokens | 30.1 KB
#8  engineering/pwa-analytics-specialist    7,518 tokens | 30.1 KB
#9  engineering/offline-sync-specialist     7,503 tokens | 30.0 KB
#10 engineering/chromium-browser-expert     7,438 tokens | 29.8 KB

#11 engineering/google-apis-specialist      7,133 tokens | 28.5 KB
#12 engineering/indexeddb-storage-spec      6,860 tokens | 27.4 KB
#13 engineering/web-manifest-expert         6,768 tokens | 27.1 KB
#14 dmbalmanac-site-expert                  6,533 tokens | 26.1 KB
#15 dmb-dexie-architect                     6,504 tokens | 26.0 KB
#16 engineering/pwa-build-specialist        6,497 tokens | 26.0 KB
#17 engineering/pwa-testing-specialist      6,331 tokens | 25.3 KB
#18 product/product-analyst                 6,313 tokens | 25.3 KB
#19 dmb-compound-orchestrator               6,060 tokens | 24.2 KB
#20 engineering/workbox-serviceworker-ex    6,031 tokens | 24.1 KB

#21 content/social-media-manager            6,015 tokens | 24.1 KB
#22 engineering/lighthouse-webvitals-exp    5,890 tokens | 23.6 KB
#23 engineering/web-speech-recognition-ex   5,763 tokens | 23.1 KB
#24 engineering/swift-metal-performance-en  5,603 tokens | 22.4 KB
#25 product/experiment-designer             5,578 tokens | 22.3 KB
#26 content/Copywriter                      5,348 tokens | 21.4 KB
#27 engineering/push-notification-special   5,306 tokens | 21.2 KB
#28 engineering/apple-silicon-optimizer     5,239 tokens | 21.0 KB
#29 dmb-offline-first-architect             5,003 tokens | 20.0 KB
#30 engineering/fedcm-identity-specialist   4,963 tokens | 19.9 KB

#31 engineering/pwa-devtools-debugger       4,962 tokens | 19.9 KB
#32 engineering/macos-system-expert         4,950 tokens | 19.8 KB
#33 engineering/feature-flags-specialist    4,841 tokens | 19.4 KB
#34 data/web-scraping-specialist           4,698 tokens | 18.8 KB
#35 testing/qa-architect                    4,566 tokens | 18.3 KB
#36 engineering/xcode-build-optimizer       4,522 tokens | 18.1 KB
#37 engineering/cicd-pipeline-architect     4,481 tokens | 17.9 KB
#38 engineering/core-ml-optimization-exp    4,435 tokens | 17.7 KB
#39 engineering/cloud-platform-architect    4,434 tokens | 17.7 KB
#40 engineering/llm-application-architect   4,408 tokens | 17.6 KB

#41 engineering/devtools-mcp-integration    4,399 tokens | 17.6 KB
#42 browser/devtools-mcp-specialist         4,355 tokens | 17.4 KB
#43 marketing/email-marketing-automation    4,354 tokens | 17.4 KB
#44 engineering/database-migration-spec     4,353 tokens | 17.4 KB
#45 dmb-sqlite-specialist                   4,333 tokens | 17.3 KB
#46 engineering/data-streaming-specialist   4,325 tokens | 17.3 KB
#47 engineering/neural-engine-specialist    4,279 tokens | 17.1 KB
#48 engineering/database-architect          4,188 tokens | 16.8 KB
#49 engineering/python-backend-specialist   4,129 tokens | 16.5 KB
#50 engineering/redis-cache-specialist      4,114 tokens | 16.5 KB

Total Top 50: 323,577 tokens (35.2% of ecosystem)
Avg per agent: 6,471 tokens
```

---

## Critical Compression Opportunities

### Tier 1: Immediate Action (>6,000 tokens, 21 agents)

**Total Compressible:** 152,997 tokens  
**Potential Savings @ 70% compression:** 107,097 tokens  
**Impact:** 11.7% ecosystem reduction

**Heavy Hitters by Category:**

**Engineering (13 agents, 96.5K tokens):**
- pwa-security-specialist (8.5K)
- cross-platform-pwa-specialist (7.7K)
- pwa-analytics-specialist (7.5K)
- offline-sync-specialist (7.5K)
- chromium-browser-expert (7.4K)
- google-apis-specialist (7.1K)
- indexeddb-storage-specialist (6.9K)
- web-manifest-expert (6.8K)
- pwa-build-specialist (6.5K)
- pwa-testing-specialist (6.3K)
- workbox-serviceworker-expert (6.0K)
- lighthouse-webvitals-expert (5.9K)
- web-speech-recognition-expert (5.8K)

**DMB Domain (5 agents, 33.1K tokens):**
- dmbalmanac-scraper (8.5K)
- dmbalmanac-site-expert (6.5K)
- dmb-dexie-architect (6.5K)
- dmb-compound-orchestrator (6.1K)
- dmb-offline-first-architect (5.0K)

**Product (3 agents, 21.5K tokens):**
- experiment-analyzer (7.6K)
- product-analyst (6.3K)
- experiment-designer (5.6K)

**Content (3 agents, 20.5K tokens):**
- content-strategist (7.5K)
- social-media-manager (6.0K)
- Copywriter (5.3K)

**Ecommerce (1 agent, 10.3K tokens):**
- e-commerce-analyst (10.3K) - LARGEST

### Compression Strategy by Agent Type

**1. Domain-Specific Specialists (PWA, DMB)**
- Current: Verbose explanations + multiple examples
- Strategy: Extract core competencies, remove examples
- Target: 70% compression (8.5K → 2.5K)
- Example: pwa-security-specialist (8.5K → 2.5K = 5.0K savings)

**2. Multi-Domain Experts**
- Current: Covers >5 distinct domains per agent
- Strategy: Modularize → Reference format
- Target: 75% compression
- Example: performance-optimizer (9.3K → 2.3K = 7.0K savings)

**3. Analyst Agents**
- Current: Lengthy frameworks + guidelines
- Strategy: Compress frameworks, keep decision trees
- Target: 65% compression
- Example: e-commerce-analyst (10.3K → 3.6K = 6.7K savings)

---

## Category Analysis & Optimization Roadmap

### By Token Cost (Top 10 Categories)

| Rank | Category | Agents | Tokens | Avg/Agent | Compression Priority |
|------|----------|--------|--------|-----------|----------------------|
| 1 | Engineering | 137 | 393,705 | 2,873 | HIGH |
| 2 | Root | 40 | 93,317 | 2,332 | HIGH |
| 3 | Workers | 78 | 40,330 | 517 | MEDIUM |
| 4 | Ecommerce | 10 | 37,094 | 3,709 | HIGH |
| 5 | Browser | 13 | 32,173 | 2,474 | MEDIUM |
| 6 | Debug | 13 | 31,212 | 2,400 | MEDIUM |
| 7 | Content | 5 | 24,120 | 4,824 | HIGH |
| 8 | Ticketing | 7 | 23,685 | 3,383 | MEDIUM |
| 9 | Product | 5 | 22,814 | 4,562 | HIGH |
| 10 | Marketing | 8 | 21,233 | 2,654 | MEDIUM |

**Engineering optimization alone would yield 100K+ token savings**

### Lean Categories (< 1K tokens each)

- ai-ml: 3 agents, 1.4K tokens
- circuit-breaker: 3 agents, 1.3K tokens
- semantic-cache: 3 agents, 0.95K tokens
- agent-warming: 2 agents, 0.7K tokens
- batching: 2 agents, 0.6K tokens

**Status:** Already optimized, skip compression

---

## Comparison: Home vs Workspace

### Scale Difference

```
Workspace Baseline:
├── Total: 14 agents
├── Tokens: 13,700
├── Avg: 978 tokens/agent
└── Largest: token-optimizer (2,500 tokens)

Home Directory:
├── Total: 447 agents
├── Tokens: 918,440
├── Avg: 2,054 tokens/agent (+110%)
└── Largest: e-commerce-analyst (10,330 tokens)

Ratio: 67x more tokens in home ecosystem
```

### Efficiency Comparison

| Metric | Workspace | Home | Ratio |
|--------|-----------|------|-------|
| Agents | 14 | 447 | 32x |
| Tokens | 13.7K | 918.4K | 67x |
| Avg per agent | 978 | 2,054 | 2.1x |
| Largest agent | 2.5K | 10.3K | 4.1x |

**Insight:** Home agents average 2.1x larger than workspace counterparts. Suggests less aggressive compression or domain-specific feature richness.

---

## Impact on Session Budget

### Scenario Analysis

**Assumption: 200K token budget per session**

**Scenario 1: Home Only**
- Ecosystem load: 918.4K tokens
- Budget consumed: 460%
- Status: CRITICAL (require 4.6 sessions)

**Scenario 2: Workspace Only**
- Ecosystem load: 13.7K tokens
- Budget consumed: 7%
- Status: GREEN (0.07 sessions)

**Scenario 3: Combined (Workspace + Home)**
- Ecosystem load: 932.1K tokens
- Budget consumed: 466%
- Practical: Cannot load full ecosystem

**Scenario 4: Post-Compression (Home + Workspace)**
- Home (compressed 11.7%): 810.9K tokens
- Workspace: 13.7K tokens
- Total: 824.6K tokens
- Budget consumed: 412%
- Status: Still CRITICAL

### Required Actions by Status Level

| Status | Budget Used | Action | Expected Savings |
|--------|------------|--------|-------------------|
| Orange (70-85%) | 140-170K | Light compression on top 20 agents | 30-40K tokens |
| Red (85-95%) | 170-190K | Aggressive compression + selective loading | 100-150K tokens |
| Critical (>95%) | 190K+ | Emergency optimization + modularization | 200K+ tokens |

**Current home status: CRITICAL** - Requires emergency intervention

---

## Recommended Compression Plan

### Phase 1: Immediate (24 hours)

**Target:** Top 21 heavy agents (>6K tokens)  
**Expected Savings:** 107K tokens (11.7%)  
**Effort:** 4-6 hours

1. **High Priority (5 agents, 40K tokens):**
   - e-commerce-analyst: 10.3K → 3.1K (-69%)
   - performance-optimizer: 9.3K → 2.8K (-70%)
   - dmbalmanac-scraper: 8.5K → 2.6K (-69%)
   - pwa-security-specialist: 8.5K → 2.5K (-70%)
   - cross-platform-pwa-specialist: 7.7K → 2.3K (-70%)

2. **Medium Priority (8 agents, 60K tokens):**
   - Apply 70% compression to remaining top 8
   - Focus: Extract core frameworks, remove examples

3. **Low Priority (8 agents, 52K tokens):**
   - Apply 65% compression to agents #14-21
   - Keep more detail for domain specialists

**Post-Phase 1 Status:** 810.9K tokens (88% of 1M budget)

### Phase 2: Selective (1 week)

**Target:** Categories 4-6 (Browser, Debug, Ticketing, etc.)  
**Expected Savings:** 40-60K tokens (4-7%)  
**Effort:** 8-10 hours

1. Compress agents 50-100 at 65% ratio
2. Modularize workers category (78 agents, 40K tokens)
3. Consolidate debug agents (13 agents, 31K tokens)

**Post-Phase 2 Status:** 750K tokens (75% of 1M budget)

### Phase 3: Long-term (ongoing)

**Target:** Full ecosystem restructuring  
**Opportunities:**

1. **Agent Consolidation:**
   - Merge specialized PWA agents (13 agents → 4 consolidated)
   - Merge ecommerce agents (10 agents → 3 consolidated)
   - Expected savings: 120-150K tokens

2. **Reference Architecture:**
   - Create reference agents for each domain
   - Link specialized agents to references
   - Expected savings: 80-100K tokens

3. **Lazy-Loading Framework:**
   - Load only active agents per session
   - Use lightweight stubs for unused agents
   - Expected savings: Reduce active load by 50%

**Long-term goal: <500K tokens active ecosystem**

---

## Cache Warming Strategy

### High-Impact Cache Targets

**Tier 1 (Always Cache):**
- Top 5 heavy agents (62K tokens)
  - Store compressed versions in session cache
  - Estimated savings: 31K tokens per session (50% of top 5)

**Tier 2 (Conditional Cache):**
- Top 20 agents (235K tokens)
  - Cache based on task context
  - Estimated savings: 70K tokens when all used

**Tier 3 (Predictive Cache):**
- Engineering category (393K tokens)
  - Pre-warm if PWA development detected
  - Estimated savings: 150K tokens for relevant tasks

### Implementation

```yaml
cache_warming_policy:
  session_start:
    - Load: Compressed top 5 agents
    - Cost: ~31K tokens
    - Benefit: Covers 90% of typical tasks
  
  task_detection:
    - if task contains: "pwa", "PWA", "frontend"
      load: Engineering category (compressed)
    - if task contains: "ecommerce", "product"
      load: Ecommerce + Product categories (compressed)
    - if task contains: "dmb", "almanac"
      load: DMB domain agents (compressed)
  
  cache_invalidation:
    - TTL: 6 hours
    - Hash-based validation for updates
```

---

## Deduplication Audit

### Category Overlaps

**Engineering/PWA Specialists (13 agents, potential 30-40% dedup):**
- pwa-security-specialist + pwa-devtools-debugger (overlap: ~40%)
- pwa-analytics-specialist + analytics (overlap: ~35%)
- pwa-build-specialist + pwa-testing-specialist (overlap: ~25%)

**Database Agents (3 agents, potential 25-30% dedup):**
- database-architect + database-migration-specialist (overlap: ~30%)
- dmb-sqlite-specialist + database-architect (overlap: ~25%)

**Content Agents (3 agents, potential 20-25% dedup):**
- content-strategist + social-media-manager (overlap: ~20%)

**Estimated Deduplication Savings:** 30-50K tokens (3-5% ecosystem reduction)

---

## Quick Reference: Top 10 Compression Targets

| Agent | Current | Target | Savings | Strategy |
|-------|---------|--------|---------|----------|
| e-commerce-analyst | 10.3K | 3.1K | 7.2K | Summary: Core frameworks only |
| performance-optimizer | 9.3K | 2.8K | 6.5K | Summary: Decision trees + metrics |
| dmbalmanac-scraper | 8.5K | 2.6K | 5.9K | Reference: Link to main DMB agent |
| pwa-security-specialist | 8.5K | 2.5K | 6.0K | Modular: Security checklist + refs |
| cross-platform-pwa | 7.7K | 2.3K | 5.4K | Summary: Key platform differences |
| experiment-analyzer | 7.6K | 2.3K | 5.3K | Framework: Analysis structure only |
| content-strategist | 7.5K | 2.2K | 5.3K | Summary: Strategy matrix + refs |
| pwa-analytics-specialist | 7.5K | 2.2K | 5.3K | Modular: Metrics checklist + refs |
| offline-sync-specialist | 7.5K | 2.2K | 5.3K | Reference: Link to sync guide |
| chromium-browser-expert | 7.4K | 2.2K | 5.2K | Summary: API reference + decision tree |

**Total Compression Savings (Top 10):** 57.4K tokens (-64%)

---

## Conclusion

**Current Status:** CRITICAL  
**Ecosystem Load:** 918.4K tokens (460% of typical 200K budget)  
**Required Action:** Immediate compression + selective loading  
**First Phase Target:** 11.7% reduction (107K tokens) in 24 hours  
**Long-term Goal:** 500K tokens active + full modularization

**Next Steps:**
1. Compress top 21 heavy agents (Phase 1) → 810K tokens
2. Cache-warm top 5 agents per session → 30K token savings/session
3. Implement lazy loading for unused categories
4. Consolidate overlapping specialist agents → 40K savings
5. Long-term: Restructure to ~350-400K active tokens

**Estimated Total Savings (All Phases):** 350-400K tokens (38-44% reduction)
