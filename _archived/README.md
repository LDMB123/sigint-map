# Archived Files

This directory contains archived files and backups from project reorganization.

## Contents

### skills_backup_20260130/

**Created**: 2026-01-30 06:58:11
**Restored**: 2026-01-30 (during skills reorganization)

Complete backup of Claude Code skills before reorganization into user-level and project-level structure.

**Contents**:
- 1,947+ skill markdown files
- 5 YAML skill files
- Skills from multiple projects (DMB Almanac, Emerson Violin PWA, root project)
- Documentation and reports

**Restoration Actions**:
- DMB-specific skills (34 files) moved to `.claude/skills/`
- 5 YAML files (security_audit, code_review, test_generation, ci_pipeline, api_upgrade) restored
- Generic skills kept at user-level `~/.claude/skills/`

**Status**: Archived for historical reference. Can be deleted after verification that all needed skills are restored and working.

---

## Cleanup Instructions

Once you've verified that:
1. All skills in `.claude/skills/` work correctly
2. Skills can be invoked with `/skill-name`
3. No missing functionality

You can safely delete this entire `_archived/` directory:

```bash
rm -rf /Users/louisherman/ClaudeCodeProjects/_archived
```

---

*Created: 2026-01-30*
