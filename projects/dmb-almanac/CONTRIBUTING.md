# Contributing

## Development Workflow

1. Start from repo root: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`.
2. Make focused changes by domain (app, pipeline, docs, ops).
3. Run relevant quality gates before opening a PR.

## Quality Gates

Reference: `docs/guides/QUALITY_ASSURANCE_STRATEGY.md`

### Full Gate (recommended)

```bash
bash scripts/cutover-rehearsal.sh
```

### Rust Verification

```bash
cd rust
cargo run -p xtask -- verify
```

### Docs + Hygiene

```bash
python3 scripts/check-doc-integrity.py
bash scripts/check-repo-hygiene.sh
```

### Pristine Gate (fast)

```bash
bash scripts/pristine-check.sh
```

### Token Context Report (docs-heavy changes)

```bash
python3 scripts/token-context-report.py --budget 12000
```

### Remote E2E (running target env)

```bash
BASE_URL=https://your-env bash scripts/cutover-remote-e2e.sh
```

## Project Conventions

- Keep changes scoped and reviewable.
- Prefer Rust-first paths and docs; avoid reintroducing removed legacy UI paths.
- Update docs when behavior, commands, or architecture changes.
- Avoid committing generated artifacts:
  - `rust/target/`
  - `rust/static/pkg/`
  - `rust/static/data/`
  - `rust/data/raw/`
  - Playwright reports and local logs

## Documentation Standards

When editing docs:

- Start with user goal and working command example.
- Keep commands copy-pasteable.
- Prefer short sections and stable headings.
- Link related runbooks instead of duplicating long procedures.

## Pull Request Checklist

- [ ] Scope is focused and coherent.
- [ ] Tests/checks relevant to the change pass.
- [ ] Docs are updated for changed behavior.
- [ ] No generated/local artifact files were added.
- [ ] Docs/hygiene checks pass for doc or structure changes.
- [ ] `bash scripts/pristine-check.sh` passes.
