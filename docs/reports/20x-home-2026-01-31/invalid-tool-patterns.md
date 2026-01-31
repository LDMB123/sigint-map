# Invalid Tool Usage Patterns Analysis
**Home Directory:** `/Users/louisherman/.claude/agents/`
**Date:** 2026-01-31

## Overview

Analysis of how 98 agents incorrectly use `WebSearch` and `WebFetch` tools that don't exist in Claude Agent SDK.

## WebSearch Usage Patterns (92 agents)

### Pattern 1: SEO and Marketing Research
**Example:** `/Users/louisherman/.claude/agents/marketing/seo-specialist.md`

```yaml
tools:
- Read
- Write
- Edit
- Grep
- Glob
- WebSearch  # INVALID
- WebFetch   # INVALID
```

**Intent:** Agent needs to research keywords, competitors, search trends.

**Replacement Strategy:**
```yaml
# Remove WebSearch and WebFetch
tools:
- Read
- Write
- Edit
- Grep
- Glob
- Bash  # Can use curl for specific URLs

# Add to description:
description: |
  SEO specialist. NOTE: Does not have web search capabilities. 
  User must provide search results, competitor analysis, or keyword data.
```

**Usage in Body:**
- Lines 43-51 describe auditing and research workflows
- No actual tool invocation shown (conceptual only)
- Agent expects these capabilities but never demonstrates usage

### Pattern 2: Web Scraping Specialists
**Example:** `/Users/louisherman/.claude/agents/dmbalmanac-scraper.md`

```yaml
tools:
- Read
- Write
- Edit
- Bash
- Grep
- Glob
- WebFetch  # INVALID
- WebSearch # INVALID
```

**Intent:** Fetch HTML from dmbalmanac.com for parsing.

**Replacement Strategy:**
```yaml
# Use Bash + curl instead
tools:
- Read
- Write
- Edit
- Bash  # curl, wget available
- Grep
- Glob

# Add implementation notes:
# Use: curl https://dmbalmanac.com/page.aspx
# Or: fetch API in Node.js scripts via Bash
```

**Actual Implementation:**
- Lines 703-793 show `fetchWithRetry` using standard `fetch()` API
- Lines 796-833 show caching with file system
- WebFetch tool never actually invoked in examples
- All examples use `fetch()` or Playwright via Bash

**Conclusion:** WebFetch tool reference is vestigial - agent already has working patterns using Bash.

### Pattern 3: Engineering/Architecture Research
**Example:** `/Users/louisherman/.claude/agents/engineering/lighthouse-webvitals-expert.md`

```yaml
tools:
- Read
- Bash
- Grep
- Glob
- WebSearch  # INVALID
```

**Intent:** Research web performance best practices, Lighthouse updates.

**Replacement Strategy:**
```yaml
# Remove WebSearch
tools:
- Read
- Bash
- Grep
- Glob

# Update description:
description: |
  Performance MEASUREMENT specialist for Lighthouse audits.
  NOTE: Cannot search web for latest best practices. 
  User must provide documentation or use agent's training data.
```

**Usage in Body:**
- No actual web search invocations shown
- Lines 60-163 use hardcoded `web-vitals` library examples
- Lines 262-423 use hardcoded Lighthouse CI config
- Agent relies on training data, not live web search

### Pattern 4: Content Creation (Blog, Social, Copy)
**Affected Agents:**
- `content/Copywriter.md`
- `content/blog-writer.md`
- `content/content-strategist.md`
- `content/social-media-manager.md`

**Pattern:**
```yaml
tools:
- Read
- Write
- Edit
- WebSearch  # For research
- WebFetch    # For competitor analysis
```

**Intent:** Research topics, analyze competitor content, find trending keywords.

**Reality:** All content examples in agent bodies are generated from training data, not fetched content.

**Replacement:**
```yaml
# Remove both tools
tools:
- Read
- Write
- Edit
- Bash  # For specific URL fetching only

# Add to description:
description: |
  Content creator. Cannot search web independently.
  User must provide: research, competitor examples, data sources.
```

## WebFetch Usage Patterns (33 agents)

### Pattern 1: API Documentation Specialists
**Affected:** Google integration agents (7 agents)
- `google/gemini-integration-specialist.md`
- `google/google-ai-studio-guide.md`
- etc.

**Intent:** Fetch latest API documentation from Google.

**Reality:** All documentation examples are from training data cutoff.

**Replacement:** User provides documentation URLs, agent uses `Bash` + `curl`.

### Pattern 2: Data Scraping
**Affected:** DMB-specific agents (9 agents)
- `dmb-scraper-debugger.md`
- `dmb-setlist-pattern-analyzer.md`
- etc.

**Intent:** Fetch setlist pages from dmbalmanac.com.

**Reality:** Agents show `fetch()` API usage, not tool invocation.

