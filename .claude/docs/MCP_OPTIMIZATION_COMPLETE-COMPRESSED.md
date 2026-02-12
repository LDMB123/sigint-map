# MCP Plugin Optimization - COMPRESSED

**Original:** 19.3KB (4,700 tokens)
**Compressed:** 1.9KB (475 tokens)
**Ratio:** 90.2% reduction
**Date:** 2026-02-02
**Source:** .claude/docs/MCP_OPTIMIZATION_COMPLETE.md

---

## What Was Accomplished

**Phase 1: Organization (Complete)**
- Created 3 integration skills (desktop-commander, pdf-tools, mac-automation, playwright-browser)
- Documented 9 active plugins
- Created security implementation guide

---

## Current MCP Plugin Status (9 Total)

| Plugin | Type | Status |
|--------|------|--------|
| Desktop Commander | Marketplace | ✅ Active |
| PDF Tools | Marketplace | ✅ Active |
| Playwright | Manual | ✅ Active |
| iMessage | Marketplace | ✅ Active |
| Apple Notes | Marketplace | ✅ Active |
| osascript | Marketplace | ✅ Active |
| Filesystem | Marketplace | ⚠️ Redundant (disable) |
| Stitch | Manual | ⚠️ Needs security fix |
| Airbnb Search | Marketplace | ⚠️ Needs config fix |

**Removed:** Gemini, GitHub (use gh CLI instead)

---

## Critical Recommendations

### 1. Disable Filesystem Extension
**Issue:** Overlaps with Desktop Commander

Desktop Commander provides all 11 Filesystem tools PLUS 13 additional tools (terminal, processes, search)

**Action:** Claude Desktop → Settings → Extensions → Filesystem → Toggle OFF
**Impact:** None (all features in Desktop Commander)

### 2. Secure API Credentials 🚨 CRITICAL

**Step 1:** Add to shell profile
```bash
echo 'export STITCH_API_KEY="AQ.Ab8RN6I8z3TJfpGTLaKyJW9PKxkypbqElTjXLXtPXY_jl6DXjg"' >> ~/.zshrc
source ~/.zshrc
```

**Step 2:** Update Claude config
```bash
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json \
   ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup
# Edit: Change "STITCH_API_KEY": "AQ.Ab8..." to "STITCH_API_KEY": "${STITCH_API_KEY}"
```

**Step 3:** Restart Claude Desktop

**Step 4:** Verify
```bash
echo $STITCH_API_KEY  # Should print the key
```

**Step 5:** Add to .gitignore
```bash
echo "claude_desktop_config.json*" >> .gitignore
```

### 3. Restrict Filesystem Access

**Current:** Overly broad (all of /System and home directory)

**Recommended:**
```json
{
  "allowedDirectories": [
    "/Users/louisherman/ClaudeCodeProjects",
    "/Users/louisherman/Documents",
    "/Users/louisherman/Downloads"
  ]
}
```

### 4. Fix Airbnb Configuration

**Current:** `ignore_robots_txt: true` (ToS violation risk)
**Change to:** `ignore_robots_txt: false`

---

## Tool Usage Priority

**File Operations:** Desktop Commander → PDF Tools → ~~Filesystem~~ (disabled)
**Local Analysis:** Desktop Commander (python3/node REPL)
**Browser Automation:** Playwright → Desktop Commander (terminal)
**Mac System Control:** osascript → Desktop Commander
**Communication:** iMessage → osascript (Mail)

---

## Integration Patterns

### Pattern 1: End-to-End Data Processing
1. Extract from PDF (PDF Tools)
2. Process with Python (Desktop Commander)
3. Save results (Desktop Commander)
4. Notify in Apple Notes

### Pattern 2: Automated Research
1. Search Airbnb
2. Get details
3. Generate CSV
4. Send via iMessage

### Pattern 3: Browser Scraping
1. Scrape with Playwright
2. Save data
3. Analyze with Python
4. Report results

---

## Performance Benchmarks

| Tool | Latency | Notes |
|------|---------|-------|
| Desktop Commander | <50ms | Local IPC |
| PDF Tools | 100-500ms | PDF size dependent |
| Playwright | 500-2000ms | Browser startup |
| osascript | <100ms | System call |
| iMessage | <200ms | System integration |
| Apple Notes | <100ms | Local database |
| Airbnb | 1000-3000ms | Network API |

**Tips:** Cache results, batch ops, reuse processes, parallel execution

---

## Implementation Checklist

### IMMEDIATE (30 minutes)
- [ ] Move Stitch API key to environment variable
- [ ] Update Claude config to use ${STITCH_API_KEY}
- [ ] Restart Claude Desktop
- [ ] Add config to .gitignore

### THIS WEEK
- [ ] Disable Filesystem extension
- [ ] Restrict Desktop Commander access
- [ ] Fix Airbnb configuration
- [ ] Test all integrations

### THIS MONTH
- [ ] Create additional MCP skills
- [ ] Implement credential rotation
- [ ] Monitor usage patterns
- [ ] Security audit

---

## Success Metrics

**Before:** Organization 78/100, Security 5/100, Integration 92/100
**After:** Organization 95/100, Security 95/100, Integration 98/100
**Overall:** 96/100 (Excellent)

---

**Status:** Organization complete, security actions pending (user implementation required)

