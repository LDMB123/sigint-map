# Home Directory Agent Validation - 2026-01-31

Comprehensive validation of 447 agents in `/Users/louisherman/.claude/agents/` (legacy installation).

## Quick Stats

- **Total Agents:** 447
- **100% Loadable** (0 YAML parse errors)
- **22% Have Issues** (98 agents)
- **92 agents use invalid WebSearch tool**
- **33 agents use invalid WebFetch tool**
- **447 agents missing explicit permission_mode**

## Files in This Report

### 1. home-loadability.md
**Comprehensive validation report**
- YAML frontmatter loadability (100% pass)
- Invalid tool references (WebSearch: 92, WebFetch: 33)
- Permission mode analysis (all missing)
- Model tier distribution (Haiku 41%, Sonnet 35%, Opus 25%)
- Category breakdown by directory
- Remediation recommendations
- Legacy status and migration considerations

**Key Sections:**
- Executive Summary
- Validation Results (loadability, tools, permissions, models)
- Category Breakdown (by directory structure)
- Remediation Recommendations (3 priorities)
- Legacy Status (home vs workspace comparison)

### 2. agents-with-issues.csv
**Structured data for 98 agents with issues**

**Columns:**
- agent_path
- tier (haiku/sonnet/opus)
- model
- has_websearch (YES/NO)
- has_webfetch (YES/NO)
- permission_mode
- total_issues

**Use Cases:**
- Filter agents by issue type
- Sort by model tier
- Identify overlap (agents with both issues)
- Track remediation progress

### 3. quick-stats.txt
**One-page summary**
- Total counts
- Critical issues
- Model distribution
- Top affected categories
- Priority actions
- Files generated

**Use Case:** Quick briefing, share with team

### 4. invalid-tool-patterns.md
**Deep dive into WebSearch/WebFetch usage**

**Analysis:**
- Pattern 1: SEO/Marketing Research (16 agents)
- Pattern 2: Web Scraping Specialists (9 agents)
- Pattern 3: Engineering/Architecture Research (25 agents)
- Pattern 4: Content Creation (4 agents)
- Tool misunderstanding analysis
- Evidence from agent bodies (ZERO actual invocations found)
- Remediation strategy (automated + manual)
- Impact assessment (critical: 9, medium: 38, low: 51)

**Key Finding:** Invalid tools were added speculatively but never actually used in agent implementations.

### 5. README.md (this file)
**Navigation and context**

## Raw Data

**Location:** `/tmp/home_validation_results.json`

**Size:** ~1.2 MB JSON (447 agents with full validation results)

**Structure:**
```json
{
  "total_files": 447,
  "loadable": 447,
  "not_loadable": 0,
  "with_issues": 98,
  "model_distribution": { "haiku": 181, "sonnet": 155, "opus": 111 },
  "tier_distribution": { "haiku": 181, "sonnet": 155, "opus": 111 },
  "invalid_tools_found": { "WebSearch": 92, "WebFetch": 33 },
  "invalid_permissions_found": {},
  "agents": {
    "agent-path.md": { "loadable": true, "issues": [...], ... }
  }
}
```

**Validation Script:** `/tmp/validate_home_agents.py`

## Key Findings

### 1. All Agents Loadable
- 447/447 agents have valid YAML frontmatter
- Zero blocking parse errors
- System can load all agents successfully

### 2. Invalid Tools Widespread
- 92 agents reference WebSearch (doesn't exist)
- 33 agents reference WebFetch (doesn't exist)
- Root cause: Template propagation without SDK validation
- Impact: Agents fail silently when attempting to use tools

### 3. Permission Modes Not Set
- 447/447 agents missing explicit permission_mode
- Currently defaulting to `restricted` mode
- Best practice: Declare explicitly
- No blocking issue but should be fixed

### 4. Model Tier Distribution Reasonable
- Haiku: 181 (41%) - Good for fast, simple tasks
- Sonnet: 155 (35%) - Balanced for most tasks
- Opus: 111 (25%) - Appropriate for complex tasks
- Distribution suggests thoughtful tier selection

### 5. Largest Issue Category: Engineering
- 43 total engineering agents
- 25 have WebSearch issues (58%)
- Most affected category by volume
- Likely source of template propagation

## Priority Actions

### Immediate (1 hour)
1. Run automated tool removal script
2. Verify no regressions
3. Re-validate with script

### Short-term (1 week)
1. Add explicit permission_mode to all agents
2. Update descriptions for 47 agents needing web access notes
3. Add Bash tool to 9 scraping specialists

### Medium-term (1 month)
1. Migrate useful agents to workspace directory
2. Archive or remove unused legacy agents
3. Update to full model IDs (not shorthand)
4. Document home directory as legacy installation

## Comparison: Home vs Workspace

| Aspect | Home Directory | Workspace Directory |
|--------|----------------|---------------------|
| Location | `~/.claude/agents/` | `/Users/louisherman/ClaudeCodeProjects/.claude/agents/` |
| Agent Count | 447 | 5 |
| Loadability | 100% | 100% |
| With Issues | 98 (22%) | 0 (0%) |
| Invalid Tools | 125 references | 0 references |
| Permission Modes | 0 set | 5 set |
| Status | Legacy | Current |
| Maintenance | Low priority | High priority |

**Recommendation:** Focus optimization efforts on workspace directory. Use home directory as reference library.

## Remediation Scripts

### Remove Invalid Tools
```bash
# Remove WebSearch
find ~/.claude/agents -name "*.md" -type f \
  -exec sed -i '' '/^- WebSearch$/d' {} \;

# Remove WebFetch
find ~/.claude/agents -name "*.md" -type f \
  -exec sed -i '' '/^- WebFetch$/d' {} \;
```

### Add Permission Modes (Example)
```bash
# Add permission_mode: normal after model: line
find ~/.claude/agents -name "*.md" -type f \
  -exec sed -i '' 's/^model:/permission_mode: normal\nmodel:/' {} \;
```

### Re-validate
```bash
python3 /tmp/validate_home_agents.py > /tmp/validation_post_fix.json
python3 -c "import json; print(json.load(open('/tmp/validation_post_fix.json'))['with_issues'])"
# Expected output: 0
```

## Related Documentation

### Workspace Reports
- `/Users/louisherman/ClaudeCodeProjects/docs/reports/COMPREHENSIVE_BEST_PRACTICES_VALIDATION_2026-01-31.md`
- `/Users/louisherman/ClaudeCodeProjects/docs/reports/PHASE3_VALIDATION_SUMMARY.md`

### Agent Standards
- `/Users/louisherman/ClaudeCodeProjects/.claude/docs/ORGANIZATION_STANDARDS.md`
- Claude Agent SDK documentation (external)

### Tools Reference
- Valid tools: Read, Write, Edit, Bash, Grep, Glob
- MCP servers: Desktop, Slack, Fetch (requires setup)
- Invalid tools: WebSearch, WebFetch, TodoWrite, TodoRead

## Next Steps

1. **Review this report** - Understand scope and impact
2. **Run remediation scripts** - Remove invalid tools
3. **Manual updates** - 47 agents need description changes
4. **Re-validate** - Confirm issues resolved
5. **Migrate useful agents** - Move to workspace directory
6. **Archive legacy** - Mark home directory as reference only

## Contact

**Report Generated:** 2026-01-31
**Validation Script:** `/tmp/validate_home_agents.py`
**Raw Data:** `/tmp/home_validation_results.json`
**Report Location:** `/Users/louisherman/ClaudeCodeProjects/docs/reports/20x-home-2026-01-31/`
