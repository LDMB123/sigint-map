#!/bin/bash

# CI/CD Setup Script for DMB Almanac
# This script helps configure GitHub Actions and Vercel for CI/CD

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"

    if [ -n "$default" ]; then
        read -p "$(echo -e ${BLUE}$prompt${NC}) [$default]: " input
        eval "$var_name=\"${input:-$default}\""
    else
        read -p "$(echo -e ${BLUE}$prompt${NC}): " input
        eval "$var_name=\"$input\""
    fi
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
echo "║   DMB Almanac CI/CD Setup Script    ║"
echo "╔══════════════════════════════════════╗"
echo ""

# Check prerequisites
log_info "Checking prerequisites..."

# Check for GitHub CLI
if ! command -v gh &> /dev/null; then
    log_warning "GitHub CLI (gh) not found"
    log_info "Install from: https://cli.github.com/"
    log_info "Or continue with manual secret setup"
else
    log_success "GitHub CLI found"
fi

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    log_error "Vercel CLI not found"
    log_info "Install with: npm install -g vercel"
    exit 1
else
    log_success "Vercel CLI found"
fi

# Check for wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    log_warning "wasm-pack not found"
    log_info "Install from: https://rustwasm.github.io/wasm-pack/installer/"
fi

# Check for web-push CLI
if ! command -v npx &> /dev/null; then
    log_error "npm/npx not found"
    exit 1
fi

echo ""
log_success "Prerequisites check complete"
echo ""

# Setup mode selection
echo "Setup Mode:"
echo "1. Full setup (recommended for first-time setup)"
echo "2. Generate VAPID keys only"
echo "3. Configure GitHub secrets only"
echo "4. Configure Vercel only"
echo ""

read -p "Select mode (1-4): " -n 1 -r MODE
echo ""

case $MODE in
    1)
        FULL_SETUP=true
        SETUP_VAPID=true
        SETUP_GITHUB=true
        SETUP_VERCEL=true
        ;;
    2)
        FULL_SETUP=false
        SETUP_VAPID=true
        SETUP_GITHUB=false
        SETUP_VERCEL=false
        ;;
    3)
        FULL_SETUP=false
        SETUP_VAPID=false
        SETUP_GITHUB=true
        SETUP_VERCEL=false
        ;;
    4)
        FULL_SETUP=false
        SETUP_VAPID=false
        SETUP_GITHUB=false
        SETUP_VERCEL=true
        ;;
    *)
        log_error "Invalid selection"
        exit 1
        ;;
esac

# Generate VAPID keys
if [ "$SETUP_VAPID" = true ]; then
    echo ""
    log_info "Generating VAPID keys..."
    echo ""

    if confirm "Generate VAPID keys for all environments?"; then
        mkdir -p .secrets

        for env in preview staging production; do
            log_info "Generating VAPID keys for $env..."

            output=$(npx web-push generate-vapid-keys)
            public_key=$(echo "$output" | grep "Public Key:" | cut -d: -f2 | xargs)
            private_key=$(echo "$output" | grep "Private Key:" | cut -d: -f2 | xargs)

            # Save to temporary file
            cat > ".secrets/vapid-$env.txt" <<EOF
VITE_VAPID_PUBLIC_KEY=$public_key
VAPID_PRIVATE_KEY=$private_key
VAPID_SUBJECT=mailto:your-email@example.com
EOF

            log_success "VAPID keys for $env saved to .secrets/vapid-$env.txt"
        done

        log_warning "Remember to add these to GitHub Secrets and Vercel Environment Variables!"
        log_info "Files saved to .secrets/ directory (DO NOT commit these!)"
    fi
fi

