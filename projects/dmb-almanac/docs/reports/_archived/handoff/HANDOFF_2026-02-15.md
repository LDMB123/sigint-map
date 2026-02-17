# Handoff Notes

## Snapshot

- Branch: `codex/dmb-almanac-handoff-20260215`
- Current handoff commit: `c928bd74`
- Workspace scope: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

## Verification Stamp (2026-02-15)

Latest full validation run on `c928bd74`:

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac
cd rust && cargo fmt --all --check
cd rust && cargo clippy --workspace --all-targets -- -D warnings
cd rust && cargo test --workspace
cd e2e && RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

Result: all checks passed (`23` Playwright tests passed).

## Canonical Docs

- Status: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/STATUS.md`
- Minimal context: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/CONTEXT.md`
- Docs index: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/docs/INDEX.md`
- Scripts index: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/scripts/README.md`

## Required Preflight

Run before making changes:

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac
bash scripts/pristine-check.sh
```

Optional extended check:

```bash
bash scripts/pristine-check.sh --with-disk-budget
```

## Scope Rules For New Agent Sessions

- Start session in: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`
- Only modify files under this path.
- Ignore sibling projects unless explicitly instructed.

## Git Remote Note

Current parent git repo has no `origin` remote configured, so branch push is currently unavailable.
