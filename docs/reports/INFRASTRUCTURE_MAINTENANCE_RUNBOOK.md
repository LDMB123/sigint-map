# Infrastructure Maintenance Runbook

**Created**: 2026-01-31
**Scope**: Claude agent infrastructure at ~/.claude/ and project .claude/

---

## Quick Health Check

```bash
.claude/scripts/infra-health-check.sh
```

Expected: all PASS, 0 errors. Agent count warning at >400 is acceptable.

---

## Periodic Tasks

### Weekly: Agent Count Check

```bash
find ~/.claude/agents -name "*.md" -type f | wc -l
```

- Target: <500 agents
- Action if >500: Run deduplication (see below)

### Monthly: Full Health Check

```bash
.claude/scripts/infra-health-check.sh
```

Review output for any new warnings or failures.

### Quarterly: Route Table Refresh

- Verify route table version matches agent inventory
- Check for phantom agents (referenced but non-existent)
- Check for unrouted agents (exist but not referenced)

```bash
python3 -c "
import json, os
HOME = os.path.expanduser('~')
with open(f'{HOME}/.claude/config/semantic-route-table.json') as f:
    rt = json.load(f)
agents_in_table = set()
for cat, ca in rt.get('agents', {}).items():
    if isinstance(ca, dict):
        agents_in_table.update(ca.keys())
on_disk = set()
for r, _, fs in os.walk(f'{HOME}/.claude/agents'):
    for f in fs:
        if f.endswith('.md') and f not in ('README.md', 'SYNC_POLICY.md'):
            on_disk.add(f.replace('.md', ''))
phantoms = agents_in_table - on_disk
unrouted = on_disk - agents_in_table
print(f'Phantoms: {len(phantoms)}')
print(f'Unrouted: {len(unrouted)}')
if phantoms: print(f'  {sorted(phantoms)[:10]}')
if unrouted: print(f'  {sorted(unrouted)[:10]}')
"
```

---

## Agent Deduplication Procedure

When agent count exceeds threshold:

1. **Backup first**
```bash
cd ~/.claude && tar -czf agents_backup_$(date +%Y%m%d-%H%M%S).tar.gz agents/
```

2. **Find exact duplicates**
```bash
python3 -c "
import os, hashlib
d=os.path.expanduser('~/.claude/agents')
h={}
for r,_,fs in os.walk(d):
    for f in fs:
        if f.endswith('.md'):
            p=os.path.join(r,f)
            s=hashlib.md5(open(p,'rb').read()).hexdigest()
            if s in h: print(f'DUP: {f} == {h[s]}')
            else: h[s]=f
"
```

3. **Remove duplicates** (keep the one with the better name)
4. **Rebuild route table** if agents were removed

---

## Route Table Rebuild

If agents are added/removed, the semantic route table may need updating.

- Route table location: `~/.claude/config/semantic-route-table.json`
- Current version: 2.0.0
- Structure: agents by category, routes by domain, fuzzy keyword patterns
- Agents are referenced by their filename (without .md extension)

Key constraint: agent names in route table must exactly match filenames on disk.

---

## Rollback Procedures

### Agent Rollback
```bash
# List available backups
ls -la ~/.claude/agents_backup_*.tar.gz

# Restore from backup
cd ~/.claude && tar -xzf agents_backup_YYYYMMDD-HHMMSS.tar.gz
```

### Route Table Rollback
```bash
# Route table is in git - use git restore
cd /Users/louisherman/ClaudeCodeProjects
git checkout HEAD -- .claude/config/semantic-route-table.json
```

### Config Rollback
All config files in `.claude/config/` are tracked by git:
```bash
git diff .claude/config/  # See what changed
git checkout HEAD -- .claude/config/FILE.yaml  # Restore specific file
```

---

## Known Issues and Constraints

- Agent count 451 includes README.md and SYNC_POLICY.md (not true agents)
- 23 oversized agents (>21KB) are domain specialists; splitting degrades utility
- Old route-table.json (v1.1.0) coexists with semantic-route-table.json (v2.0.0); both are valid
- YAML config parse time (~30ms total) dominated by PyYAML overhead; JSON configs parse <1ms
- All agents load in <10ms total; on-demand loading means ~0.02ms per agent invocation

---

## Monitoring Metrics

| Metric | Current Value | Threshold | Action |
|--------|--------------|-----------|--------|
| Agent count | 448 active | >500 | Deduplicate |
| Exact duplicates | 0 | >5 | Remove duplicates |
| Route table phantoms | 0 | >0 | Fix references |
| Config validity | 7/7 valid | <7 | Fix invalid files |
| Frontmatter validity | 100% | <95% | Fix agents |
| Route table load time | 0.6ms | >10ms | Optimize |
| Backup tarballs | 1 | 0 | Create backup |

---

## Scripts Reference

| Script | Purpose | Location |
|--------|---------|----------|
| infra-health-check.sh | Full system validation | .claude/scripts/ |
| validate-routes.sh | Route table validation | .claude/scripts/ |
| audit-all-agents.sh | Agent audit | .claude/scripts/ |
| comprehensive-validation.sh | Workspace validation | .claude/scripts/ |
| verify-agent-organization.sh | Organization check | .claude/scripts/ |
| audit-agent-routing.sh | Routing audit | .claude/scripts/ |
