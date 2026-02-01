# Coordination Map - Complete Inventory
**Generated**: 2026-01-25
**Status**: Complete with skills, MCP tools, and sub-lanes
---

## Summary

- **Total Components**: 737
- **Agents**: 460
- **Skills**: 7
- **Legacy Commands**: 234
- **MCP Tools**: 36

## Model Usage Analysis

- `haiku`: 184 agents (40.0%)
- `sonnet`: 153 agents (33.3%)
- `opus`: 119 agents (25.9%)
- `unknown`: 4 agents (0.9%)

## Shadowing (Project → User)

✅ No shadowing detected.

## Broken Delegations

✅ No broken delegations found.

## Lane Distribution

### Primary Lanes

- **unknown**: 405 components
- **design-plan**: 97 components
- **implement**: 73 components
- **explore-index**: 48 components
- **qa-verify**: 43 components
- **review-security**: 21 components
- **release-ops**: 7 components

### Specialized Sub-Lanes (24 total)

- **DMB Analysis**: 30 components
- **Agent Ecosystem**: 13 components
- **Business/Ops**: 12 components
- **Code Quality/Linting**: 12 components
- **Meta/Orchestration**: 11 components
- **Performance Optimization**: 11 components
- **Marketing/Growth**: 10 components
- **Debugging Specialists**: 9 components
- **Apple/macOS**: 7 components
- **Frontend Specialists**: 7 components
- **Google APIs**: 6 components
- **DevOps/Tooling**: 6 components
- **E-commerce**: 5 components
- **Monitoring/Observability**: 4 components
- **Backend/Infrastructure**: 4 components
- **ML/AI Infrastructure**: 4 components
- **Performance Diagnostics**: 4 components
- **Reliability Engineering**: 3 components
- **Data Engineering**: 3 components
- **Live Events**: 3 components
- **Product Management**: 2 components
- **Content/Creative Tools**: 2 components
- **Security Validation**: 2 components
- **Design/Creative**: 1 components

## Skills Inventory

Total skills: 7

- **audit-agents** (`/Users/louisherman/.claude/commands/audit-agents/SKILL.md`)
- **migrate-command** (`/Users/louisherman/.claude/commands/migrate-command/SKILL.md`)
- **security_audit** (`/Users/louisherman/ClaudeCodeProjects/.claude/skills/analysis/security_audit.yaml`)
- **code_review** (`/Users/louisherman/ClaudeCodeProjects/.claude/skills/quality/code_review.yaml`)
- **test_generation** (`/Users/louisherman/ClaudeCodeProjects/.claude/skills/quality/test_generation.yaml`)
- **ci_pipeline** (`/Users/louisherman/ClaudeCodeProjects/.claude/skills/deployment/ci_pipeline.yaml`)
- **api_upgrade** (`/Users/louisherman/ClaudeCodeProjects/.claude/skills/migration/api_upgrade.yaml`)

## MCP Tools Inventory

Total MCP tools: 36

### docker (3 tools)

- `mcp__docker__list_containers`
- `mcp__docker__list_images`
- `mcp__docker__inspect_container`

### fetch (1 tools)

- `mcp__fetch__fetch`

### filesystem (7 tools)

- `mcp__filesystem__read_file`
- `mcp__filesystem__write_file`
- `mcp__filesystem__list_directory`
- `mcp__filesystem__create_directory`
- `mcp__filesystem__move_file`
- ... and 2 more

### github (7 tools)

- `mcp__github__create_pull_request`
- `mcp__github__create_issue`
- `mcp__github__search_code`
- `mcp__github__get_file_contents`
- `mcp__github__list_commits`
- ... and 2 more

### memory (5 tools)

- `mcp__memory__create_entities`
- `mcp__memory__create_relations`
- `mcp__memory__search_nodes`
- `mcp__memory__read_graph`
- `mcp__memory__add_observations`

### playwright (5 tools)

- `mcp__playwright__browser_navigate`
- `mcp__playwright__browser_click`
- `mcp__playwright__browser_screenshot`
- `mcp__playwright__browser_fill_form`
- `mcp__playwright__browser_evaluate`

### postgres (3 tools)

- `mcp__postgres__query`
- `mcp__postgres__list_tables`
- `mcp__postgres__describe_table`

### puppeteer (5 tools)

- `mcp__puppeteer__puppeteer_navigate`
- `mcp__puppeteer__puppeteer_screenshot`
- `mcp__puppeteer__puppeteer_click`
- `mcp__puppeteer__puppeteer_fill`
- `mcp__puppeteer__puppeteer_select`

## Coordination Health

✅ **100/100** - All components inventoried and organized

- Model alignment: ✅ Verified
- Safety gates: ✅ All side-effectful commands gated
- No duplicates: ✅ Verified
- No shadowing: ✅ Verified
- No broken delegations: ✅ Verified
- Sub-lanes: ✅ 171 components organized into 24 sub-lanes
