# Coordination Agents

**Consolidated Category**: Orchestrators + Predictive + Neural-routing
**Total Agents**: 13
**Purpose**: Multi-agent coordination, routing, and workflow orchestration

---

## Category Consolidation

This category merges three previously separate categories:
- **orchestrators/** - Workflow and pipeline orchestration
- **predictive/** - Workload prediction and adaptive routing
- **neural-routing/** - ML-based agent routing

**Why consolidated?** All agents coordinate multiple agents or route tasks intelligently.

---

## Agent Types

### Workflow Orchestration
- `workflow-orchestrator.md` - General workflow coordination
- `pipeline-orchestrator.md` - Data/build pipelines
- `deployment-orchestrator.md` - Deployment workflows
- `migration-orchestrator.md` - Migration coordination
- `testing-orchestrator.md` - Test suite orchestration
- `review-orchestrator.md` - Code review coordination

### Advanced Orchestration
- `cascading-orchestrator.md` - Multi-tier cascading
- `auto-scaling-orchestrator.md` - Dynamic agent scaling

### Smart Routing
- `smart-agent-router.md` - Task-to-agent routing
- `adaptive-tier-selector.md` - Dynamic tier selection
- `workload-predictor.md` - Workload forecasting
- `attention-router.md` - Attention-based routing
- `embedding-matcher.md` - Semantic task matching

---

## Usage Patterns

**Workflow Orchestration:**
```
workflow-orchestrator → [parallel agents] → aggregation
```

**Smart Routing:**
```
workload-predictor → adaptive-tier-selector → smart-agent-router → execution
```

**Cascading Pattern:**
```
cascading-orchestrator → Opus → Sonnet → Haiku (cost optimization)
```

**Auto-scaling:**
```
auto-scaling-orchestrator monitors → spawns/terminates agents dynamically
```

---

## Migration from Old Structure

| Old Path | New Path |
|----------|----------|
| `orchestrators/workflow-orchestrator` | `coordination/workflow-orchestrator` |
| `predictive/smart-agent-router` | `coordination/smart-agent-router` |
| `neural-routing/attention-router` | `coordination/attention-router` |
