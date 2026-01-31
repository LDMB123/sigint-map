# Safe Migration Plan: Agent Ecosystem Alignment

**Status:** Recommended Actions  
**Risk Level:** LOW (no breaking changes proposed)  
**Estimated Effort:** 2-4 hours  

---

## Phase 1: Immediate Fixes (High Priority)

### 1.1 Fix token-optimizer.md in HOME
**Issue:** Missing skills declaration in home version  
**Impact:** Agent can't use context-compressor, cache-warmer skills  
**Action:**
```bash
# Add skills to home version
cd ~/.claude/agents/
# Edit token-optimizer.md to add:
# skills:
#   - token-budget-monitor
#   - context-compressor
#   - cache-warmer
```
**Verification:** Grep for skills section, confirm 3 skills listed  
**Estimated Time:** 5 minutes  

---

### 1.2 Resolve dependency-analyzer Model Conflict
**Issue:** Workspace uses sonnet, home uses haiku  
**Impact:** Inconsistent analysis quality  
**Decision Required:** Which is canonical?  
**Recommendation:** Use sonnet (workspace version) for better dependency analysis  
**Action:**
```bash
# Update home version to sonnet
cd ~/.claude/agents/
# Edit dependency-analyzer.md line with model: haiku → model: sonnet
```
**Estimated Time:** 2 minutes  

---

### 1.3 Document Workspace Curation Policy
**Issue:** No documentation explaining why only 14 agents in workspace  
**Impact:** Unclear what belongs in workspace vs home  
**Action:** Create `.claude/agents/README.md`
```markdown
# Workspace Agents

Curated subset of 14 agents optimized for ClaudeCodeProjects workspace.

## Inclusion Criteria
- Used in >50% of development sessions
- Core to primary workflows (coding, testing, documentation)
- Token-optimized for frequent invocation
- Project-agnostic (useful across all projects in workspace)

## Excluded Categories
- Domain-specific agents (browser, ecommerce, etc.) → use from home
- Experimental agents → keep in home until proven
- Infrequently used agents → available via home fallback
- Large context agents → compress before adding

## Optimization Standard
All workspace agents:
- <2000 chars preferred
- Compressed content (bullet points, no verbose explanations)
- Clear "Use when..." delegation patterns
- Proper skills declarations

## Sync Policy
- Workspace → Home: Optional, when optimizations proven
- Home → Workspace: Selective, only after proving value + optimization
- No automatic bidirectional sync
```
**Estimated Time:** 10 minutes  

---

## Phase 2: Home Reorganization (Medium Priority)

### 2.1 Consolidate DMB Agents
**Issue:** 27 DMB agents scattered in flat structure + 3 in dmb/ subdirectory  
**Impact:** Hard to find, inconsistent organization  
**Action:**
```bash
cd ~/.claude/agents/

# Move all DMB agents to dmb/ subdirectory
mv dmb-brand-dna-expert.md dmb/
mv dmb-chromium-optimizer.md dmb/
mv dmb-compound-orchestrator.md dmb/
mv dmb-data-validator.md dmb/
mv dmb-dexie-architect.md dmb/
mv dmb-drizzle-unwinder.md dmb/
mv dmb-expert.md dmb/
mv dmb-guest-appearance-checker.md dmb/
mv dmb-guest-specialist.md dmb/
mv dmb-indexeddb-debugger.md dmb/
mv dmb-liberation-calculator.md dmb/
mv dmb-migration-coordinator.md dmb/
mv dmb-offline-first-architect.md dmb/
mv dmb-prisma-unwinder.md dmb/
mv dmb-pwa-debugger.md dmb/
mv dmb-scraper-debugger.md dmb/
mv dmb-setlist-pattern-analyzer.md dmb/
mv dmb-setlist-validator.md dmb/
mv dmb-show-analyzer.md dmb/
mv dmb-show-validator.md dmb/
mv dmb-song-stats-checker.md dmb/
mv dmb-sqlite-specialist.md dmb/
mv dmb-tour-optimizer.md dmb/
mv dmb-venue-consistency-checker.md dmb/
mv dmbalmanac-scraper.md dmb/
mv dmbalmanac-site-expert.md dmb/
mv dmb-analyst.md dmb/

# Verify
ls -la dmb/
# Should show 30 agents
```
**Verification:** Count files in dmb/ should equal 30  
**Estimated Time:** 15 minutes  

