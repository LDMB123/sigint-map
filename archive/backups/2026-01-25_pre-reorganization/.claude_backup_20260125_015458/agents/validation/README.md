# Validation Agents

**Consolidated Category**: Validators + Guardians + Accuracy
**Total Agents**: 15
**Purpose**: All validation, quality checking, and compliance verification

---

## Category Consolidation

This category merges three previously separate categories:
- **validators/** - Schema, type, config validation
- **guardians/** - Security, compliance, quality guardians
- **accuracy/** - Output refinement, consistency checking

**Why consolidated?** All agents perform validation/verification tasks with similar patterns.

---

## Agent Types

### Schema & Type Validation
- `schema-validator.md` - JSON/API schema validation
- `type-validator.md` - TypeScript/type checking
- `config-validator.md` - Configuration validation

### Security & Compliance
- `security-validator.md` - Security vulnerability checks
- `security-guardian.md` - Security policy enforcement
- `compliance-guardian.md` - Regulatory compliance
- `accessibility-guardian.md` - WCAG/a11y compliance

### Dependency & Code Quality
- `dependency-validator.md` - Dependency security/compatibility
- `quality-guardian.md` - Code quality standards
- `performance-guardian.md` - Performance budgets

### Output Verification
- `first-pass-validator.md` - Initial output validation
- `output-refiner.md` - Output quality improvement
- `self-consistency-checker.md` - Internal consistency
- `confidence-scorer.md` - Confidence scoring
- `consensus-builder.md` - Multi-agent consensus

---

## Usage Patterns

**Sequential Validation:**
```
first-pass-validator → output-refiner → self-consistency-checker
```

**Parallel Validation:**
```
schema-validator + type-validator + security-validator → consensus-builder
```

**Guardian Pattern:**
```
Code Change → quality-guardian + security-guardian + performance-guardian
```

---

## Migration from Old Structure

If referencing old paths, use this mapping:

| Old Path | New Path |
|----------|----------|
| `validators/schema-validator` | `validation/schema-validator` |
| `guardians/security-guardian` | `validation/security-guardian` |
| `accuracy/output-refiner` | `validation/output-refiner` |
