# Workspace ↔ HOME Agent Relationship

**Purpose:** Define the architecture and sync policy between workspace and HOME agent ecosystems

**Last updated:** 2026-01-31

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKSPACE Agent Ecosystem                         │
│                /Users/.../ClaudeCodeProjects/.claude/agents/         │
├─────────────────────────────────────────────────────────────────────┤
│  Total: 16 agents (curated, token-optimized, production-ready)      │
│                                                                       │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────────┐ │
│  │ 14 shared      │  │ 2 workspace-   │  │ Characteristics:      │ │
│  │ agents         │  │ only agents    │  │ • Token-optimized     │ │
│  │ (synced from   │  │ (path-coupled) │  │ • Thoroughly tested   │ │
│  │ workspace)     │  │                │  │ • Production-ready    │ │
│  └────────────────┘  └────────────────┘  │ • Active development  │ │
│                                           └───────────────────────┘ │
│  Sync direction: Workspace → HOME (one-way)                         │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
                         Manual sync (24hr SLA)
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      HOME Agent Library                              │
│                     ~/.claude/agents/                                │
├─────────────────────────────────────────────────────────────────────┤
│  Total: 447 agents (comprehensive library)                           │
│                                                                       │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ 14 shared      │  │ 433 HOME-only    │  │ dmb/ subdirectory  │  │
│  │ agents         │  │ agents           │  │ (28 DMB agents)    │  │
│  │ (synced to)    │  │                  │  │ • Organized        │  │
│  └────────────────┘  └──────────────────┘  │ • Categorized      │  │
│                                             │ • Documented       │  │
│  Organization:                              └────────────────────┘  │
│  • 419 flat structure (general-purpose)                              │
│  • 28 in dmb/ subdirectory (domain-specific)                         │
│                                                                       │
│  Sync direction: HOME changes stay in HOME (no auto-sync)           │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. Workspace as Curated Subset

**Workspace = Production deployment**
- Contains only agents actively used in development
- Token-optimized versions (smaller, faster)
- Thoroughly tested and validated
- Updated frequently during active development

**HOME = Complete library**
- All available agents (447 total)
- Reference implementations
- Experimental and specialized agents
- Organized by domain (flat + subdirectories)

### 2. One-Way Sync (Workspace → HOME)

**Why one-way?**
- Workspace is authoritative source for shared agents
- HOME contains untested/experimental agents
- Prevents accidental degradation of workspace quality
- Allows HOME experimentation without affecting workspace

**Sync trigger:**
- Workspace agent modified → sync to HOME within 24 hours
- HOME agent modified → stays in HOME (unless manually promoted)

### 3. Conflict Resolution: Workspace Wins

**Always prefer workspace version when conflicts arise:**

| Conflict Type | Resolution | Rationale |
|---------------|------------|-----------|
| YAML differs | Workspace wins | Workspace has tested configuration |
| Content differs | Workspace wins | Workspace is token-optimized |
| Model tier differs | Workspace wins | Workspace has appropriate tier selection |
| Size differs significantly | Workspace wins | Workspace is optimized for production |

**Example conflict (resolved 2026-01-31):**
- `dependency-analyzer.md`: HOME had `model: haiku`, workspace had `model: sonnet`
- Resolution: Synced workspace version → HOME (sonnet is more appropriate for analysis tasks)

### 4. Path Coupling Detection

**Some agents cannot live in HOME:**
- Contain hardcoded paths to workspace projects
- Example: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/`

**Workspace-only agents:**
1. `dmbalmanac-scraper.md` - Hardcoded paths (3 occurrences)
2. `dmbalmanac-site-expert.md` - Hardcoded paths (3 occurrences)

**Handling:**
- Keep in workspace only
- Document in workspace README
- Note absence in HOME README

## Agent Inventory

### Shared Agents (14)

Exist in both workspace and HOME. Workspace version is authoritative.

```
best-practices-enforcer.md    - Code quality enforcement
bug-triager.md                - Bug analysis and prioritization
code-generator.md             - Code generation from specs
dependency-analyzer.md        - Dependency analysis and auditing
dmb-analyst.md                - DMB concert analysis
documentation-writer.md       - Documentation generation
error-debugger.md             - Error diagnosis and debugging
migration-agent.md            - Code migration and refactoring
performance-auditor.md        - Performance auditing
performance-profiler.md       - Performance profiling
refactoring-agent.md          - Code refactoring
security-scanner.md           - Security vulnerability scanning
test-generator.md             - Test generation
token-optimizer.md            - Token usage optimization
```

### Workspace-Only Agents (2)

Path-coupled to workspace project, cannot exist in HOME.

```
dmbalmanac-scraper.md         - Web scraping for dmbalmanac.com
dmbalmanac-site-expert.md     - DMB Almanac site structure expert
```

### HOME-Only Agents (433)

Not in workspace. Includes:
- 28 in `dmb/` subdirectory (DMB specialists)
- 405 general-purpose agents (flat structure)

**DMB subdirectory breakdown:**
- Domain expertise: 3 agents
- Data & analysis: 7 agents
- Data validation: 6 agents (Haiku workers)
- Database architecture: 4 agents
- PWA & performance: 4 agents
- Debugging & orchestration: 3 agents

## Sync Procedures

### Manual Sync (Workspace → HOME)

**When workspace agent changes:**

```bash
# 1. Identify changed agent
AGENT="best-practices-enforcer.md"

