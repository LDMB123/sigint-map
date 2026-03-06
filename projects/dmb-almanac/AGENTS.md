# AGENTS.md

Scope: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

This project should be treated as a self-contained app workspace even though it lives inside a larger personal superproject.

## Project Boundary

- Primary project root for all app work: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`
- Do not read from, modify, or reason about sibling projects under `/Users/louisherman/ClaudeCodeProjects/projects/` unless the user explicitly asks.
- Do not use unrelated superproject branches, stashes, archive tags, or untracked sibling directories as context for this app.
- If git commands reveal the parent repo root (`/Users/louisherman/ClaudeCodeProjects`), still keep code, docs, and operational decisions scoped to `projects/dmb-almanac`.

## Canonical Current State

- Source of truth for repo/runtime state: `STATUS.md`
- Project entry docs: `README.md`, `CONTEXT.md`, `docs/README.md`, `docs/INDEX.md`
- Runtime architecture: `rust/README.md`, `docs/wasm/WASM_REFERENCE.md`, `docs/gpu/GPU_REFERENCE.md`

## Current Architecture

- The active app is Rust-first.
- UI/runtime lives in `rust/` (`dmb_app`, `dmb_server`, `dmb_idb`, `dmb_pipeline`, `dmb_wasm`).
- Older Svelte/SvelteKit/Dexie-era descriptions are historical only unless explicitly archived and labeled as such.

## Repo Hygiene Rules

- Keep repository root minimal: only active app entry docs and configs belong there.
- Treat `.claude/`, `.codex/`, and similar assistant metadata as local-only and never commit them.
- Archive obsolete docs under `docs/reports/_archived/` instead of leaving them in active paths.
- Prefer app-local references over parent-repo context when writing docs, plans, or commit messages.