# Configure GitHub Secrets
if [ "$SETUP_GITHUB" = true ]; then
    echo ""
    log_info "Configuring GitHub Secrets..."
    echo ""

    if ! command -v gh &> /dev/null; then
        log_warning "GitHub CLI not available - showing manual instructions"
        echo ""
        echo "Add these secrets in GitHub:"
        echo "https://github.com/USERNAME/REPO/settings/secrets/actions"
        echo ""
        echo "Required secrets:"
        echo "  - VERCEL_TOKEN"
        echo "  - VERCEL_ORG_ID"
        echo "  - VERCEL_PROJECT_ID"
        echo "  - VITE_VAPID_PUBLIC_KEY_PREVIEW"
        echo "  - VITE_VAPID_PUBLIC_KEY_STAGING"
        echo "  - VITE_VAPID_PUBLIC_KEY_PRODUCTION"
        echo "  - VAPID_PRIVATE_KEY_STAGING"
        echo "  - VAPID_PRIVATE_KEY_PRODUCTION"
        echo "  - VAPID_SUBJECT_STAGING"
        echo "  - VAPID_SUBJECT_PRODUCTION"
        echo "  - PUSH_API_KEY_STAGING"
        echo "  - PUSH_API_KEY_PRODUCTION"
        echo ""
    else
        if confirm "Configure GitHub Secrets automatically?"; then
            # Get Vercel credentials
            prompt_input "Enter VERCEL_TOKEN" VERCEL_TOKEN
            prompt_input "Enter VERCEL_ORG_ID" VERCEL_ORG_ID
            prompt_input "Enter VERCEL_PROJECT_ID" VERCEL_PROJECT_ID

            # Set Vercel secrets
            gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
            gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID"
            gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID"

            log_success "Vercel credentials added to GitHub Secrets"

            # VAPID keys
            if [ -f ".secrets/vapid-preview.txt" ]; then
                log_info "Loading VAPID keys from .secrets/"

                for env in preview staging production; do
                    source ".secrets/vapid-$env.txt"

                    ENV_UPPER=$(echo "$env" | tr '[:lower:]' '[:upper:]')

                    gh secret set "VITE_VAPID_PUBLIC_KEY_$ENV_UPPER" --body "$VITE_VAPID_PUBLIC_KEY"

                    if [ "$env" != "preview" ]; then
                        gh secret set "VAPID_PRIVATE_KEY_$ENV_UPPER" --body "$VAPID_PRIVATE_KEY"
                        gh secret set "VAPID_SUBJECT_$ENV_UPPER" --body "$VAPID_SUBJECT"
                    fi
                done

                log_success "VAPID keys added to GitHub Secrets"
            else
                log_warning "VAPID keys not found in .secrets/ - skipping"
            fi

            # Generate API keys
            log_info "Generating API keys..."

            STAGING_API_KEY=$(openssl rand -base64 32)
            PRODUCTION_API_KEY=$(openssl rand -base64 32)

            gh secret set PUSH_API_KEY_STAGING --body "$STAGING_API_KEY"
            gh secret set PUSH_API_KEY_PRODUCTION --body "$PRODUCTION_API_KEY"

            log_success "API keys generated and added to GitHub Secrets"
        fi
    fi
fi

# Configure Vercel
if [ "$SETUP_VERCEL" = true ]; then
    echo ""
    log_info "Configuring Vercel..."
    echo ""

    cd app

    if [ ! -f ".vercel/project.json" ]; then
        log_info "Linking Vercel project..."
        vercel link
    else
        log_success "Vercel project already linked"
    fi

    if confirm "Configure Vercel environment variables?"; then
        log_info "Adding environment variables to Vercel..."

        # Preview environment
        if [ -f "../.secrets/vapid-preview.txt" ]; then
            source "../.secrets/vapid-preview.txt"
            vercel env add VITE_VAPID_PUBLIC_KEY preview <<< "$VITE_VAPID_PUBLIC_KEY"
            log_success "Preview environment configured"
        fi

        # Staging environment
        if [ -f "../.secrets/vapid-staging.txt" ]; then
            source "../.secrets/vapid-staging.txt"
            vercel env add VITE_VAPID_PUBLIC_KEY preview <<< "$VITE_VAPID_PUBLIC_KEY"
            vercel env add VAPID_PRIVATE_KEY preview <<< "$VAPID_PRIVATE_KEY"
            vercel env add VAPID_SUBJECT preview <<< "$VAPID_SUBJECT"

            STAGING_API_KEY=$(openssl rand -base64 32)
            vercel env add PUSH_API_KEY preview <<< "$STAGING_API_KEY"

            log_success "Staging environment configured"
        fi

        # Production environment
        if [ -f "../.secrets/vapid-production.txt" ]; then
            source "../.secrets/vapid-production.txt"
            vercel env add VITE_VAPID_PUBLIC_KEY production <<< "$VITE_VAPID_PUBLIC_KEY"
            vercel env add VAPID_PRIVATE_KEY production <<< "$VAPID_PRIVATE_KEY"
            vercel env add VAPID_SUBJECT production <<< "$VAPID_SUBJECT"

            PRODUCTION_API_KEY=$(openssl rand -base64 32)
            vercel env add PUSH_API_KEY production <<< "$PRODUCTION_API_KEY"

            log_success "Production environment configured"
        fi
    fi

    cd ..
fi

# Final steps
echo ""
echo "╔══════════════════════════════════════╗"
echo "║        Setup Complete!               ║"
echo "╔══════════════════════════════════════╗"
echo ""

log_success "CI/CD setup completed successfully!"
echo ""

log_info "Next steps:"
echo "  1. Review generated secrets in .secrets/ directory"
echo "  2. Verify GitHub Secrets are configured"
echo "  3. Verify Vercel environment variables"
echo "  4. Test CI/CD by creating a pull request"
echo "  5. IMPORTANT: Delete .secrets/ directory after verification!"
echo ""

log_warning "Security reminder:"
echo "  • Never commit files in .secrets/ directory"
echo "  • Rotate VAPID keys every 90 days"
echo "  • Use strong, unique API keys"
echo "  • Enable 2FA on GitHub and Vercel accounts"
echo ""

log_info "Documentation:"
echo "  • CI/CD Guide: CI_CD_GUIDE.md"
echo "  • Deployment Checklist: DEPLOYMENT_CHECKLIST.md"
echo "  • Rollback Procedure: ROLLBACK_PROCEDURE.md"
echo ""

if [ -d ".secrets" ]; then
    log_warning "Remember to delete .secrets/ directory after setup:"
    echo "  rm -rf .secrets/"
fi

echo ""
log_success "Happy deploying! 🚀"
echo ""