# 2. Backup HOME version
cp ~/.claude/agents/$AGENT ~/.claude/agents/_pre-sync-backup/

# 3. Copy workspace version to HOME
cp /Users/louisherman/ClaudeCodeProjects/.claude/agents/$AGENT ~/.claude/agents/

# 4. Verify sync
md5 /Users/louisherman/ClaudeCodeProjects/.claude/agents/$AGENT
md5 ~/.claude/agents/$AGENT
# Should match exactly

# 5. Document in workspace
echo "Synced $AGENT on $(date)" >> docs/reports/sync-log.md
git add docs/reports/sync-log.md
git commit -m "docs: synced $AGENT to HOME"
```

**Batch sync (multiple agents):**

Use `dependency-analyzer` agent to detect conflicts, then sync all at once:

```bash
# Generate conflict report
# dependency-analyzer creates CONFLICTS_DETECTED.md

# Sync all conflicts
for agent in $(cat CONFLICTS_DETECTED.md | grep '\.md' | awk '{print $1}'); do
  cp /Users/louisherman/ClaudeCodeProjects/.claude/agents/$agent ~/.claude/agents/
done

# Verify all syncs
for agent in $(cat CONFLICTS_DETECTED.md | grep '\.md' | awk '{print $1}'); do
  echo "Checking $agent..."
  md5 /Users/louisherman/ClaudeCodeProjects/.claude/agents/$agent
  md5 ~/.claude/agents/$agent
done
```

### Monthly Conflict Detection

**Schedule:** First day of each month

```bash
# 1. Run dependency-analyzer in workspace
cd /Users/louisherman/ClaudeCodeProjects
# Deploy dependency-analyzer with conflict detection

# 2. Review CONFLICTS_DETECTED.md
cat docs/reports/home-inventory-$(date +%Y-%m-%d)/CONFLICTS_DETECTED.md

# 3. Sync all conflicts (workspace → HOME)
# Use batch sync procedure above

# 4. Update SYNC_POLICY.md
# Document synced agents, dates, changes

# 5. Git commit
git add docs/reports/home-inventory-$(date +%Y-%m-%d)/
git commit -m "chore: monthly HOME sync - $(date +%Y-%m-%d)"
```

## Organization Policies

### Workspace Organization

**Rules:**
1. Maximum 20 agents (keep curated)
2. All agents must be production-ready
3. Token-optimized versions only
4. Update README.md when adding/removing agents

**Adding to workspace:**
1. Create and test in workspace first
2. Verify production-readiness
3. Token-optimize if needed
4. Add to workspace README.md
5. Sync to HOME within 24 hours

### HOME Organization

**Rules:**
1. Flat structure for general-purpose agents
2. Subdirectories for domain-specific collections (10+ agents)
3. Each subdirectory has README.md
4. Update HOME README.md when creating subdirectories

**Adding to HOME:**
1. If general-purpose: Add to flat structure
2. If domain-specific: Add to appropriate subdirectory
3. Create new subdirectory if 10+ related agents
4. Update appropriate README.md

**Subdirectory creation:**
- Threshold: 10+ related agents
- Examples: `dmb/` (28 agents), future: `security/`, `performance/`
- Include categorized README.md

## Verification

### Sync Verification

**After manual sync:**

```bash
# Verify MD5 hash match
AGENT="dependency-analyzer.md"
WORKSPACE_MD5=$(md5 -q /Users/louisherman/ClaudeCodeProjects/.claude/agents/$AGENT)
HOME_MD5=$(md5 -q ~/.claude/agents/$AGENT)

