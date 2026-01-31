# Agent Testing Quick Reference

**One-page reference for agent ecosystem testing**

---

## Test Categories

| Category | Priority | Files | Status | Command |
|----------|----------|-------|--------|---------|
| Agent Validation | P0 | 6 | Missing | `npm run test:agents` |
| Routing Tests | P0 | 18 | Partial | `npm run test:routing` |
| Integration | P1 | 4 | Minimal | `npm run test:integration` |
| Regression | P0 | 4 | Missing | `npm run test:regression` |
| Load Tests | P2 | 4 | Missing | `npm run test:load` |

---

## Critical Tests to Implement

### 1. Agent YAML Validation
```bash
# File: lib/agents/__tests__/yaml-validation.test.ts
- Parse frontmatter for all 14 agents
- Validate required fields (name, description, tools, model)
- Check tool references are valid
- Validate model tier values
```

### 2. Phase 3 Regression Prevention
```bash
# File: lib/agents/__tests__/phase3-regression.test.ts
- Detect orchestrator_testing corruption
- Validate frontmatter delimiters
- Check tools array format
- Prevent known bad patterns
```

### 3. Route Table Integrity
```bash
# File: lib/routing/__tests__/route-table-integrity.test.ts
- Validate all routes reference existing agents
- Check semantic hash uniqueness
- Verify category routes completeness
- Detect orphaned routes
```

---

## Quick Setup

```bash
# 1. Create config
mkdir -p .claude/lib/agents/__tests__
mkdir -p .claude/tests/integration

# 2. Add scripts to package.json
npm pkg set scripts.test:agents="vitest lib/agents"
npm pkg set scripts.test:coverage="vitest --coverage"

# 3. Run tests
cd .claude && npm test
```

---

## Common Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Run specific file
npm test -- yaml-validation

# Smoke tests
npm run test:smoke
```

---

## Coverage Targets

- Line coverage: 85%+
- Branch coverage: 80%+
- Function coverage: 90%+
- Critical paths: 100%

---

## Performance Targets

- Agent registry build: <50ms
- Route lookup: <1ms (p50)
- Cache hit rate: >80%
- Memory usage: <100MB
- Test execution: <30s (full suite)

---

## Priority Order

1. Week 1: Agent YAML validation + Phase 3 regression tests
2. Week 2: Route table integrity + tool permission tests
3. Week 3: Integration tests (agent-skill, MCP, hooks)
4. Week 4: Load tests + performance benchmarks
5. Week 5: Coverage analysis + gap filling

---

## Related Documentation

- Strategy: `AGENT_ECOSYSTEM_TESTING_STRATEGY.md`
- Implementation: `TESTING_IMPLEMENTATION_GUIDE.md`
- Existing Tests: `.claude/lib/routing/__tests__/`
- Scripts: `.claude/scripts/comprehensive-validation.sh`
