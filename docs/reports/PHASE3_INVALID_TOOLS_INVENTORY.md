# Invalid Tools Inventory - WebSearch/WebFetch

**Date:** 2026-01-31  
**Issue:** 125 agents reference invalid tools not in official Claude SDK  
**Priority:** MEDIUM  

---

## Summary

- Agents with WebSearch only: 65
- Agents with WebFetch only: 6
- Agents with both: 27
- **Total affected:** 98

---

## Valid Tools (Official SDK)

- Read
- Write
- Edit
- Bash
- Grep
- Glob
- Task

---

## Remediation Options

### Option 1: Remove Invalid Tools (Simple)

For agents that don't actually need web capabilities:
- Remove `WebSearch` and/or `WebFetch` from tools list
- Test agent functionality

### Option 2: Replace with Bash Commands (Functional)

For agents that need web capabilities:
```yaml
# Instead of WebSearch/WebFetch:
tools:
  - Bash  # Use curl/wget for web fetching
  - Read
  - Write
```

Then update agent instructions to use:
- `curl -s <url>` for fetching web content
- `curl -s 'https://api.search.com/...'` for search (if API available)

### Option 3: Create Custom MCP Server (Advanced)

Create a custom MCP server for web search capabilities:
- Implement WebSearch MCP server using external API (DuckDuckGo, SerpAPI, etc.)
- Register MCP server in Claude Code config
- Update agents to use MCP server instead

---

## Agents with WebSearch Only (65 agents)

- `browser/tailwind-v4-specialist.md`
- `data/data-analyst.md`
- `data/data-scientist.md`
- `design/brand-designer.md`
- `design/creative-director.md`
- `design/design-lead.md`
- `design/ux-designer.md`
- `design/ux-researcher.md`
- `design/web-designer.md`
- `dmb-offline-first-architect.md`
- `ecommerce/amazon-seller-specialist.md`
- `ecommerce/e-commerce-analyst.md`
- `ecommerce/e-commerce-strategist.md`
- `ecommerce/etsy-specialist.md`
- `ecommerce/print-on-demand-specialist.md`
- `ecommerce/shopify-specialist.md`
- `ecommerce/social-commerce-specialist.md`
- `engineering/ai-ml-engineer.md`
- `engineering/api-architect.md`
- `engineering/bundle-size-analyzer.md`
- `engineering/chromium-browser-expert.md`
- `engineering/cloud-platform-architect.md`
- `engineering/core-ml-optimization-expert.md`
- `engineering/cross-platform-pwa-specialist.md`
- `engineering/data-streaming-specialist.md`
- `engineering/database-migration-specialist.md`
- `engineering/database-specialist.md`
- `engineering/devops-engineer.md`
- `engineering/expert-planner.md`
- `engineering/google-apis-specialist.md`
- `engineering/i18n-specialist.md`
- `engineering/lighthouse-webvitals-expert.md`
- `engineering/llm-application-architect.md`
- `engineering/microservices-architect.md`
- `engineering/mongodb-specialist.md`
- `engineering/monorepo-tooling-specialist.md`
- `engineering/npm-ecosystem-specialist.md`
- `engineering/observability-architect.md`
- `engineering/push-notification-specialist.md`
- `engineering/real-time-systems-specialist.md`
- `engineering/redis-cache-specialist.md`
- `engineering/system-architect.md`
- `events/technical-director.md`
- `fusion/ai-product-fusion-agent.md`
- `fusion/data-analytics-fusion-agent.md`
- `growth/analytics-specialist.md`
- `growth/growth-hacker.md`
- `growth/growth-lead.md`
- `marketing/affiliate-marketing-specialist.md`
- `marketing/influencer-marketing-specialist.md`
- `operations/finance-ops.md`
- `operations/hr-people-ops.md`
- `operations/legal-advisor.md`
- `operations/operations-manager.md`
- `product/experiment-analyzer.md`
- `product/experiment-designer.md`
- `product/product-analyst.md`
- `product/product-manager.md`
- `ticketing/axs-platform-specialist.md`
- `ticketing/presale-specialist.md`
- `ticketing/pricing-strategy-specialist.md`
- `ticketing/secondary-market-specialist.md`
- `ticketing/ticketing-operations-specialist.md`
- `ticketing/ticketmaster-specialist.md`
- `ticketing/vip-packages-specialist.md`

---

## Agents with WebFetch Only (6 agents)

- `dmb-scraper-debugger.md`
- `dmb-setlist-pattern-analyzer.md`
- `dmb-show-analyzer.md`
- `dmb-tour-optimizer.md`
- `dmb/live-show-analyzer.md`
- `dmb/tour-route-optimizer.md`

---

## Agents with Both WebSearch and WebFetch (27 agents)

- `content/Copywriter.md`
- `content/blog-writer.md`
- `content/content-strategist.md`
- `content/social-media-manager.md`
- `data/web-scraping-specialist.md`
- `dmb-brand-dna-expert.md`
- `dmb-expert.md`
- `dmbalmanac-scraper.md`
- `dmbalmanac-site-expert.md`
- `ecommerce/pricing-strategist.md`
- `events/creative-event-brainstormer.md`
- `events/event-marketing-specialist.md`
- `events/live-event-producer.md`
- `events/tour-manager.md`
- `google/gemini-integration-specialist.md`
- `google/google-ai-studio-guide.md`
- `google/google-labs-creative-guide.md`
- `google/google-workflow-automation-specialist.md`
- `google/google-workspace-productivity-specialist.md`
- `google/imagen-creative-specialist.md`
- `google/veo-video-generation-specialist.md`
- `marketing/email-marketer.md`
- `marketing/email-marketing-automation-specialist.md`
- `marketing/head-of-marketing.md`
- `marketing/performance-marketer.md`
- `marketing/seo-specialist.md`
- `marketing/short-form-video-strategist.md`

---

## Next Steps

1. Review each affected agent to determine if web capabilities are needed
2. Choose remediation option based on requirements
3. Test agents after fixes
4. Update agent templates to prevent future invalid tool references
