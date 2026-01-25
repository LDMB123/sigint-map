# Generation Agents

**Consolidated Category**: Generators + Documentation + Reporters
**Total Agents**: 15
**Purpose**: Code generation, documentation creation, and reporting

---

## Category Consolidation

This category merges three previously separate categories:
- **generators/** - Code, test, and scaffold generation
- **documentation/** - Technical documentation and guides
- **reporters/** - Metrics, summaries, and status reports

**Why consolidated?** All agents create artifacts (code, docs, or reports).

---

## Agent Types

### Code Generation
- `code-generator.md` - General code generation
- `test-generator.md` - Unit/integration tests
- `scaffold-generator.md` - Project scaffolding
- `migration-generator.md` - Migration scripts
- `documentation-generator.md` - Inline code documentation

### Documentation Creation
- `technical-writer.md` - High-quality technical prose
- `architecture-documenter.md` - Architecture decision records
- `api-documentation-generator.md` - API documentation
- `onboarding-guide-creator.md` - Onboarding documentation
- `changelog-generator.md` - Release changelogs

### Reporting
- `summary-reporter.md` - Executive summaries
- `metrics-reporter.md` - Performance metrics
- `coverage-reporter.md` - Test coverage reports
- `pr-reporter.md` - Pull request summaries
- `ci-reporter.md` - CI/CD status reports

---

## Usage Patterns

**Development Flow:**
```
code-generator → test-generator → documentation-generator
```

**Documentation Pipeline:**
```
architecture-documenter → api-documentation-generator → onboarding-guide-creator
```

**Reporting Chain:**
```
metrics-reporter + coverage-reporter → summary-reporter
```

---

## Migration from Old Structure

| Old Path | New Path |
|----------|----------|
| `generators/code-generator` | `generation/code-generator` |
| `documentation/technical-writer` | `generation/technical-writer` |
| `reporters/summary-reporter` | `generation/summary-reporter` |
