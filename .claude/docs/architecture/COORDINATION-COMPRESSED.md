# Coordination Standards (Compressed)

> **Original**: COORDINATION.md (~878 lines) | **Compressed**: ~120 lines | **Ratio**: ~86% | **Date**: 2026-02-02
> See original for full examples and Context Pack templates.

---

## I. Capability Lanes

| Lane | Purpose | Model | Manual? | Triggers |
|------|---------|-------|---------|----------|
| 1. Explore & Index | Read-only codebase analysis | `haiku` | No | "where/what/find/analyze" |
| 2. Design & Plan | Architecture, tradeoffs, plans | `opus`/`opusplan` | No | "should I/design/plan" |
| 3. Implement | Code changes, refactors, fixes | `sonnet` | No | "implement/add/refactor/fix" |
| 4. Review & Security | Code review, security audit | `opus` | No | "review/audit/check" |
| 5. QA & Verify | Testing, validation, coverage | `sonnet` | No | "test/verify/reproduce" |
| 6. Release & Ops | Commits, PRs, deploys | `sonnet` | **YES** | Explicit user request only |

**Lane boundaries**: Each lane has explicit out-of-scope. No lane implements + tests; no lane reviews + fixes.

### Key Agents by Lane
- **L1**: `architecture-analyzer`, `dependency-analyzer`, `complexity-analyzer`
- **L2**: `system-architect`, `rust-project-architect`, `sveltekit-orchestrator`, domain architects
- **L3**: `sveltekit-engineer`, `rust-semantics-engineer`, `pwa-engineer`, `code-refactorer`
- **L4**: `code-reviewer`, `security-scanner`, `rust-safety-auditor`, `threat-modeler`
- **L5**: `unit-test-generator`, `e2e-test-generator`, `sveltekit-qa-engineer`, `rust-qa-engineer`
- **L6**: No agents (manual-only skills: `/commit`, `/pr-review`, `/deploy`, `/release-manager`)

### Sub-Lanes (24 specialized domains)
Categories: DMB Analysis, Agent Infrastructure, Meta/Orchestration, Code Quality, Debugging, DevOps, Frontend, Performance (optimization + diagnostics), Reliability, Monitoring, Apple/macOS, Google APIs, E-commerce, Live Events, Marketing, Business/Ops, ML/AI, Data Engineering, Backend, Security Validation, Design/Creative, Content Tools, Product Management.

- Inherit model tiers from parent lane with domain overrides
- Used for routing specialized requests to domain experts

---

## II. Handoff Contract ("Context Pack")

**Required sections** for all agent/skill output:

1. **Summary** - 3-6 bullets
2. **Findings** - With `file:line` refs, grouped by severity
3. **Proposed Actions** - Ordered, with severity tags (HIGH/MEDIUM/VERIFY)
4. **Verification** - Bash commands to validate
5. **Risks/Assumptions** - Dependencies, assumptions, potential issues

---

## III. Skill Output Contract

- **Inline skills**: Execute in main session, return Context Pack sections
- **Fork-context skills**: Spawn dedicated agent subprocess
  - Frontmatter: `context: fork`, `agent: <name>`, `model: inherit`
  - Agent receives skill content as instructions, returns Context Pack

---

## IV. Skills in Subagents

**Critical**: Subagents do NOT inherit skills from main session.

| Method | How | When |
|--------|-----|------|
| **Preload** | `skills:` list in agent frontmatter | Agent needs multiple related skills |
| **Dynamic** | Pass skill content in Task | One-off usage |
| **Read Tool** | Agent reads skill file on demand | Conditional usage |

---

## V. Orchestrator Coordination

**Hierarchy**: User → Main Session (Sonnet) → Routing → Lane agents

### Domain Orchestrators (all Opus)
- **Rust**: `rust-lead-orchestrator` → architect(O), engineer(S), auditor(O), qa(S), coordinator(H)
- **WASM**: `wasm-lead-orchestrator` → compiler(S), optimizer(O), testing(S), interop(S)
- **SvelteKit**: `sveltekit-orchestrator` → engineer(S), pwa(S), perf(O), qa(S)

### Delegation Rules
- Orchestrator → Specialist: OK
- Specialist → Orchestrator: **NEVER** (creates loops)
- Specialist → Specialist: Only via orchestrator

---

## VI. Scope Precedence

**Project > User > Built-in** (higher precedence shadows lower)

- **User-level** (`~/.claude/`): Cross-project, reusable (Web APIs, Chromium, a11y, general tools)
- **Project-level** (`projects/<name>/.claude/`): Domain-specific agents/skills/customizations

Rule: Multi-project useful → user-level. Domain-specific → project-level.

---

## VII. Side-Effect Safety

Lane 6 skills require: `manual-only: true`, `confirmation-required: true`
- Can NEVER auto-invoke
- Must prompt for confirmation before executing

---

## VIII. Maintenance Checklists

**New Agent**: Assign lane → Choose model → Define scope → Document Context Pack → Add to orchestrator → Check name conflicts → Test delegation

**New Skill**: Decide scope (user/project) → If fork, specify agent → Set model (`inherit`) → If side-effectful, `manual-only: true` → Check name conflicts

**Deprecation**: Mark `deprecated: true` → Add notice → Update orchestrators → Delete after 30 days

---

## IX. Troubleshooting

| Problem | Debug | Fix |
|---------|-------|-----|
| Wrong agent invoked | Check duplicate names, scope precedence | Rename/delete lower-precedence duplicate |
| Skill not found in agent | Check agent `skills:` list, verify skill path exists | Add to `skills:` or use Read tool |
| Context cost too high | Run redundancy analysis | Deduplicate, compress, lazy load |

---

## X. Model Policy Summary

- Scan/Index → `haiku` | Code/Refactor → `sonnet` | Reasoning/Arch → `opus` | Mixed → `opusplan`
- **Never use** `default` (ambiguous)
- See `MODEL_POLICY.md` for full details
