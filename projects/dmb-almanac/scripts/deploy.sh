#!/bin/bash

# DMB Almanac Deployment Script
# This script handles manual deployments with proper safety checks
# Usage: ./deploy.sh <environment> [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../app" && pwd)"
ENVIRONMENT="${1:-preview}"

# Functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️${NC}  $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

confirm() {
    local prompt="$1"
    read -p "$(echo -e ${YELLOW}$prompt${NC}) (y/N): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Print banner
echo ""
echo "╔══════════════════════════════════════╗"
echo "║   DMB Almanac Deployment Script     ║"
echo "╔══════════════════════════════════════╗"
echo ""

# Validate environment
case "$ENVIRONMENT" in
    preview|staging|production)
        log_info "Target environment: $ENVIRONMENT"
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT"
        log_info "Valid options: preview, staging, production"
        exit 1
        ;;
esac

# Check if in app directory
if [ ! -f "$APP_DIR/package.json" ]; then
    log_error "Cannot find app/package.json"
    exit 1
fi

cd "$APP_DIR"

# Safety check for production
if [ "$ENVIRONMENT" = "production" ]; then
    log_warning "PRODUCTION DEPLOYMENT REQUESTED"
    echo ""
    log_info "This will deploy to the live production environment!"
    echo ""

    if ! confirm "Are you sure you want to deploy to PRODUCTION?"; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Check Git status
log_info "Checking Git status..."

if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    log_warning "You have uncommitted changes!"
    git status --short

    if ! confirm "Continue with uncommitted changes?"; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log_info "Current branch: $CURRENT_BRANCH"

if [ "$ENVIRONMENT" = "production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    log_error "Production deployments must be from 'main' branch"
    log_info "Current branch: $CURRENT_BRANCH"

    if ! confirm "Deploy from non-main branch anyway? (NOT RECOMMENDED)"; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Check for Vercel CLI
log_info "Checking for Vercel CLI..."

if ! command -v vercel &> /dev/null; then
    log_error "Vercel CLI not found"
    log_info "Install with: npm install -g vercel"
    exit 1
fi

log_success "Vercel CLI found"

# Check for wasm-pack
log_info "Checking for wasm-pack..."

if ! command -v wasm-pack &> /dev/null; then
    log_error "wasm-pack not found"
    log_info "Install from: https://rustwasm.github.io/wasm-pack/installer/"
    exit 1
fi

log_success "wasm-pack found"

# Install dependencies
log_info "Installing dependencies..."
npm ci --silent

log_success "Dependencies installed"

# Validate environment variables
log_info "Validating environment variables..."

if ! bash "$SCRIPT_DIR/validate-env.sh" "$ENVIRONMENT"; then
    log_error "Environment validation failed"

    if ! confirm "Continue anyway? (NOT RECOMMENDED)"; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Build WASM modules
log_info "Building WASM modules..."
npm run wasm:build

log_success "WASM modules built"

# Run tests (skip for preview)
if [ "$ENVIRONMENT" != "preview" ]; then
    log_info "Running tests..."

    if ! npm test -- --run --silent; then
        log_error "Tests failed"

        if ! confirm "Deploy despite test failures? (NOT RECOMMENDED)"; then
            log_info "Deployment cancelled"
            exit 0
        fi
    else
        log_success "Tests passed"
    fi
fi

# Type check
log_info "Running type check..."

if ! npm run check; then
    log_error "Type check failed"

    if ! confirm "Deploy despite type errors? (NOT RECOMMENDED)"; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

log_success "Type check passed"

# Lint check
log_info "Running linter..."

if ! npm run lint; then
    log_warning "Linting failed"

    if ! confirm "Continue anyway?"; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

log_success "Linting passed"

# Build project
log_info "Building project..."

if [ "$ENVIRONMENT" = "production" ]; then
    vercel build --prod
else
    vercel build
fi

log_success "Build completed"

# Deploy
log_info "Deploying to Vercel..."

if [ "$ENVIRONMENT" = "production" ]; then
    DEPLOY_URL=$(vercel deploy --prebuilt --prod)
else
    DEPLOY_URL=$(vercel deploy --prebuilt)
fi

log_success "Deployment successful!"
echo ""
echo "╔══════════════════════════════════════╗"
echo "║        Deployment Complete           ║"
echo "╔══════════════════════════════════════╗"
echo ""
log_info "Environment: $ENVIRONMENT"
log_info "URL: $DEPLOY_URL"
echo ""

# Post-deployment checks
log_info "Running post-deployment health check..."
sleep 5

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL")

if [ "$HTTP_STATUS" = "200" ]; then
    log_success "Health check passed (HTTP $HTTP_STATUS)"
else
    log_error "Health check failed (HTTP $HTTP_STATUS)"
    log_warning "Please investigate the deployment"
fi

echo ""
log_success "Deployment script completed"
echo ""

# Save deployment record
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
COMMIT=$(git rev-parse HEAD)
VERSION=$(cat package.json | grep version | head -1 | cut -d '"' -f 4)

mkdir -p ../deployments

cat > "../deployments/${ENVIRONMENT}-latest.json" <<EOF
{
  "environment": "$ENVIRONMENT",
  "url": "$DEPLOY_URL",
  "commit": "$COMMIT",
  "branch": "$CURRENT_BRANCH",
  "timestamp": "$TIMESTAMP",
  "version": "$VERSION",
  "deployed_by": "$(whoami)"
}
EOF

log_info "Deployment record saved to deployments/${ENVIRONMENT}-latest.json"

# Next steps
echo ""
log_info "Next steps:"
echo "  1. Monitor error rates in your monitoring dashboard"
echo "  2. Check performance metrics"
echo "  3. Verify critical user flows"
echo "  4. If issues detected, run rollback: ./scripts/rollback.sh $ENVIRONMENT"
echo ""
