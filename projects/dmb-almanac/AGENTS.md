# AGENTS.md

Scope: this repository root

This project should be treated as a self-contained app workspace.

## Project Boundary

- Primary project root for all app work: this folder.
- Do not read from, modify, or reason about sibling directories next to this folder unless the user explicitly asks.
- Do not use unrelated parent-workspace branches, stashes, archive tags, or untracked directories as context for this app.
- If git commands reveal a broader parent repo root, still keep code, docs, and operational decisions scoped to this folder.

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
