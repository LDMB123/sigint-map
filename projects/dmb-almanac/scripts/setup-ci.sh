#!/bin/bash

# CI setup helper (Rust-first).
#
# This repo is Rust-first and local-only; CI is GitHub Actions-driven.
#
# Today, CI is configured via GitHub Actions workflows under `.github/workflows/`.
# If you need to validate locally, run:
#   - bash scripts/cutover-rehearsal.sh
#
# This script is intentionally minimal and non-interactive.

set -euo pipefail

echo "Rust-first CI is defined in .github/workflows/."
echo "Local validation:"
echo "  bash scripts/cutover-rehearsal.sh"
