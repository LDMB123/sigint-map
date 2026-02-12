#!/bin/bash

# CI/CD Setup Verification Script (Rust-first)
#
# This script verifies the Rust-first cutover gates are wired and that the
# Rust-only E2E harness exists.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

log_info() { echo -e "${BLUE}info${NC} $1"; }
log_success() { echo -e "${GREEN}ok${NC}   $1"; }
log_warning() { echo -e "${YELLOW}warn${NC} $1"; WARNINGS=$((WARNINGS + 1)); }
log_error() { echo -e "${RED}err${NC}  $1"; ERRORS=$((ERRORS + 1)); }

check_file() {
  local file="$1"
  local description="$2"
  if [ -f "$file" ]; then
    log_success "$description: $file"
  else
    log_error "$description missing: $file"
  fi
}

check_executable() {
  local file="$1"
  local description="$2"
  if [ -f "$file" ] && [ -x "$file" ]; then
    log_success "$description executable: $file"
  elif [ -f "$file" ]; then
    log_warning "$description not executable: $file"
  else
    log_error "$description missing: $file"
  fi
}

check_command() {
  local cmd="$1"
  local description="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    log_success "$description found: $cmd"
  else
    log_warning "$description not found: $cmd"
  fi
}

echo ""
echo "=== CI Setup Verification (Rust-first) ==="
echo ""

log_info "Checking required workflows..."
check_file ".github/workflows/rust-ci.yml" "Rust CI workflow"
check_file ".github/workflows/cutover-rehearsal.yml" "Cutover rehearsal workflow"
check_file ".github/workflows/cutover-remote-e2e.yml" "Cutover remote E2E workflow"

echo ""
log_info "Checking required scripts..."
check_executable "scripts/cutover-rehearsal.sh" "Cutover rehearsal script"
check_executable "scripts/cutover-remote-e2e.sh" "Cutover remote E2E script"

echo ""
log_info "Checking Rust-only E2E harness..."
check_file "e2e/package.json" "E2E package manifest"
check_file "e2e/playwright.config.js" "Playwright config"

echo ""
log_info "Checking canonical seed data..."
check_file "data/static-data/index.json" "Static data index"
check_file "data/static-data/bundle.json" "Static data bundle"

echo ""
log_info "Checking toolchain availability..."
check_command "node" "Node.js"
check_command "npm" "npm"
check_command "rustc" "Rust"
check_command "cargo" "Cargo"

echo ""
if [ "$ERRORS" -ne 0 ]; then
  log_error "Verification failed with $ERRORS error(s) and $WARNINGS warning(s)."
  exit 1
fi

log_success "Verification passed with $WARNINGS warning(s)."
