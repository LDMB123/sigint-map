# Multi-Project Cleanup Checklist

**Date**: 2026-01-31
**Projects**: 5 audited
**Estimated Time**: 15 min - 2.5 hrs

---

## Phase 1: Critical Fixes (15 min) - RECOMMENDED

### imagen-experiments

- [ ] Create `docs/reports/` directory
- [ ] Move `BATCH_121-150_COMPLETE.md` → `docs/reports/batch-121-150-complete.md`
- [ ] Move `BATCH_151-180_READY.md` → `docs/reports/batch-151-180-ready.md`
- [ ] Move `COMPRESSION_VALIDATION.md` → `docs/reports/compression-validation.md`
- [ ] Move `OPTIMIZATION_INDEX.md` → `docs/reports/optimization-index.md`
- [ ] Move `TOKEN_OPTIMIZATION_REPORT.md` → `docs/reports/token-optimization-report.md`
- [ ] Move `COMPRESSION_EXECUTIVE_SUMMARY.txt` → `docs/reports/compression-executive-summary.txt`
- [ ] Move `LAUNCH_COMMANDS.sh` → `scripts/launch-commands.sh`
- [ ] Delete `docs/dive-bar-concepts-61-80.md` (empty)
- [ ] Delete `docs/dive-bar-concepts-81-90.md` (empty)

### google-image-api-direct

- [ ] Delete `package 2.json` (duplicate)

### gemini-mcp-server

- [ ] Add `dist/` to `.gitignore`
- [ ] Run `git rm -r --cached dist/`

**Phase 1 Complete**: Files organized, workspace compliant

---

## Phase 2: Project Triage (30 min) - DECISION REQUIRED

### google-image-api-direct (17 MB)

**Status**: No source code, appears abandoned

**Option A - Archive** (RECOMMENDED):
- [ ] Review project to confirm abandonment
- [ ] Archive: `mv projects/google-image-api-direct _archived/google-image-api-direct-2025-01/`
- [ ] Space recovered: 17 MB

**Option B - Keep**:
- [ ] Add README.md documenting project status
- [ ] Remove `node_modules/` (can reinstall later)
- [ ] Add source code or mark as placeholder

### stitch-vertex-mcp (23 MB)

**Status**: Minimal source (1 file), no documentation

**Option A - Archive** (if abandoned):
- [ ] Review `index.js` to determine if active
- [ ] Archive: `mv projects/stitch-vertex-mcp _archived/stitch-vertex-mcp-2025-01/`
- [ ] Space recovered: 23 MB

**Option B - Keep** (if active):
- [ ] Create README.md with:
  - [ ] Project purpose
  - [ ] Usage instructions
  - [ ] Dependencies explanation
- [ ] Consider adding CLAUDE.md if active development

**Phase 2 Complete**: Abandoned projects handled, 40 MB potentially recovered

---

## Phase 3: Long-term Optimization (1-2 hrs) - OPTIONAL

### imagen-experiments

**Log Compression**:
- [ ] Navigate to `_logs/`
- [ ] Run `gzip *.log`
- [ ] Space saved: ~90 KB

**Scripts Documentation**:
- [ ] Create `scripts/README.md`
- [ ] Document active vs deprecated scripts
- [ ] Add usage instructions

**Archive Old Scripts** (manual review required):
- [ ] Identify deprecated scripts (review each file)
- [ ] Create `_archived/scripts-2025-01/`
- [ ] Move deprecated scripts to archive
- [ ] Space saved: ~600 KB

**Consolidate Prompts** (optional):
- [ ] Review prompts in `/prompts/` vs `/docs/`
- [ ] Move old batches to `docs/archive/prompts-archive/`
- [ ] Keep active prompts in `/prompts/`

**Phase 3 Complete**: Long-term maintainability improved

---

## Automated Execution

**Run cleanup script**:
```bash
/Users/louisherman/ClaudeCodeProjects/docs/reports/CLEANUP_SCRIPT.sh
```

**Interactive menu options**:
- Option 4: Run all Phase 1 (safe, recommended)
- Option 7: Run all Phase 2 (prompts for confirmation)
- Option 10: Run all Phase 3 (optional optimizations)
- Option 11: Run all phases
- Option 12: Show space summary

---

## Verification Checklist

After Phase 1:
- [ ] No markdown files in `imagen-experiments/` root (except CLAUDE.md, README.md)
- [ ] All reports in `docs/reports/`
- [ ] No empty files in workspace
- [ ] No duplicate files

After Phase 2:
- [ ] Abandoned projects archived or documented
- [ ] All active projects have README.md
- [ ] Build artifacts in `.gitignore`

After Phase 3:
- [ ] Old logs compressed (`.log.gz`)
- [ ] Scripts documented
- [ ] Clear separation of active vs archived files

---

## Rollback Plan

All operations are safe (moves/archives):

**Undo Phase 1 file moves**:
```bash
# If needed, reverse file moves (example):
mv docs/reports/batch-121-150-complete.md BATCH_121-150_COMPLETE.md
# etc.
```

**Restore archived projects**:
```bash
# Restore google-image-api-direct:
mv _archived/google-image-api-direct-2025-01 projects/google-image-api-direct

# Restore stitch-vertex-mcp:
mv _archived/stitch-vertex-mcp-2025-01 projects/stitch-vertex-mcp
```

**Decompress logs**:
```bash
gunzip _logs/*.log.gz
```

---

## Success Criteria

- [ ] Workspace organization score: 85+/100 (from 65/100)
- [ ] Zero files in project roots requiring relocation
- [ ] All active projects have clear documentation
- [ ] Space recovered: 40 MB (if Phase 2 archival executed)
- [ ] No build artifacts committed to git

---

## Post-Cleanup

**Update workspace documentation**:
- [ ] Update workspace README if project list changed
- [ ] Add archival notes to project tracking

**Set up monitoring**:
- [ ] Schedule quarterly organization audits
- [ ] Add pre-commit hook to prevent scattered files
- [ ] Document project status tracking process

**Report completion**:
- [ ] Record cleanup date in workspace log
- [ ] Note space recovered
- [ ] Document any deviations from plan

---

## Quick Reference

**Full Audit**: `/Users/louisherman/ClaudeCodeProjects/docs/reports/MULTI_PROJECT_ORGANIZATION_AUDIT.md`

**Summary**: `/Users/louisherman/ClaudeCodeProjects/docs/reports/MULTI_PROJECT_AUDIT_SUMMARY.md`

**Script**: `/Users/louisherman/ClaudeCodeProjects/docs/reports/CLEANUP_SCRIPT.sh`

**This Checklist**: `/Users/louisherman/ClaudeCodeProjects/docs/reports/CLEANUP_CHECKLIST.md`
