# Home Directory Agent Validation Report
**Location:** `/Users/louisherman/.claude/agents/`
**Date:** 2026-01-31
**Total Agents:** 447

## Executive Summary

- **100% Loadable** (447/447 agents)
- **22% With Issues** (98/447 agents)
- **Critical:** 92 agents use invalid `WebSearch` tool
- **Critical:** 33 agents use invalid `WebFetch` tool
- **Model Distribution:** 41% Haiku, 35% Sonnet, 25% Opus
- **Permission Modes:** All agents missing explicit permission_mode (defaulting to restricted)

## Validation Results

### YAML Frontmatter Loadability
```
✓ Loadable:     447 (100%)
✗ Not Loadable:   0 (0%)
```

**All agents successfully parse YAML frontmatter** - no blocking loadability issues.

### Invalid Tool References

#### WebSearch (92 agents)
Invalid tool not available in Claude Agent SDK.

**Affected Categories:**
- `browser/` - 1 agent
- `content/` - 4 agents
- `data/` - 3 agents
- `design/` - 6 agents
- `dmb-*` - 4 standalone agents
- `ecommerce/` - 7 agents
- `engineering/` - 25 agents
- `events/` - 5 agents
- `fusion/` - 2 agents
- `google/` - 7 agents
- `growth/` - 3 agents
- `marketing/` - 8 agents
- `operations/` - 4 agents
- `product/` - 4 agents
- `ticketing/` - 7 agents

**Complete List:**
```
browser/tailwind-v4-specialist.md
content/Copywriter.md
content/blog-writer.md
content/content-strategist.md
content/social-media-manager.md
data/data-analyst.md
data/data-scientist.md
data/web-scraping-specialist.md
design/brand-designer.md
design/creative-director.md
design/design-lead.md
design/ux-designer.md
design/ux-researcher.md
design/web-designer.md
dmb-brand-dna-expert.md
dmb-expert.md
dmb-offline-first-architect.md
dmbalmanac-scraper.md
dmbalmanac-site-expert.md
ecommerce/amazon-seller-specialist.md
ecommerce/e-commerce-analyst.md
ecommerce/e-commerce-strategist.md
ecommerce/etsy-specialist.md
ecommerce/pricing-strategist.md
ecommerce/print-on-demand-specialist.md
ecommerce/shopify-specialist.md
ecommerce/social-commerce-specialist.md
engineering/ai-ml-engineer.md
engineering/api-architect.md
engineering/bundle-size-analyzer.md
engineering/chromium-browser-expert.md
engineering/cloud-platform-architect.md
engineering/core-ml-optimization-expert.md
engineering/cross-platform-pwa-specialist.md
engineering/data-streaming-specialist.md
engineering/database-migration-specialist.md
engineering/database-specialist.md
engineering/devops-engineer.md
engineering/expert-planner.md
engineering/google-apis-specialist.md
engineering/i18n-specialist.md
engineering/lighthouse-webvitals-expert.md
engineering/llm-application-architect.md
engineering/microservices-architect.md
engineering/mongodb-specialist.md
engineering/monorepo-tooling-specialist.md
engineering/npm-ecosystem-specialist.md
engineering/observability-architect.md
engineering/push-notification-specialist.md
engineering/real-time-systems-specialist.md
engineering/redis-cache-specialist.md
engineering/system-architect.md
events/creative-event-brainstormer.md
events/event-marketing-specialist.md
events/live-event-producer.md
events/technical-director.md
events/tour-manager.md
fusion/ai-product-fusion-agent.md
fusion/data-analytics-fusion-agent.md
google/gemini-integration-specialist.md
google/google-ai-studio-guide.md
google/google-labs-creative-guide.md
google/google-workflow-automation-specialist.md
google/google-workspace-productivity-specialist.md
google/imagen-creative-specialist.md
google/veo-video-generation-specialist.md
growth/analytics-specialist.md
growth/growth-hacker.md
growth/growth-lead.md
marketing/affiliate-marketing-specialist.md
marketing/email-marketer.md
marketing/email-marketing-automation-specialist.md
marketing/head-of-marketing.md
marketing/influencer-marketing-specialist.md
marketing/performance-marketer.md
marketing/seo-specialist.md
marketing/short-form-video-strategist.md
operations/finance-ops.md
operations/hr-people-ops.md
operations/legal-advisor.md
operations/operations-manager.md
product/experiment-analyzer.md
product/experiment-designer.md
product/product-analyst.md
product/product-manager.md
ticketing/axs-platform-specialist.md
ticketing/presale-specialist.md
ticketing/pricing-strategy-specialist.md
ticketing/secondary-market-specialist.md
ticketing/ticketing-operations-specialist.md
ticketing/ticketmaster-specialist.md
ticketing/vip-packages-specialist.md
```

#### WebFetch (33 agents)
Invalid tool not available in Claude Agent SDK.

**Affected Categories:**
- `content/` - 4 agents
- `data/` - 1 agent
- `dmb-*` - 7 standalone agents
- `dmb/` - 2 directory agents
- `ecommerce/` - 1 agent
- `events/` - 4 agents
- `google/` - 7 agents
- `marketing/` - 6 agents

