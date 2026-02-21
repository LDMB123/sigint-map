# Security Advisory Dispositions

Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

This document records temporary advisory dispositions that are accepted for release with explicit ownership and revalidation dates.

## Active Dispositions

| Advisory | Dependency Path | Status | Owner | Opened | Review By | Rationale | Mitigation |
|---|---|---|---|---|---|---|---|
| `RUSTSEC-2024-0436` | `paste` (transitive via Leptos stack) | TEMPORARY_ALLOW | `dmb-core-engineering` | 2026-02-21 | 2026-06-30 | Advisory is unmaintained-notice only; no known CVE exploit path currently reported for this dependency path in DMB runtime usage. | Enforced by `scripts/security-audit.sh` with expiry gate; remove allow after upstream replacement/upgrade path lands. |

## Enforcement

- Local: `bash scripts/security-audit.sh`
- CI: Rust pipeline workflow runs `scripts/security-audit.sh` and fails on:
  - new warnings/advisories,
  - expired temporary advisory allow.
