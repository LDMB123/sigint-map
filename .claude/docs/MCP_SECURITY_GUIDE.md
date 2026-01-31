# MCP Security Implementation Guide

**Priority:** CRITICAL
**Status:** ⚠️ ACTION REQUIRED
**Last Updated:** 2026-01-30

---

## Critical Security Issue

**Stitch API Key Exposed in Plaintext**

Current configuration in `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "stitch": {
    "env": {
      "STITCH_API_KEY": "AQ.Ab8RN6I8z3TJfpGTLaKyJW9PKxkypbqElTjXLXtPXY_jl6DXjg"
    }
  }
}
```

**Risk:** API key visible in plaintext, exposed to:
- Version control systems
- File system backups
- Unauthorized file access
- Accidental sharing

---

## Immediate Action Required

### Step 1: Move API Key to Environment Variable

**Add to `~/.zshrc` (or `~/.bash_profile`):**
```bash
# Stitch/Vertex AI API Key
export STITCH_API_KEY="AQ.Ab8RN6I8z3TJfpGTLaKyJW9PKxkypbqElTjXLXtPXY_jl6DXjg"
```

**Apply changes:**
```bash
source ~/.zshrc
```

**Verify:**
```bash
echo $STITCH_API_KEY
# Should output: AQ.Ab8RN6I8z3TJfpGTLaKyJW9PKxkypbqElTjXLXtPXY_jl6DXjg
```

### Step 2: Update MCP Configuration

**Edit:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Change from:**
```json
{
  "stitch": {
    "command": "/Users/louisherman/node/bin/node",
    "args": ["/Users/louisherman/Documents/stitch-vertex-mcp/index.js"],
    "env": {
      "STITCH_API_KEY": "AQ.Ab8RN6I8z3TJfpGTLaKyJW9PKxkypbqElTjXLXtPXY_jl6DXjg"
    }
  }
}
```

**Change to:**
```json
{
  "stitch": {
    "command": "/Users/louisherman/node/bin/node",
    "args": ["/Users/louisherman/Documents/stitch-vertex-mcp/index.js"],
    "env": {
      "STITCH_API_KEY": "${STITCH_API_KEY}"
    }
  }
}
```

### Step 3: Restart Claude Desktop

For environment variables to take effect:
1. Quit Claude Desktop completely
2. Reopen Claude Desktop
3. Verify Stitch integration still works

### Step 4: Add Config to .gitignore

**Add to `.gitignore`:**
```
# Claude Desktop Configuration (contains API keys)
Library/Application Support/Claude/claude_desktop_config.json
claude_desktop_config.json

# Environment files
.env
.env.local
.env.*.local

# macOS
.DS_Store
```

### Step 5: Check Git History

**Scan for exposed secrets:**
```bash
cd ~/ClaudeCodeProjects
git log --all -p -S "AQ.Ab8RN6I8z3TJfpGTLaKyJW9PKxkypbqElTjXLXtPXY_jl6DXjg"
```

**If found in history, consider:**
1. Rotating the API key (generate new one)
2. Using BFG Repo-Cleaner or git-filter-repo to remove from history
3. Force-pushing cleaned history (if private repo)

---

## Additional Security Improvements

### 1. Desktop Commander File Access (Replaces filesystem MCP)

**Note:** The `filesystem` MCP server has been replaced by Desktop Commander, which provides 24 file/process/terminal tools (a complete superset of the 11 filesystem tools).

**Desktop Commander Configuration:**
Desktop Commander is installed via the MCP Marketplace and configured automatically. It provides:
- 11 file operation tools (read, write, edit, list, etc.)
- 6 process management tools
- 4 terminal interaction tools
- 3 search tools

**Security:**
Desktop Commander respects the trusted folders configured in:
```json
{
  "preferences": {
    "localAgentModeTrustedFolders": [
      "/Users/louisherman/Documents",
      "/Users/louisherman/ClaudeCodeProjects"
    ]
  }
}
```

**Rationale:**
- Centralized file access control
- No redundant MCP servers
- Enhanced security through trusted folder restrictions

### 2. Fix Airbnb robots.txt Override

**Current Configuration:**
```json
{
  "airbnb": {
    "ignore_robots_txt": true
  }
}
```

**Recommended Configuration:**
```json
{
  "airbnb": {
    "ignore_robots_txt": false
  }
}
```

**Rationale:**
- Respects Airbnb Terms of Service
- Avoids potential legal issues
- Still functional for research purposes

### 3. Review osascript Usage

**osascript has system-level access - use with extreme caution:**

**Security Checklist:**
- [ ] Review all AppleScript before execution
- [ ] Never run scripts from untrusted sources
- [ ] Get user approval for system-level operations
- [ ] Test on non-critical data first
- [ ] Monitor osascript usage logs

**Recommended Pattern:**
```typescript
// Always get user approval for osascript
const userApproval = await askUser('Execute AppleScript to open Safari?');
if (userApproval) {
  await osascript('tell application "Safari" to activate');
}
```

### 4. Disable Redundant Extensions

**Filesystem vs Desktop Commander:**
- Both provide file operations
- Desktop Commander is more comprehensive
- Recommendation: **Disable Filesystem extension**

**How to Disable:**
1. Open Claude Desktop settings
2. Go to Extensions
3. Find "Filesystem" extension
4. Toggle off

**Benefit:**
- Reduces tool namespace pollution
- Eliminates redundancy
- Simpler mental model

---

## Secure Configuration Checklist