---

### 2.2 Establish Flat vs Categorized Rules
**Issue:** No documented rules for when agents go flat vs subdirectories  
**Impact:** Inconsistent organization over time  
**Action:** Create `~/.claude/agents/README.md`
```markdown
# Home Agent Library

Global agent collection (447 agents across 62 categories).

## Organization Rules

### Flat Structure (Generic Agents)
Agents in root directory must meet ALL criteria:
- Project-agnostic (useful across any domain)
- Frequently used (>25% of sessions)
- General-purpose (not domain-specific)
- Standalone (minimal dependencies)

**Current flat agents (13):**
best-practices-enforcer, bug-triager, code-generator, dependency-analyzer,
documentation-writer, error-debugger, migration-agent, performance-auditor,
performance-profiler, refactoring-agent, security-scanner, test-generator,
token-optimizer

### Categorized Structure (Specialized Agents)
All other agents organized by domain:
- `dmb/` - Dave Matthews Band project specialists (30 agents)
- `debug/` - Debugging specialists (15 agents)
- `browser/` - Browser automation (15 agents)
- `design/` - Design and UX (8 agents)
- `ecommerce/` - E-commerce domain (10 agents)
- [etc...]

## Adding New Agents

1. Determine if generic or specialized
2. If generic AND frequently used → flat
3. If specialized OR infrequent → categorize
4. If category doesn't exist → create new subdirectory
5. Update this README

## Relationship with Workspace Agents

Workspace agents (`.claude/agents/` in projects):
- Override home agents with same name
- Token-optimized versions
- Curated subset for specific project
- Take precedence when loading

Home agents serve as:
- Global defaults
- Fallback for missing workspace agents
- Comprehensive library
- Source for importing to workspace
```
**Estimated Time:** 15 minutes  

---

## Phase 3: Version Alignment (Medium Priority)

### 3.1 Sync Workspace Optimizations to Home
**Issue:** 3 agents have better workspace versions  
**Impact:** Home versions are verbose, workspace versions more efficient  
**Strategy:** Keep both, rename home versions  

**Action:**
```bash
cd ~/.claude/agents/

# Preserve verbose versions with -detailed suffix
cp best-practices-enforcer.md best-practices-enforcer-detailed.md
cp performance-auditor.md performance-auditor-detailed.md  
cp token-optimizer.md token-optimizer-detailed.md

# Copy optimized workspace versions
cp /Users/louisherman/ClaudeCodeProjects/.claude/agents/best-practices-enforcer.md .
cp /Users/louisherman/ClaudeCodeProjects/.claude/agents/performance-auditor.md .
cp /Users/louisherman/ClaudeCodeProjects/.claude/agents/token-optimizer.md .

# Update token-optimizer.md with missing skills (from step 1.1)
```

**Result:**
- Default home versions now optimized
- Detailed versions preserved for reference
- Best of both approaches available

**Estimated Time:** 10 minutes  

---

## Phase 4: Path Reference Audit (High Priority)

### 4.1 Scan for Hardcoded Paths
**Issue:** Agents may reference absolute paths  
**Impact:** Breaks when used in different contexts  

**Action:**
```bash
# Check home agents for workspace paths
grep -r "/Users/louisherman/ClaudeCodeProjects" ~/.claude/agents/ || echo "No workspace paths found"

# Check workspace agents for home paths  
grep -r "~/.claude" /Users/louisherman/ClaudeCodeProjects/.claude/agents/ || echo "No home paths found"

# Check for other absolute paths
grep -r "^/Users/" ~/.claude/agents/ | grep -v "model:" | grep -v "tools:" || echo "No other absolute paths"

# Check workspace for absolute paths
grep -r "^/Users/" /Users/louisherman/ClaudeCodeProjects/.claude/agents/ | grep -v "model:" | grep -v "tools:" || echo "No absolute paths"
```

**If paths found:**
- Replace with relative paths
- Use environment variables
- Document expected working directory

**Estimated Time:** 20 minutes  

---

### 4.2 Test Agent Precedence
**Issue:** Need to verify workspace agents override home agents  
**Impact:** If precedence wrong, optimizations may not apply  