if [ "$WORKSPACE_MD5" = "$HOME_MD5" ]; then
  echo "✅ $AGENT synced successfully"
else
  echo "❌ $AGENT sync failed - hashes don't match"
fi
```

**Verify all shared agents:**

```bash
# Check all 14 shared agents
for agent in best-practices-enforcer.md bug-triager.md code-generator.md \
             dependency-analyzer.md dmb-analyst.md documentation-writer.md \
             error-debugger.md migration-agent.md performance-auditor.md \
             performance-profiler.md refactoring-agent.md security-scanner.md \
             test-generator.md token-optimizer.md; do

  WORKSPACE_MD5=$(md5 -q /Users/louisherman/ClaudeCodeProjects/.claude/agents/$agent)
  HOME_MD5=$(md5 -q ~/.claude/agents/$agent)

  if [ "$WORKSPACE_MD5" = "$HOME_MD5" ]; then
    echo "✅ $agent"
  else
    echo "❌ $agent - CONFLICT DETECTED"
  fi
done
```

### YAML Validation

**Verify YAML frontmatter:**

```bash
# Check YAML syntax for all agents
for agent in ~/.claude/agents/*.md; do
  # Extract YAML frontmatter
  sed -n '/^---$/,/^---$/p' "$agent" > /tmp/yaml-check.yaml

  # Validate YAML
  python3 -c "import yaml; yaml.safe_load(open('/tmp/yaml-check.yaml'))" 2>&1

  if [ $? -eq 0 ]; then
    echo "✅ $(basename $agent)"
  else
    echo "❌ $(basename $agent) - INVALID YAML"
  fi
done
```

## Rollback Procedures

### Rollback Single Agent

**If sync introduced issues:**

```bash
# Restore from backup
AGENT="best-practices-enforcer.md"
cp ~/.claude/agents/_pre-sync-backup/$AGENT ~/.claude/agents/

# Verify restoration
md5 ~/.claude/agents/$AGENT
# Should match pre-sync hash
```

### Rollback Entire Sync

**If batch sync introduced issues:**

```bash
# Restore all from backup
cd ~/.claude/agents/_pre-sync-backup/
for agent in *.md; do
  cp "$agent" ~/.claude/agents/
done

# Verify all restorations
cd ~/.claude/agents
for agent in _pre-sync-backup/*.md; do
  AGENT_NAME=$(basename "$agent")
  BACKUP_MD5=$(md5 -q "_pre-sync-backup/$AGENT_NAME")
  CURRENT_MD5=$(md5 -q "$AGENT_NAME")

  if [ "$BACKUP_MD5" = "$CURRENT_MD5" ]; then
    echo "✅ $AGENT_NAME restored"
  else
    echo "❌ $AGENT_NAME restoration failed"
  fi
done
```

**Backup retention:**
- Keep for 30 days after sync
- Location: `~/.claude/agents/_pre-sync-backup/`
- Auto-cleanup: Delete backups older than 30 days

## Maintenance Schedule

### Daily
- No actions required

### Weekly
- Review workspace agent usage
- Consider promoting HOME agents to workspace if frequently needed

### Monthly (1st of month)
1. Run conflict detection (dependency-analyzer)
2. Review CONFLICTS_DETECTED.md
3. Sync all conflicts (workspace → HOME)
4. Verify MD5 hashes
5. Update SYNC_POLICY.md
6. Git commit sync report

### Quarterly
1. Review HOME-only agents for workspace promotion
2. Consider new subdirectories (if 10+ related agents)
3. Archive deprecated agents
4. Update all README.md files
5. Comprehensive YAML validation
6. Review and update this document

## History

**2026-01-31: Initial comprehensive organization**
- Created workspace README.md
- Created HOME README.md
- Created SYNC_POLICY.md
- Synced 4 version conflicts
- Moved 2 path-coupled agents to workspace
- Created dmb/ subdirectory (28 agents)
- Documented relationship architecture

**Last sync:** 2026-01-31
- best-practices-enforcer.md (token-optimized)
- performance-auditor.md (token-optimized)
- dependency-analyzer.md (model: haiku → sonnet)
- token-optimizer.md (added skills declaration)

**Next review:** 2026-03-01
