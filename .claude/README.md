# Universal Agent Framework (UAF)

**Version**: 1.0
**Health Score**: 99/100 (as of 2026-01-25)
**Total Agents**: 465 across 50 categories

---

## Overview

The Universal Agent Framework (UAF) is a function-first agent architecture enabling massive parallelization and efficient task decomposition.

**Key Features**:
- 465 specialized agents organized by function (not technology)
- 50 functional categories (validators, generators, analyzers, debuggers, etc.)
- Model tier optimization (Haiku/Sonnet/Opus based on complexity)
- Parallel execution patterns (swarms, compounds, cascades)
- Self-healing and self-improving capabilities

---

## Quick Start

### Browse All Agents
```bash
cat docs/reference/GLOBAL_INDEX.md
```

### Create a New Agent
```bash
cat docs/guides/AGENT_TEMPLATE.md
```

### Understand the Framework
```bash
cat docs/architecture/UAF_FRAMEWORK.md
```

---

## Directory Structure

```
.claude/
├── agents/          # 465 agent definitions (50 categories)
├── commands/        # 95 skill files
├── skills/          # 34 skill files
├── docs/            # Documentation (organized by category)
│   ├── architecture/  # Framework design
│   ├── reference/     # Indexes and cross-references
│   └── guides/        # Templates and how-tos
├── audit/           # Analysis files (58 reports)
├── config/          # Configuration
├── scripts/         # Utility scripts
├── tests/           # Test files
└── settings.local.json  # Active settings
```

---

## Documentation

All documentation is organized in the [`docs/`](./docs/) directory:

- **[Architecture](./docs/architecture/)** - Framework design and coordination
- **[Reference](./docs/reference/)** - Indexes, rosters, cross-references
- **[Guides](./docs/guides/)** - Templates, workflows, how-tos

See [`docs/README.md`](./docs/README.md) for complete navigation.

---

## Agent Categories (50 total)

**Top 10 by Agent Count**:
1. validators (80 agents) - Validation specialists
2. dmb (19 agents) - DMB Almanac-specific
3. debuggers (18 agents) - Debugging specialists
4. orchestrators (15 agents) - Workflow orchestration
5. compound (11 agents) - Multi-agent coordination
6. devops (10 agents) - Infrastructure/DevOps
7. caching (10 agents) - Cache strategies
8. testing (9 agents) - Testing specialists
9. content (9 agents) - Content creation
10. ecommerce (8 agents) - E-commerce specialists

[View all 50 categories →](./docs/reference/GLOBAL_INDEX.md)

---

## Health Score: 99/100

**Recent Improvements** (2026-01-25):
- ✓ Removed 4 duplicate agents
- ✓ Fixed GitHub token security exposure
- ✓ Migrated 6 template files to docs/
- ✓ Optimized 9 agent model tiers for cost efficiency
- ✓ Organized 30+ documentation files into subdirectories

[View detailed audit →](../docs/audits/2026-01-audit/)

---

## Contributing

1. Review [Agent Template](./docs/guides/AGENT_TEMPLATE.md)
2. Check [Model Policy](./docs/reference/MODEL_POLICY.md) for tier selection
3. Add agent to appropriate category in `agents/`
4. Update [GLOBAL_INDEX.md](./docs/reference/GLOBAL_INDEX.md)
5. Test agent invocation

---

## Support

- **Documentation**: [docs/](./docs/)
- **Audits**: [../docs/audits/](../docs/audits/)
- **Issues**: Repository-specific issue tracking

---

*Universal Agent Framework v1.0*
*Created: 2026*
*Last Updated: 2026-01-25*