**Action:**
```bash
# Temporarily rename workspace agent
cd /Users/louisherman/ClaudeCodeProjects/.claude/agents/
mv token-optimizer.md token-optimizer.md.backup

# Test which version loads
# (Manual: Invoke token-optimizer agent in Claude Code, check if verbose home version loads)

# Restore
mv token-optimizer.md.backup token-optimizer.md

# If home version loaded: Workspace takes precedence ✓
# If error occurred: Need to investigate loading order
```

**Estimated Time:** 10 minutes  

---

## Phase 5: Documentation (Low Priority)

### 5.1 Update Workspace CLAUDE.md
**Issue:** No mention of home agent relationship  
**Impact:** Future users don't understand dual-ecosystem approach  

**Action:** Add section to `/Users/louisherman/ClaudeCodeProjects/CLAUDE.md`:
```markdown
## Agent Ecosystem

### Dual Structure
- **Workspace agents** (`.claude/agents/`): 14 curated, optimized agents
- **Home agents** (`~/.claude/agents/`): 447 comprehensive library

### Loading Precedence
1. Workspace agents loaded first (if exist)
2. Home agents provide fallback
3. Workspace agents override home with same name

### Curation Policy
Workspace agents must:
- Be used in >50% of development sessions
- Provide core workflow support
- Be token-optimized (<2000 chars)
- Work across all workspace projects

### Adding Agents
1. Test new agent in home first
2. If frequently used, consider workspace import
3. Optimize before adding to workspace
4. Document in `.claude/agents/README.md`
```

**Estimated Time:** 10 minutes  

---

### 5.2 Create Decision Tree
**Issue:** Unclear when to add agent to workspace vs home  
**Action:** Create visual decision tree document  

**Estimated Time:** 15 minutes  

---

## Phase 6: Ongoing Maintenance (Continuous)

### 6.1 Monthly Review
- Check workspace agent usage (which are actually used?)
- Identify home agents becoming frequently used
- Remove workspace agents falling below 50% usage
- Apply workspace optimizations to home versions

**Estimated Time:** 30 minutes/month  

---

### 6.2 Quarterly Deep Audit
- Run performance-auditor on both ecosystems
- Measure token budgets, routing accuracy
- Identify duplicate functionality
- Archive unused home agents
- Document organizational improvements

**Estimated Time:** 2 hours/quarter  

---

## Risk Assessment

### Low Risk Actions
- Adding README documentation
- Creating decision trees  
- Scanning for path references
- Testing precedence

**Impact if failed:** Documentation incomplete, no system changes

---

### Medium Risk Actions
- Moving DMB agents to subdirectory
- Renaming detailed versions
- Copying optimized versions

**Impact if failed:** Agents in wrong location, easy to reverse with git

---

### High Risk Actions
- (NONE PROPOSED)

**Strategy:** All proposed changes are reversible, no destructive operations

---

## Rollback Plan

If issues arise:
```bash
# Restore from git (workspace)
cd /Users/louisherman/ClaudeCodeProjects
git checkout .claude/agents/

# Restore from backup (home - create backup first)
cd ~/.claude/agents/
tar czf backup-$(date +%Y%m%d).tar.gz .
# If restore needed:
# rm -rf ~/.claude/agents/*
# tar xzf backup-YYYYMMDD.tar.gz
```

---

## Success Criteria

After migration complete:
- [ ] All version conflicts resolved
- [ ] Both ecosystems documented
- [ ] DMB agents consolidated
- [ ] No hardcoded paths
- [ ] Precedence verified
- [ ] Curation policy documented
- [ ] README files in both locations
- [ ] Decision tree created
- [ ] All actions tested and verified

---

## Estimated Total Time

- Phase 1 (Immediate): 20 minutes
- Phase 2 (Home reorg): 30 minutes
- Phase 3 (Version align): 10 minutes
- Phase 4 (Path audit): 30 minutes
- Phase 5 (Documentation): 25 minutes
- **Total: 1 hour 55 minutes**

With testing and verification: **2-3 hours**

---

## Next Steps

1. Review this plan
2. Create backups (workspace in git, home in tarball)
3. Execute Phase 1 (immediate fixes)
4. Test agents after Phase 1
5. Proceed to Phase 2 if tests pass
6. Complete remaining phases
7. Document results

**Recommendation:** Execute phases sequentially with testing between each phase.
