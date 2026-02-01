# Claude Infrastructure Audit - Quick Reference

**Date**: 2026-01-31
**Compliance**: 89% (17/19 agents compliant)
**Priority**: HIGH (2 critical violations)

## Critical Issues (Fix Now)

1. **dmbalmanac-scraper.md** - 33KB (FAIL)
   - Extract HTML selectors to skill reference
   - Savings: 25KB

2. **dmbalmanac-site-expert.md** - 26KB (FAIL)
   - Remove redundant HTML docs
   - Savings: 20KB

3. **workflow-patterns.json** - 64KB
   - Remove 35 unused Rust/WASM patterns
   - Savings: 40KB

## Quick Wins

- Delete 14 empty directories: `find .claude -type d -empty -delete`
- Remove backup file: `mv .claude/settings.local.json.backup-* _archived/`
- Total quick savings: 26KB + cleanup

## Compliance Scores

- Agents: 89% (2 violations)
- Skills: 100% (all compliant)
- Tools: 100% (proper restrictions)
- Naming: 100% (kebab-case)
- Structure: 95% (empty dirs)

## Savings Potential

- Guaranteed: 111 KB file cleanup
- Config: 40 KB workflow patterns
- node_modules: 62 MB (rebuild optimization)
- Total: 68.5 MB potential

## Action Plan

**Week 1**:
1. Extract dmbalmanac-scraper selectors → skill
2. Trim dmbalmanac-site-expert → reference skill
3. Delete empty dirs
4. Remove backup file

**Month 1**:
5. Prune workflow-patterns.json
6. Add pre-commit hook for agent size limit

**Ongoing**:
7. Monitor agent growth
8. Quarterly tool grant audit

## Files

- Full report: `/docs/reports/CLAUDE_INFRASTRUCTURE_AUDIT.md`
- This summary: `/docs/reports/CLAUDE_AUDIT_SUMMARY.md`