### Immediate (Critical)
- [ ] Move Stitch API key to environment variable
- [ ] Update MCP configuration to use `${STITCH_API_KEY}`
- [ ] Restart Claude Desktop
- [ ] Verify Stitch integration still works
- [ ] Add config to .gitignore
- [ ] Scan Git history for exposed keys

### Short-term (High Priority)
- [ ] Restrict Filesystem allowed directories
- [ ] Set Airbnb `ignore_robots_txt: false`
- [ ] Disable Filesystem extension (redundant)
- [ ] Review osascript usage patterns

### Long-term (Best Practices)
- [ ] Implement quarterly credential rotation
- [ ] Monitor MCP tool usage logs
- [ ] Regular security audits
- [ ] Document all API key locations
- [ ] Create backup/recovery procedures

---

## Environment Variable Management

### Option 1: Shell Profile (Recommended for Local Development)

**Pros:**
- Simple setup
- Persistent across sessions
- Easy to update

**Cons:**
- Visible to all terminal sessions
- Stored in plaintext file
- Not encrypted

**Implementation:**
```bash
# ~/.zshrc
export STITCH_API_KEY="your-key-here"
```

### Option 2: macOS Keychain (Most Secure)

**Pros:**
- Encrypted storage
- System-level security
- Integration with macOS security

**Cons:**
- More complex setup
- Requires script to retrieve

**Implementation:**
```bash
# Store in keychain
security add-generic-password \
  -a "stitch-api" \
  -s "STITCH_API_KEY" \
  -w "your-key-here"

# Retrieve in script
export STITCH_API_KEY=$(security find-generic-password \
  -a "stitch-api" \
  -s "STITCH_API_KEY" \
  -w)
```

### Option 3: .env File with direnv

**Pros:**
- Project-specific configuration
- Automatic loading/unloading
- Good for multiple projects

**Cons:**
- Requires direnv installation
- File must be gitignored

**Implementation:**
```bash
# Install direnv
brew install direnv

# Add to ~/.zshrc
eval "$(direnv hook zsh)"

# Create .envrc in project
echo 'export STITCH_API_KEY="your-key-here"' > .envrc
direnv allow .
```

---

## Credential Rotation Strategy

### Monthly Rotation (Recommended)

**Process:**
1. Generate new API key
2. Update environment variable
3. Test integration
4. Revoke old key
5. Document rotation date

**Automation:**
```bash
#!/bin/bash
# rotate-stitch-key.sh

echo "Generating new Stitch API key..."
# Call Stitch API to generate new key
NEW_KEY=$(curl -X POST https://api.stitch.tech/keys)

echo "Updating environment..."
sed -i '' "s/STITCH_API_KEY=.*/STITCH_API_KEY=\"$NEW_KEY\"/" ~/.zshrc

echo "Restarting services..."
# Restart Claude Desktop or reload config

echo "Revoking old key..."
# Call Stitch API to revoke old key

echo "Rotation complete!"
```

### Emergency Rotation (Immediate)

**When to rotate immediately:**
- Key exposed in public repository
- Suspicious API usage detected
- Security breach suspected
- Employee departure

**Process:**
1. Revoke current key immediately
2. Generate new key
3. Update all configurations
4. Audit recent API usage
5. Document incident

---

## Monitoring & Alerts

### API Usage Monitoring

**Set up alerts for:**
- Unusual API call patterns
- Geographic anomalies
- Quota threshold exceeded
- Failed authentication attempts

**Implementation:**
```bash
# Check Stitch API usage
curl -H "Authorization: Bearer $STITCH_API_KEY" \
  https://api.stitch.tech/usage

# Alert if usage exceeds threshold
```

### File Access Auditing

**Monitor Desktop Commander file access:**
```bash
# Check Desktop Commander logs
tail -f ~/Library/Logs/Claude/desktop-commander.log
```

### osascript Execution Logs

**Monitor AppleScript execution:**
```bash
# macOS system logs
log show --predicate 'process == "osascript"' --last 1h
```

---

## Incident Response Plan

### If API Key is Compromised:

**Immediate Actions (0-15 minutes):**
1. Revoke compromised key
2. Generate new key
3. Update configurations
4. Change related passwords

**Short-term Actions (15-60 minutes):**
5. Audit recent API usage
6. Check for unauthorized access
7. Review security logs
8. Notify relevant parties

**Long-term Actions (1-24 hours):**
9. Root cause analysis
10. Update security procedures
11. Document incident
12. Implement preventive measures

---

## Compliance Considerations

### Data Privacy (GDPR, CCPA)
- Don't store sensitive user data in Notes
- Clear browser cache after processing personal data
- Implement data retention policies

### Terms of Service
- Respect robots.txt (Airbnb, Playwright)
- Follow API usage limits
- Don't automate prohibited actions

### Audit Trail
- Log all credential rotations
- Document API key locations
- Track access to sensitive tools

---

## Security Best Practices Summary

1. **Never commit API keys** to version control
2. **Use environment variables** for all credentials
3. **Rotate credentials regularly** (monthly minimum)
4. **Restrict file access** to necessary directories only
5. **Review scripts** before execution (especially osascript)
6. **Monitor usage** for anomalies
7. **Document security procedures**
8. **Plan for incidents** before they happen
9. **Audit regularly** (quarterly minimum)
10. **Stay updated** on security best practices

---

**Status:** ⚠️ **IMMEDIATE ACTION REQUIRED - STITCH API KEY**

**Next Review:** 2026-02-28 (monthly)

---

**End of Security Guide**