**Complete List:**
```
content/Copywriter.md
content/blog-writer.md
content/content-strategist.md
content/social-media-manager.md
data/web-scraping-specialist.md
dmb-brand-dna-expert.md
dmb-expert.md
dmb-scraper-debugger.md
dmb-setlist-pattern-analyzer.md
dmb-show-analyzer.md
dmb-tour-optimizer.md
dmb/live-show-analyzer.md
dmb/tour-route-optimizer.md
dmbalmanac-scraper.md
dmbalmanac-site-expert.md
ecommerce/pricing-strategist.md
events/creative-event-brainstormer.md
events/event-marketing-specialist.md
events/live-event-producer.md
events/tour-manager.md
google/gemini-integration-specialist.md
google/google-ai-studio-guide.md
google/google-labs-creative-guide.md
google/google-workflow-automation-specialist.md
google/google-workspace-productivity-specialist.md
google/imagen-creative-specialist.md
google/veo-video-generation-specialist.md
marketing/email-marketer.md
marketing/email-marketing-automation-specialist.md
marketing/head-of-marketing.md
marketing/performance-marketer.md
marketing/seo-specialist.md
marketing/short-form-video-strategist.md
```

### Permission Modes

**Issue:** 447 agents do not specify `permission_mode` in frontmatter.

**Current State:**
- `not_set`: 447 agents (100%)
- Defaults to `restricted` mode at runtime

**Impact:**
- Agents default to restricted mode (safest)
- No blocking issues, but best practice is explicit declaration
- Consider adding `permission_mode: normal` for most agents

### Model Tier Distribution

```
Haiku:  181 agents (41%)
Sonnet: 155 agents (35%)
Opus:   111 agents (25%)
```

**Model IDs Used:**
- `haiku` - Shorthand format (181 agents)
- `sonnet` - Shorthand format (155 agents)
- `opus` - Shorthand format (111 agents)

**Note:** All agents use simplified model names, not full model IDs like `claude-sonnet-4-5-20250929`.

## Category Breakdown

### By Directory Structure
```
ai-ml/               4 agents
agent-warming/       2 agents
batching/            3 agents
browser/            13 agents
cascading/           3 agents
circuit-breaker/     3 agents
compiler/            3 agents
compression/         2 agents
content/             4 agents
data/                3 agents
data-engineering/    0 agents (empty)
debug/              13 agents
design/              8 agents
devops/              3 agents
dmb/                 2 agents
ecommerce/          10 agents
engineering/        43 agents
events/              5 agents
fusion/              5 agents
fusion-compiler/     3 agents
google/             12 agents
growth/              3 agents
infra/              10 agents
marketing/          13 agents
memory/              5 agents
model-selection/     3 agents
mcp/                12 agents
operations/          4 agents
orchestration/       9 agents
optimization/       13 agents
parallel/            9 agents
predictive/          6 agents
product/             7 agents
quality/             8 agents
refactoring/         5 agents
research/            3 agents
security/           13 agents
self-healing/        3 agents
state/              10 agents
template/            3 agents
testing/            14 agents
ticketing/           7 agents
tracing/             3 agents
zero-shot/           3 agents

Standalone (root):  83 agents
```

### High-Issue Categories

**Engineering (25 invalid WebSearch):**
- Largest category (43 agents)
- 58% have WebSearch issue
- All engineering agents affected by permission_mode not set

**Marketing (8 invalid WebSearch, 6 invalid WebFetch):**
- 13 total agents
- 62% have WebSearch
- 46% have WebFetch
- Overlap: all WebFetch agents also have WebSearch

**Google (7 invalid WebSearch, 7 invalid WebFetch):**
- 12 total agents
- 58% have WebSearch
- 58% have WebFetch
- 100% overlap: same 7 agents have both issues

## Remediation Recommendations

### Priority 1: Remove Invalid Tools

**WebSearch** - Replace with:
- MCP server integration for web search (requires setup)
- Bash + curl for specific URLs
- User-provided search results
- Document limitation in agent description

**WebFetch** - Replace with:
- Bash + curl for HTTP requests
- MCP server for web scraping
- User-provided content
- Document limitation in agent description

### Priority 2: Add Permission Modes

**Recommended Values:**
- `restricted` - Agents reading code only
- `normal` - Most agents (default choice)
- `unrestricted` - Agents needing Bash, Edit, Write

**Mass Fix Command:**
```bash
# Example: Add permission_mode: normal to all agents
find ~/.claude/agents -name "*.md" -type f -exec sed -i '' 's/^model:/permission_mode: normal\nmodel:/' {} \;
```

### Priority 3: Standardize Model IDs

**Current:** Shorthand (haiku, sonnet, opus)
**Best Practice:** Full model IDs

**Recommended Migration:**
```yaml
# Before
model: haiku

# After
model: claude-3-7-haiku-20250219
```

## Legacy Status

**Home Directory:** `/Users/louisherman/.claude/agents/`
**Workspace Directory:** `/Users/louisherman/ClaudeCodeProjects/.claude/agents/`

This is the **LEGACY installation** - 447 agents predating workspace setup.

**Migration Considerations:**
- Workspace has 5 agents (optimized, following best practices)
- Home directory has 447 agents (legacy, many issues)
- Consider consolidating useful agents to workspace
- Archive or remove deprecated home agents

## Files Generated

1. `/tmp/validate_home_agents.py` - Validation script
2. `/tmp/home_validation_results.json` - Raw validation data (447 agents)
3. `/Users/louisherman/ClaudeCodeProjects/docs/reports/20x-home-2026-01-31/home-loadability.md` - This report

## Next Steps

1. Review 92 WebSearch agents - determine if needed
2. Review 33 WebFetch agents - determine if needed
3. Add explicit permission_mode to all agents
4. Consider archiving unused legacy agents
5. Migrate useful agents to workspace directory
6. Update to full model IDs for better version tracking

## Validation Command

```bash
# Re-run validation
python3 /tmp/validate_home_agents.py > /tmp/home_validation_results.json
```
