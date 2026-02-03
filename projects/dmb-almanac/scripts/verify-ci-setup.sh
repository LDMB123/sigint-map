#!/bin/bash

# CI/CD Setup Verification Script
# Validates that all CI/CD components are properly configured

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️${NC}  $1"
    WARNINGS=$((WARNINGS + 1))
}

log_error() {
    echo -e "${RED}❌${NC} $1"
    ERRORS=$((ERRORS + 1))
}

check_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        log_success "$description exists: $file"
        return 0
    else
        log_error "$description missing: $file"
        return 1
    fi
}

check_executable() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        if [ -x "$file" ]; then
            log_success "$description is executable: $file"
            return 0
        else
            log_warning "$description not executable: $file"
            return 1
        fi
    else
        log_error "$description missing: $file"
        return 1
    fi
}

check_command() {
    local cmd=$1
    local description=$2

    if command -v "$cmd" &> /dev/null; then
        local version=$($cmd --version 2>&1 | head -1 || echo "unknown")
        log_success "$description installed: $version"
        return 0
    else
        log_warning "$description not found: $cmd"
        return 1
    fi
}

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   CI/CD Setup Verification          ║"
echo "╔══════════════════════════════════════╗"
echo ""

# Check directory structure
log_info "Checking directory structure..."
echo ""

check_file ".github/workflows/ci.yml" "CI workflow"
check_file ".github/workflows/deploy-preview.yml" "Preview deployment workflow"
check_file ".github/workflows/deploy-staging.yml" "Staging deployment workflow"
check_file ".github/workflows/deploy-production.yml" "Production deployment workflow"
check_file ".github/workflows/rollback.yml" "Rollback workflow"
# .github/README.md removed during project consolidation

echo ""
check_file "scripts/validate-env.sh" "Environment validation script"
check_file "scripts/deploy.sh" "Deployment script"
check_file "scripts/setup-ci.sh" "Setup script"

echo ""
check_file "lighthouserc.json" "Lighthouse CI config"
check_file "app/playwright.config.js" "Playwright config"
check_file "app/tests/e2e/smoke.spec.js" "Smoke tests"

echo ""
# CI/CD docs consolidated into docs/ during project cleanup

# Check script executability
echo ""
log_info "Checking script permissions..."
echo ""

check_executable "scripts/validate-env.sh" "Environment validation script"
check_executable "scripts/deploy.sh" "Deployment script"
check_executable "scripts/setup-ci.sh" "Setup script"

# Check prerequisites
echo ""
log_info "Checking prerequisites..."
echo ""

check_command "node" "Node.js" || true
check_command "npm" "npm" || true
check_command "git" "Git" || true
check_command "gh" "GitHub CLI (optional)" || true
check_command "vercel" "Vercel CLI" || true
check_command "wasm-pack" "wasm-pack" || true
check_command "rustc" "Rust compiler" || true
check_command "cargo" "Cargo" || true

# Check package.json scripts
echo ""
log_info "Checking package.json scripts..."
echo ""

cd app

if [ -f "package.json" ]; then
    if grep -q '"test:e2e"' package.json; then
        log_success "E2E test script configured"
    else
        log_error "E2E test script missing in package.json"
    fi

    if grep -q '"test:e2e:smoke"' package.json; then
        log_success "Smoke test script configured"
    else
        log_error "Smoke test script missing in package.json"
    fi

    if grep -q '@playwright/test' package.json; then
        log_success "Playwright dependency found"
    else
        log_error "Playwright dependency missing"
    fi
else
    log_error "package.json not found in app/"
fi

cd ..

# Check Git repository
echo ""
log_info "Checking Git repository..."
echo ""

if [ -d ".git" ]; then
    log_success "Git repository initialized"

    # Check if GitHub remote exists
    if git remote get-url origin &> /dev/null; then
        REMOTE=$(git remote get-url origin)
        log_success "GitHub remote configured: $REMOTE"
    else
        log_warning "GitHub remote not configured"
    fi

    # Check current branch
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    log_info "Current branch: $BRANCH"
else
    log_error "Not a Git repository"
fi

# Check for .env.example
echo ""
log_info "Checking environment configuration..."
echo ""

if [ -f "app/.env.example" ]; then
    log_success ".env.example found"

    # Check for required env vars in example
    if grep -q "VITE_VAPID_PUBLIC_KEY" app/.env.example; then
        log_success "VAPID public key template found"
    else
        log_warning "VAPID public key missing from .env.example"
    fi

    if grep -q "VAPID_PRIVATE_KEY" app/.env.example; then
        log_success "VAPID private key template found"
    else
        log_warning "VAPID private key missing from .env.example"
    fi
else
    log_error ".env.example not found"
fi

# Check Vercel configuration
echo ""
log_info "Checking Vercel configuration..."
echo ""

if [ -f "app/.vercel/project.json" ]; then
    log_success "Vercel project linked"
    PROJECT_ID=$(cat app/.vercel/project.json | grep projectId | cut -d'"' -f4)
    log_info "Project ID: $PROJECT_ID"
else
    log_warning "Vercel project not linked (run: cd app && vercel link)"
fi

# Check GitHub Actions workflows syntax (basic)
echo ""
log_info "Checking workflow syntax..."
echo ""

for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        # Basic YAML syntax check
        if grep -q "^on:" "$workflow" && grep -q "^jobs:" "$workflow"; then
            log_success "$(basename $workflow) has valid structure"
        else
            log_error "$(basename $workflow) may have syntax issues"
        fi
    fi
done

# Check for common issues
echo ""
log_info "Checking for common issues..."
echo ""

# Check for secrets in code
if grep -r "VAPID_PRIVATE_KEY\s*=\s*['\"]B" app/src/ 2>/dev/null; then
    log_error "Potential hardcoded VAPID private key found in source!"
else
    log_success "No hardcoded secrets found in source"
fi

# Check for node_modules
if [ -d "app/node_modules" ]; then
    log_success "Dependencies installed in app/"
else
    log_warning "Dependencies not installed (run: cd app && npm ci)"
fi

# Check for WASM build output
if [ -d "app/wasm/dmb-transform/pkg" ]; then
    log_success "WASM modules appear to be built"
else
    log_warning "WASM modules not built (run: cd app && npm run wasm:build)"
fi

# Summary
echo ""
echo "╔══════════════════════════════════════╗"
echo "║        Verification Summary          ║"
echo "╔══════════════════════════════════════╗"
echo ""

echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    log_success "All checks passed! CI/CD is ready to use."
    echo ""
    log_info "Next steps:"
    echo "  1. Configure GitHub Secrets"
    echo "  2. Create a test PR to verify CI workflow"
    echo "  3. Deploy to staging"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    log_warning "Setup complete with warnings. Review warnings above."
    echo ""
    log_info "Next steps:"
    echo "  1. Address warnings (optional)"
    echo "  2. Configure GitHub Secrets"
    echo "  3. Create a test PR to verify CI workflow"
    echo ""
    exit 0
else
    log_error "Setup has errors that need to be fixed."
    echo ""
    log_info "Please fix the errors above and run this script again."
    echo ""
    exit 1
fi