**Replacement:** Already implemented - use Bash to run Node.js scripts with `fetch()`.

### Pattern 3: Pricing and Market Research
**Affected:** E-commerce agents
- `ecommerce/pricing-strategist.md`

**Intent:** Fetch competitor pricing data.

**Reality:** Agents expect user-provided data.

**Replacement:** Document requirement in description; remove invalid tool.

## Tool Misunderstanding Analysis

### Why These Tools Were Added

**Hypothesis 1: Wishful Thinking**
- Developer wanted agents to have web capabilities
- Added tools assuming they'd be implemented
- Never validated against actual SDK

**Hypothesis 2: Copy-Paste Template**
- Initial agent had WebSearch/WebFetch
- Template propagated to 98 agents
- No validation during replication

**Hypothesis 3: Legacy from Different System**
- Tools existed in previous agent framework
- Migration to Claude Agent SDK incomplete
- Tool references not updated

### Evidence from Agent Bodies

**Key Finding:** Of 98 agents with invalid tools, **ZERO show actual tool invocation examples**.

**Pattern:**
```typescript
// Agent bodies show:
const response = await fetch(url);  // Standard fetch()
const html = await fetchWithRetry(url);  // Custom helper

// They NEVER show:
const response = await WebFetch(url);  // No such invocation exists
```

**Conclusion:** Tools were added to frontmatter speculatively, never actually used.

## Remediation Strategy

### Automated Fix (Safe)

**Step 1:** Remove invalid tools from frontmatter
```bash
# Remove WebSearch
find ~/.claude/agents -name "*.md" -type f \
  -exec sed -i '' '/^- WebSearch$/d' {} \;

# Remove WebFetch
find ~/.claude/agents -name "*.md" -type f \
  -exec sed -i '' '/^- WebFetch$/d' {} \;
```

**Step 2:** Add Bash tool if needed for curl
```bash
# For agents that need URL fetching
# Manually add Bash to tools: list
```

**Step 3:** Update descriptions
```bash
# Add note about limitations
# Template:
# "NOTE: Cannot independently search web or fetch URLs. 
#  User must provide source material."
```

### Manual Review Required

**Agents Needing Bash + Curl Pattern:**
- All web scraping specialists (9 dmb-* agents)
- Data extraction agents (3 data/ agents)
- API documentation agents (7 google/ agents)

**Agents That Need User-Provided Data:**
- SEO/marketing research (16 agents)
- Content creation (4 agents)
- Competitive analysis (8 agents)

**Total:** 47 agents need description updates beyond just removing tools.

## Impact Assessment

### Critical Impact (9 agents)
**Scraping specialists that expect to fetch URLs:**
- dmbalmanac-scraper.md
- dmb-scraper-debugger.md
- data/web-scraping-specialist.md
- etc.

**Action:** Add Bash tool, document curl pattern, update examples.

### Medium Impact (38 agents)
**Research/analysis agents that expect web access:**
- All marketing agents (13)
- All ecommerce agents (10)
- Engineering specialists (15)

**Action:** Update descriptions to clarify no web access, user must provide data.

### Low Impact (51 agents)
**Agents with WebSearch but no realistic use case:**
- Product managers
- Operations roles
- Finance/HR specialists

**Action:** Simply remove tool from frontmatter.

## Validation Checklist

After remediation, verify:

```bash
# 1. No invalid tools remain
grep -r "WebSearch" ~/.claude/agents/**/*.md
grep -r "WebFetch" ~/.claude/agents/**/*.md
# Expected: 0 matches

# 2. Bash added where needed
grep -r "Bash" ~/.claude/agents/dmb*.md
# Expected: All scraping agents have Bash

# 3. Descriptions updated
grep -r "NOTE:" ~/.claude/agents/**/*.md | grep -i "web"
# Expected: Research agents document web limitation

# 4. Re-run validation
python3 /tmp/validate_home_agents.py > /tmp/validation_post_fix.json
# Expected: with_issues: 0
```

## Files Referenced

1. `/Users/louisherman/.claude/agents/marketing/seo-specialist.md` - WebSearch + WebFetch
2. `/Users/louisherman/.claude/agents/dmbalmanac-scraper.md` - WebFetch + Bash patterns
3. `/Users/louisherman/.claude/agents/engineering/lighthouse-webvitals-expert.md` - WebSearch only
4. All 98 affected agents listed in main report

## Conclusion

**Root Cause:** Template propagation without validation.

**Impact:** Agents fail silently (tools don't exist) or user expects capabilities that don't work.

**Fix Complexity:** 
- Automated: Remove invalid tools (5 minutes)
- Manual: Update 47 descriptions (2-3 hours)
- Testing: Validate no regressions (30 minutes)

**Total Effort:** ~4 hours for complete remediation.
