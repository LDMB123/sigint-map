# Hardcoded Path Issues in HOME Agents

**Generated:** 2026-01-31
**Agents scanned:** 447
**Agents with hardcoded paths:** 2

## Summary

- 2 agents reference `/Users/louisherman/ClaudeCodeProjects/`
- These agents are tightly coupled to this workspace and may break if used elsewhere
- Consider migrating workspace-specific agents to the workspace `.claude/agents/` directory

## Migration Recommendations

| Priority | Criteria |
|----------|----------|
| HIGH | Agent primarily serves this workspace (dmb-*, project-specific) |
| MEDIUM | Agent references workspace paths but is general-purpose |
| LOW | Agent has a single incidental path reference |

## Agents with Hardcoded Paths

### `dmbalmanac-scraper.md` [HIGH]

- **Path references:** 3 (3 unique)
  - `/Users/louisherman/ClaudeCodeProjects/SELECTOR_REMEDIATION_GUIDE.md`
  - `/Users/louisherman/ClaudeCodeProjects/SELECTOR_VALIDATION_REPORT.md`
  - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/docs/scraping/DMBALMANAC_HTML_STRUCTURE_REFERENCE.md`
- **Recommendation:** Move to workspace `.claude/agents/`

### `dmbalmanac-site-expert.md` [HIGH]

- **Path references:** 3 (3 unique)
  - `/Users/louisherman/ClaudeCodeProjects/SELECTOR_REMEDIATION_GUIDE.md`
  - `/Users/louisherman/ClaudeCodeProjects/SELECTOR_VALIDATION_REPORT.md`
  - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/docs/scraping/DMBALMANAC_HTML_STRUCTURE_REFERENCE.md`
- **Recommendation:** Move to workspace `.claude/agents/`

