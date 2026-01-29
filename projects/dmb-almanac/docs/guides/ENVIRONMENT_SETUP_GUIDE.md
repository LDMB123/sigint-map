# DMB Almanac - Environment Setup Guide

**Purpose**: Step-by-step guide for configuring environment variables for all deployment environments
**Version**: 1.0
**Last Updated**: 2026-01-25

---

## Table of Contents

1. [Overview](#overview)
2. [Required Variables](#required-variables)
3. [Optional Variables](#optional-variables)
4. [Environment-Specific Configuration](#environment-specific-configuration)
5. [Generation Commands](#generation-commands)
6. [Validation](#validation)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The DMB Almanac application requires specific environment variables to function correctly. This guide covers setup for:

- **Local Development**: `.env.local`
- **Staging**: Platform environment variables
- **Production**: Platform environment variables

### Critical Discovery

**IMPORTANT**: The application has an environment validation function that is NOT currently called at startup. This must be fixed before production deployment.

**File**: `src/lib/config/env.ts`
**Issue**: `validateServerEnvironment()` is defined but never executed
**Impact**: Missing environment variables won't be detected until runtime failures occur

**Fix Required** (see [Validation](#validation) section):
```typescript
// In src/hooks.server.ts
import { validateServerEnvironment } from '$lib/config/env';

if (building === false) {
  validateServerEnvironment();
}
```

---

## Required Variables

These variables **MUST** be set in all environments (dev, staging, production).

### 1. VAPID Keys (Web Push Notifications)

**Purpose**: Enable browser push notifications
**Format**: Base64-encoded strings
**Security**: Public key is client-safe; private key is server-only

```bash
VAPID_PUBLIC_KEY="<base64-public-key>"
VAPID_PRIVATE_KEY="<base64-private-key>"
VAPID_SUBJECT="mailto:admin@dmbalmanac.com"
```

**How to Generate**:
```bash
npx web-push generate-vapid-keys

# Output:
# =======================================
#
# Public Key:
# BEl62iUYg...  (copy to VAPID_PUBLIC_KEY)
#
# Private Key:
# vE24a8tP...   (copy to VAPID_PRIVATE_KEY)
#
# =======================================
```

**Usage**:
- Public key: Exposed to client-side JavaScript (safe)
- Private key: Server-only, used to sign push notifications
- Subject: Contact email for push service issues

**Validation**:
- Both keys must be base64 strings
- Typically 87 characters for public, 43 for private
- Subject must be `mailto:` or `https://` URL

**Rotation Policy**:
- Rotate annually or if compromised
- Coordinate rotation: Generate new keys, deploy with both old and new, then remove old

### 2. Push API Key

**Purpose**: Authenticate server-to-server push notification sends
**Format**: Secure random string, minimum 32 characters
**Security**: Server-only, never expose to client

```bash
PUSH_API_KEY="<secure-random-string>"
```

**How to Generate**:
```bash
# Generate 32-byte random string, base64 encoded
openssl rand -base64 32

# Output: (example)
# A3f9Kl2pQ... (copy to PUSH_API_KEY)
```

**Usage**:
- Used in `Authorization: Bearer <PUSH_API_KEY>` header
- Validates requests to `/api/push-send`
- Should be unique per environment

**Validation**:
- Minimum 32 characters
- High entropy (random, not guessable)
- Different value per environment

**Rotation Policy**:
- **CRITICAL FINDING**: No rotation policy currently documented
- **Recommendation**: Rotate quarterly
- **Process**: Generate new key, update environment variable, deploy, invalidate old key

### 3. Public Site URL

**Purpose**: Base URL for the application
**Format**: Full HTTPS URL (no trailing slash)
**Security**: Public, client-safe

```bash
PUBLIC_SITE_URL="https://dmbalmanac.com"
```

**Environment-Specific Values**:
- **Local**: `http://localhost:5173` or `http://localhost:4173`
- **Staging**: `https://staging.dmbalmanac.com`
- **Production**: `https://dmbalmanac.com`

**Usage**:
- OG meta tags
- Push notification action URLs
- Web Share Target
- Protocol handlers

**Critical Issue**:
- **FINDING**: Variable is named `PUBLIC_SITE_URL` but accessed via `import.meta.env.PUBLIC_SITE_URL`
- **Problem**: Vite requires `VITE_` prefix for client-side env vars OR they must be defined as `PUBLIC_*` in config
- **Current Status**: May not be working as expected
- **Fix Options**:
  1. Rename to `VITE_PUBLIC_SITE_URL` in all environments
  2. Or configure in `svelte.config.js` to expose `PUBLIC_*` vars
  3. Or use server-only and pass to client via `+layout.server.ts`

---

## Optional Variables

These variables enhance functionality but are not required for basic operation.

### 1. Service Worker Development Mode

**Purpose**: Enable service worker in development mode
**Format**: Boolean string ("true" or "false")
**Default**: `false`

```bash
VITE_ENABLE_SW_DEV="false"
```

**When to Use**:
- **Local Development**: Set to `"true"` to test service worker locally
- **Staging**: Usually `"false"` to match production behavior
- **Production**: Must be `"false"`

**Critical Finding**:
- **Issue**: Variable is UNDOCUMENTED in `.env.example`
- **Impact**: Developers don't know this option exists
- **Fix**: Add to `.env.example` with comment

**Add to `.env.example`**:
```bash
# Enable Service Worker in development mode (default: false)
# Set to "true" to test SW registration, caching, and offline features locally
# WARNING: Leave as "false" in production
# VITE_ENABLE_SW_DEV="false"
```

### 2. Analytics & Monitoring (Optional)

If using analytics or error tracking:

```bash
# Google Analytics (if configured)
# VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"

# Sentry Error Tracking (if configured)
# SENTRY_DSN="https://xxx@sentry.io/xxx"
# SENTRY_AUTH_TOKEN="<auth-token>"

# PostHog Product Analytics (if configured)
# VITE_POSTHOG_API_KEY="<api-key>"
# VITE_POSTHOG_HOST="https://app.posthog.com"
```

---

## Environment-Specific Configuration

### Local Development (.env.local)

Create `.env.local` in project root:

```bash
# Copy from example
cp .env.example .env.local

# Generate keys
npx web-push generate-vapid-keys
openssl rand -base64 32
```

**.env.local** (example):
```bash
# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY="BEl62iUYgUivxIkv69yViEuiBIa-Ib27SzV1Lriwka..."
VAPID_PRIVATE_KEY="vE24a8tP7Z1F5xK2M9nR3Q..."
VAPID_SUBJECT="mailto:dev@localhost"

# Push API Key (dev-only, can be simple)
PUSH_API_KEY="dev-push-key-local-only-not-secure"

# Public URL
PUBLIC_SITE_URL="http://localhost:5173"

# Optional: Enable SW in dev
VITE_ENABLE_SW_DEV="true"
```

**Development Notes**:
- Use dev-specific VAPID keys (don't use production keys locally)
- PUSH_API_KEY can be simple for local testing
- Enable service worker if testing PWA features
- Use HTTP (not HTTPS) for localhost

### Staging Environment

**Platform**: Vercel, Netlify, or custom

#### Vercel

```bash
# Set variables via CLI
vercel env add VAPID_PUBLIC_KEY preview
vercel env add VAPID_PRIVATE_KEY preview
vercel env add VAPID_SUBJECT preview
vercel env add PUSH_API_KEY preview
vercel env add PUBLIC_SITE_URL preview

# Or via dashboard:
# vercel.com → Project → Settings → Environment Variables
# Select "Preview" environment
```

#### Netlify

```bash
# Via dashboard only:
# app.netlify.com → Site → Settings → Environment Variables
# Select "Deploy previews" context
```

**Staging Values**:
```bash
VAPID_PUBLIC_KEY="<staging-specific-public-key>"
VAPID_PRIVATE_KEY="<staging-specific-private-key>"
VAPID_SUBJECT="mailto:staging@dmbalmanac.com"
PUSH_API_KEY="<staging-specific-secure-key>"
PUBLIC_SITE_URL="https://staging.dmbalmanac.com"
VITE_ENABLE_SW_DEV="false"
```

**Best Practices**:
- Use different VAPID keys than production (isolate push subscriptions)
- Use different PUSH_API_KEY than production
- Keep VAPID_PRIVATE_KEY secure (don't log, don't expose)

### Production Environment

**Platform**: Vercel, Netlify, or custom

#### Vercel

```bash
# Set variables via CLI
vercel env add VAPID_PUBLIC_KEY production
vercel env add VAPID_PRIVATE_KEY production
vercel env add VAPID_SUBJECT production
vercel env add PUSH_API_KEY production
vercel env add PUBLIC_SITE_URL production

# When prompted, paste value and press Enter
# Repeat for each variable
```

#### Netlify

```bash
# Via CLI (if configured):
netlify env:set VAPID_PUBLIC_KEY "<value>" --context production
netlify env:set VAPID_PRIVATE_KEY "<value>" --context production
netlify env:set VAPID_SUBJECT "mailto:admin@dmbalmanac.com" --context production
netlify env:set PUSH_API_KEY "<value>" --context production
netlify env:set PUBLIC_SITE_URL "https://dmbalmanac.com" --context production

# Or via dashboard:
# app.netlify.com → Site → Settings → Environment Variables
# Select "Production" context
```

**Production Values**:
```bash
VAPID_PUBLIC_KEY="<production-public-key>"
VAPID_PRIVATE_KEY="<production-private-key>"
VAPID_SUBJECT="mailto:admin@dmbalmanac.com"
PUSH_API_KEY="<production-secure-key-32-chars>"
PUBLIC_SITE_URL="https://dmbalmanac.com"
VITE_ENABLE_SW_DEV="false"
```

**Critical Checks**:
- [ ] VAPID keys are production-specific (not reused from staging)
- [ ] VAPID_PRIVATE_KEY is kept secure (encrypted at rest on platform)
- [ ] PUSH_API_KEY is at least 32 characters, high entropy
- [ ] PUBLIC_SITE_URL uses HTTPS
- [ ] VITE_ENABLE_SW_DEV is "false"
- [ ] All required variables are set
- [ ] No variables are set to placeholder values

---

## Generation Commands

### VAPID Keys

```bash
# Install web-push globally (or use npx)
npm install -g web-push

# Generate VAPID keys
npx web-push generate-vapid-keys

# Or with global install:
web-push generate-vapid-keys

# Output will show:
# =======================================
#
# Public Key:
# BEl62iUYgUivxIkv69yViEuiBIa-Ib27SzV1-etc...
#
# Private Key:
# vE24a8tP7Z1F5xK2M9nR3Q6L8HtJ4N-etc...
#
# =======================================

# Copy Public Key → VAPID_PUBLIC_KEY
# Copy Private Key → VAPID_PRIVATE_KEY
```

### Push API Key

```bash
# Generate secure random string (32 bytes = 44 chars base64)
openssl rand -base64 32

# Output: (example)
# A3f9Kl2pQv8Yx4Wb7Zc1Md5Ng3Hj6Kf2Lt9Pm8Qr4St7=

# Copy this value → PUSH_API_KEY
```

### Alternative: Node.js Crypto

```bash
# Using Node.js crypto module
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Output: (example)
# X9kL3mN7pQ2vR5wT8yU1zA4bC6dE9fG2hJ5kM8nP1qS=
```

---

## Validation

### Automatic Validation (MUST IMPLEMENT)

**Critical Finding**: Environment validation exists but is NOT called at startup.

**Current Code** (`src/lib/config/env.ts`):
```typescript
export function validateServerEnvironment(): void {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!privateKey || !subject) {
    throw new Error(
      'Missing required environment variables. ' +
      'Ensure VAPID_PRIVATE_KEY and VAPID_SUBJECT are set.'
    );
  }

  // ... additional validation
}
```

**Problem**: This function is never called, so missing variables are only detected when push notifications are attempted at runtime.

**Required Fix** (`src/hooks.server.ts`):
```typescript
import { validateServerEnvironment } from '$lib/config/env';
import { building } from '$app/environment';

// Add at the TOP of the file, outside the handle function
if (building === false) {
  // Only validate when running the server (not during build)
  validateServerEnvironment();
}

export async function handle({ event, resolve }) {
  // ... existing code
}
```

**Why This Matters**:
- Catches configuration errors immediately on server start
- Prevents silent failures in production
- Makes debugging much faster

**Testing the Fix**:
```bash
# 1. Comment out VAPID_PRIVATE_KEY in .env.local
# 2. Start dev server
npm run dev

# Expected: Server should FAIL TO START with clear error message:
# Error: Missing required environment variables...

# 3. Restore VAPID_PRIVATE_KEY
# 4. Server should start successfully
```

### Manual Validation Script

Create `scripts/validate-env.sh`:

```bash
#!/bin/bash
# Validate environment variables for specified environment

ENVIRONMENT=${1:-production}

echo "Validating $ENVIRONMENT environment variables..."

# Check required variables
REQUIRED_VARS=(
  "VAPID_PUBLIC_KEY"
  "VAPID_PRIVATE_KEY"
  "VAPID_SUBJECT"
  "PUSH_API_KEY"
  "PUBLIC_SITE_URL"
)

MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    MISSING_VARS+=("$VAR")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "❌ Missing required variables:"
  for VAR in "${MISSING_VARS[@]}"; do
    echo "  - $VAR"
  done
  exit 1
fi

# Validate formats
if [[ ! "$VAPID_SUBJECT" =~ ^(mailto:|https://) ]]; then
  echo "❌ VAPID_SUBJECT must start with 'mailto:' or 'https://'"
  exit 1
fi

if [[ ! "$PUBLIC_SITE_URL" =~ ^https?:// ]]; then
  echo "❌ PUBLIC_SITE_URL must be a valid HTTP(S) URL"
  exit 1
fi

if [ ${#PUSH_API_KEY} -lt 32 ]; then
  echo "❌ PUSH_API_KEY must be at least 32 characters"
  exit 1
fi

echo "✅ All environment variables are valid!"
exit 0
```

**Usage**:
```bash
# Make executable
chmod +x scripts/validate-env.sh

# Validate local environment
./scripts/validate-env.sh local

# Validate production (load from .env.production or platform)
./scripts/validate-env.sh production
```

---

## Security Best Practices

### 1. Never Commit Secrets

**Required**:
```bash
# Ensure .env* files are gitignored
cat .gitignore | grep "^\.env"

# Should show:
# .env
# .env.local
# .env.*.local

# If not present, add:
echo -e "\n# Environment variables\n.env\n.env.local\n.env.*.local" >> .gitignore
```

**Verify**:
```bash
# Check that .env files are not staged
git status

# Should NOT show .env files

# Double-check:
git ls-files --error-unmatch .env.local 2>/dev/null && echo "❌ .env.local is tracked!" || echo "✅ .env.local is ignored"
```

### 2. Use Different Keys Per Environment

**Don't**:
```bash
# ❌ BAD: Same VAPID keys in dev, staging, production
# Leads to cross-environment push notification issues
```

**Do**:
```bash
# ✅ GOOD: Generate separate keys for each environment

# Development
npx web-push generate-vapid-keys  # → Dev keys

# Staging
npx web-push generate-vapid-keys  # → Staging keys

# Production
npx web-push generate-vapid-keys  # → Production keys
```

**Why**: Isolates push subscriptions. Users who subscribe on staging won't receive production pushes.

### 3. Encrypt Secrets at Rest

**Platform Encryption**:
- **Vercel**: Environment variables encrypted at rest automatically
- **Netlify**: Environment variables encrypted at rest automatically
- **Custom**: Use platform secret management (AWS Secrets Manager, HashiCorp Vault, etc.)

**Local Development**:
- `.env.local` is NOT encrypted
- Don't store production secrets in `.env.local`
- Use a password manager for production keys

### 4. Rotate Keys Regularly

**Recommended Rotation Schedule**:

| Secret | Rotation Frequency | Reason |
|--------|-------------------|--------|
| VAPID Keys | Annually | Low risk if never exposed |
| PUSH_API_KEY | Quarterly | Mitigate key exposure risk |
| Development Keys | Never | Low risk, local only |

**VAPID Key Rotation Process**:
1. Generate new VAPID keys
2. Deploy new public key to client (update `VAPID_PUBLIC_KEY`)
3. Keep both old and new private keys active for 30 days (grace period)
4. After 30 days, remove old private key
5. Users will re-subscribe automatically on next visit

**PUSH_API_KEY Rotation Process**:
1. Generate new API key
2. Update platform environment variable
3. Deploy application
4. Invalidate old key (or keep for 24-hour grace period)
5. Update any external services using the old key

### 5. Audit Access

**Who Should Have Access**:
- **VAPID_PRIVATE_KEY**: Only server runtime (no humans ideally)
- **PUSH_API_KEY**: Only authorized services
- **Platform Environment Variables**: Only admins and deployment CI/CD

**Regular Audits**:
- Review platform access logs monthly
- Remove access for offboarded team members
- Use least-privilege principle

---

## Troubleshooting

### Issue: Push Notifications Not Working

**Symptoms**:
- No push permission prompt
- Subscription fails silently
- Notifications not received

**Checks**:
1. **VAPID Keys Set**:
   ```bash
   # In browser console (client-side):
   console.log(import.meta.env.VITE_VAPID_PUBLIC_KEY || 'MISSING')

   # Server logs (check at startup):
   # Should see validation pass (after implementing fix)
   ```

2. **Keys Format Correct**:
   - Public key: ~87 characters, base64
   - Private key: ~43 characters, base64
   - Subject: Starts with `mailto:` or `https://`

3. **Environment Validation Called**:
   ```bash
   # Check src/hooks.server.ts has validation call
   grep "validateServerEnvironment" src/hooks.server.ts

   # Should show:
   # import { validateServerEnvironment } from '$lib/config/env';
   # validateServerEnvironment();
   ```

4. **Browser Compatibility**:
   - Push requires HTTPS (except localhost)
   - Safari requires user interaction before permission prompt
   - Check browser console for errors

### Issue: Missing Environment Variables Error

**Symptoms**:
- Server fails to start
- Error: "Missing required environment variables"

**Solution**:
```bash
# 1. Check which variables are missing
cat .env.local

# 2. Compare with .env.example
diff .env.local .env.example

# 3. Generate missing secrets
npx web-push generate-vapid-keys
openssl rand -base64 32

# 4. Add to .env.local

# 5. Restart server
npm run dev
```

### Issue: PUBLIC_SITE_URL Not Working

**Symptoms**:
- OG meta tags show `undefined` or `localhost` in production
- Push notification action URLs broken

**Root Cause**:
- Variable may not be exposed to client-side code

**Solution**:

**Option 1: Rename with VITE_ prefix**:
```bash
# In all environment configs:
VITE_PUBLIC_SITE_URL="https://dmbalmanac.com"

# In code (client-side):
const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
```

**Option 2: Pass from server**:
```typescript
// src/routes/+layout.server.ts
export async function load() {
  return {
    siteUrl: process.env.PUBLIC_SITE_URL
  };
}

// src/routes/+layout.svelte
<script>
  export let data;
  const siteUrl = data.siteUrl;
</script>
```

**Option 3: Configure in svelte.config.js**:
```javascript
// svelte.config.js
export default {
  kit: {
    env: {
      publicPrefix: 'PUBLIC_'
    }
  }
};
```

### Issue: Service Worker Not Registering

**Symptoms**:
- No service worker in DevTools
- Offline mode doesn't work

**Checks**:
1. **Production Build**:
   ```bash
   # SW only registers in production build
   npm run build
   npm run preview

   # NOT in dev mode (unless VITE_ENABLE_SW_DEV="true")
   ```

2. **HTTPS**:
   - Service workers require HTTPS
   - Exception: `localhost` works with HTTP

3. **Environment Variable**:
   ```bash
   # Check if SW dev mode is enabled
   echo $VITE_ENABLE_SW_DEV

   # If you want SW in dev:
   VITE_ENABLE_SW_DEV="true" npm run dev
   ```

---

## Platform-Specific Guides

### Vercel

**Setting Variables via CLI**:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Add variable to production
vercel env add VAPID_PUBLIC_KEY production
# Paste value when prompted

# Add to all environments
vercel env add PUSH_API_KEY
# Select: production, preview, development
```

**Setting Variables via Dashboard**:
1. Go to vercel.com
2. Select project
3. Settings → Environment Variables
4. Add new variable
5. Select environment(s)
6. Save

**Retrieving Variables**:
```bash
# List all variables
vercel env ls

# Pull to .env.local (for development)
vercel env pull .env.local
```

### Netlify

**Setting Variables via CLI**:
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Link site
netlify link

# Set variable
netlify env:set VAPID_PUBLIC_KEY "value" --context production
netlify env:set VAPID_PRIVATE_KEY "value" --context production --secret
```

**Setting Variables via Dashboard**:
1. Go to app.netlify.com
2. Select site
3. Site settings → Environment variables
4. Add variable
5. Select scope (Builds, Functions, Post-processing)
6. Select context (Production, Deploy previews, Branch deploys)
7. Save

**Retrieving Variables**:
```bash
# List variables
netlify env:list

# Clone to .env
netlify env:clone
```

### Custom Server / Docker

**Using .env Files**:
```bash
# .env.production (DO NOT COMMIT)
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@dmbalmanac.com"
PUSH_API_KEY="..."
PUBLIC_SITE_URL="https://dmbalmanac.com"
```

**Docker Compose**:
```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - VAPID_SUBJECT=${VAPID_SUBJECT}
      - PUSH_API_KEY=${PUSH_API_KEY}
      - PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
    env_file:
      - .env.production
```

**Kubernetes Secrets**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dmb-almanac-secrets
type: Opaque
stringData:
  VAPID_PUBLIC_KEY: "..."
  VAPID_PRIVATE_KEY: "..."
  PUSH_API_KEY: "..."
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dmb-almanac
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - secretRef:
            name: dmb-almanac-secrets
```

---

## Quick Reference

### Required Variables Summary

| Variable | Purpose | Example | Security |
|----------|---------|---------|----------|
| VAPID_PUBLIC_KEY | Push notification public key | `BEl62iU...` | Public |
| VAPID_PRIVATE_KEY | Push notification private key | `vE24a8t...` | **SECRET** |
| VAPID_SUBJECT | Push notification contact | `mailto:admin@dmbalmanac.com` | Public |
| PUSH_API_KEY | API authentication | `A3f9Kl2...` (32+ chars) | **SECRET** |
| PUBLIC_SITE_URL | Application base URL | `https://dmbalmanac.com` | Public |

### Generation Commands

```bash
# VAPID Keys
npx web-push generate-vapid-keys

# Push API Key
openssl rand -base64 32
```

### Validation

```bash
# Add to src/hooks.server.ts (REQUIRED FIX)
import { validateServerEnvironment } from '$lib/config/env';
if (building === false) {
  validateServerEnvironment();
}

# Manual validation
./scripts/validate-env.sh production
```

---

**Status**: Guide complete - Implementing environment validation fix is CRITICAL before production
**Priority**: Add `validateServerEnvironment()` call to `src/hooks.server.ts` immediately
**Version**: 1.0
**Last Updated**: 2026-01-25
