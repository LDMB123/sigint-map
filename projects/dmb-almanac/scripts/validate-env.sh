#!/bin/bash

# Environment variable validation script
# Usage: ./validate-env.sh <environment>
# Where environment is: preview, staging, or production

set -e

ENVIRONMENT="${1:-preview}"

echo "Validating environment variables for: $ENVIRONMENT"
echo "================================================"

ERRORS=0
WARNINGS=0

# Function to check required variable
check_required() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo "❌ ERROR: Required variable $var_name is not set"
        ERRORS=$((ERRORS + 1))
        return 1
    else
        echo "✅ $var_name is set"
        return 0
    fi
}

# Function to check optional variable
check_optional() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo "⚠️  WARNING: Optional variable $var_name is not set"
        WARNINGS=$((WARNINGS + 1))
        return 1
    else
        echo "✅ $var_name is set"
        return 0
    fi
}

# Function to validate VAPID key format
validate_vapid_key() {
    local key_name=$1
    local key_value=${!key_name}

    if [ -z "$key_value" ]; then
        echo "❌ ERROR: $key_name is not set"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    # VAPID keys should be base64url encoded and ~87 characters
    key_length=${#key_value}

    if [ "$key_length" -lt 80 ] || [ "$key_length" -gt 100 ]; then
        echo "⚠️  WARNING: $key_name has unexpected length ($key_length chars)"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "✅ $key_name format looks valid"
    fi
}

# Function to validate email format
validate_email() {
    local var_name=$1
    local email=${!var_name}

    if [ -z "$email" ]; then
        echo "❌ ERROR: $var_name is not set"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    if [[ ! "$email" =~ ^mailto:.+@.+\..+ ]]; then
        echo "❌ ERROR: $var_name must be in format 'mailto:email@example.com'"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    echo "✅ $var_name format is valid"
}

# Function to validate URL format
validate_url() {
    local var_name=$1
    local url=${!var_name}

    if [ -z "$url" ]; then
        echo "❌ ERROR: $var_name is not set"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    if [[ ! "$url" =~ ^https?:// ]]; then
        echo "❌ ERROR: $var_name must start with http:// or https://"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    echo "✅ $var_name format is valid"
}

echo ""
echo "Checking VAPID configuration..."
echo "--------------------------------"

# VAPID keys are required for all environments
validate_vapid_key "VITE_VAPID_PUBLIC_KEY"

# Private keys only needed on server (CI environment)
if [ "$CI" = "true" ]; then
    if [ "$ENVIRONMENT" = "production" ]; then
        validate_vapid_key "VAPID_PRIVATE_KEY"
        validate_email "VAPID_SUBJECT"
    fi
fi

echo ""
echo "Checking API configuration..."
echo "-----------------------------"

# API key validation (server-side only)
if [ "$CI" = "true" ] && [ "$ENVIRONMENT" = "production" ]; then
    check_required "PUSH_API_KEY"

    # Check API key strength
    if [ -n "$PUSH_API_KEY" ]; then
        key_length=${#PUSH_API_KEY}
        if [ "$key_length" -lt 32 ]; then
            echo "⚠️  WARNING: PUSH_API_KEY should be at least 32 characters"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
fi

echo ""
echo "Checking site configuration..."
echo "------------------------------"

validate_url "PUBLIC_SITE_URL"

# Verify PUBLIC_SITE_URL matches environment
case "$ENVIRONMENT" in
    preview)
        if [[ ! "$PUBLIC_SITE_URL" =~ preview ]]; then
            echo "⚠️  WARNING: PUBLIC_SITE_URL should contain 'preview' for preview environment"
            WARNINGS=$((WARNINGS + 1))
        fi
        ;;
    staging)
        if [[ ! "$PUBLIC_SITE_URL" =~ staging ]]; then
            echo "⚠️  WARNING: PUBLIC_SITE_URL should contain 'staging' for staging environment"
            WARNINGS=$((WARNINGS + 1))
        fi
        ;;
    production)
        if [[ "$PUBLIC_SITE_URL" =~ (preview|staging) ]]; then
            echo "❌ ERROR: PUBLIC_SITE_URL should not contain 'preview' or 'staging' for production"
            ERRORS=$((ERRORS + 1))
        fi
        ;;
esac

echo ""
echo "Checking optional analytics..."
echo "------------------------------"

check_optional "VITE_GA_MEASUREMENT_ID" || true
check_optional "VITE_SENTRY_DSN" || true

echo ""
echo "================================"
echo "Validation Summary"
echo "================================"
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo "❌ Validation FAILED - please fix errors above"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️  Validation PASSED with warnings"
    exit 0
else
    echo "✅ Validation PASSED - all checks successful"
    exit 0
fi
