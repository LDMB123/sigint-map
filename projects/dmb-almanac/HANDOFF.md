# Handoff Notes

## Snapshot

- Branch: `codex/dmb-almanac-handoff-20260215`
- Base handoff commit: `eaed5c67`
- Workspace scope: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

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
