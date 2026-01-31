# Skills Ecosystem Quick Reference

**Status:** ✅ PRODUCTION READY (7/7 validation checks passed)
**Last Updated:** 2026-01-30
**Total Skills:** 253 invocable skills

---

## 🎯 Daily Usage

### Invoke Any Skill
```
/skill-name [arguments]
```

### Common Skills
```bash
# Git & Deployment
/verify-before-commit     # Pre-commit validation
/git-rollback-plan        # Safe rollback strategies

# Performance
/perf-audit               # Comprehensive performance audit
/lighthouse-webvitals-expert  # Lighthouse + Core Web Vitals measurement
/performance-optimizer    # Implement performance fixes
/bundle-size-analyzer     # JavaScript bundle analysis

# Accessibility
/accessibility-specialist # WCAG 2.1 AA compliance
/parallel-accessibility-audit  # Automated a11y audit

# Parallel Audits (Deploy multiple workers)
/parallel-chromium-audit  # Browser features
/parallel-css-audit       # CSS modernization
/parallel-pwa            # PWA compliance
/parallel-security       # Security scan
/parallel-bundle-analysis # Bundle optimization

# WebAssembly
/wasm-basics             # WASM fundamentals
/wasm-pack-workflow      # Build & deploy
/wasm-performance-tuning # Runtime optimization

# Debugging
/panic-debug             # Rust panic debugging
/lifetime-debug          # Lifetime errors
/borrow-checker-debug    # Ownership issues
/cache-debug             # Caching problems
```

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| Total Skills | 253 |
| With Coordination | 29 (11%) |
| Token Optimized | 248 (98%) |
| Avg Token Savings | 90% |
| YAML Valid | 100% |
| Production Ready | ✅ YES |

---

## 🔧 Maintenance Commands

### Sync Skills to Projects
```bash
# Sync global to current project
rsync -av ~/.claude/skills/ ./.claude/skills/ --exclude='_*'

# Sync global to DMB Almanac
rsync -av ~/.claude/skills/ projects/dmb-almanac/.claude/skills/ --exclude='_*'
```

### Run Validation
```bash
/tmp/final-skills-validation.sh
```

### Count Skills
```bash
find ~/.claude/skills -maxdepth 1 -name "*.md" | wc -l
```

---

## 🔗 Workflow Chains

### Performance Optimization
1. `/lighthouse-webvitals-expert` - Measure baseline
2. `/perf-audit` - Identify issues
3. `/performance-optimizer` - Implement fixes
4. `/lighthouse-webvitals-expert` - Validate improvements

### Accessibility Compliance
1. `/parallel-accessibility-audit` - Automated scan
2. `/accessibility-specialist` - Manual review + guidance
3. `/lighthouse-webvitals-expert` - A11y score validation

### WASM Optimization
1. `/wasm-basics` - Understand fundamentals
2. `/wasm-pack-workflow` - Build pipeline
3. `/rust-benchmarking` - Measure performance
4. `/wasm-performance-tuning` - Optimize runtime
5. `/rust-profiling` - Profile bottlenecks

### Debugging Workflow
1. Identify error type (panic/lifetime/borrow/cache)
2. Invoke specific debug skill
3. Follow skill guidance
4. Coordinate with related skills

---

## 📁 Directory Structure

```
~/.claude/skills/          # GLOBAL (source of truth)
├── *.md                   # 253 invocable skills
├── _docs/                 # Documentation (not skills)
├── accessibility/         # A11y guides (subdirectory)
├── browser/               # Browser API guides
├── data/                  # Data management
├── performance/           # Performance guides
├── projects/              # Project-specific
└── token-optimization/    # Optimization docs

./.claude/skills/          # PROJECT-LOCAL (synced from global)
└── [same structure]

projects/dmb-almanac/.claude/skills/  # DMB PROJECT (synced)
└── [same structure]
```

**IMPORTANT:** Project-local directories OVERRIDE global. Always sync after global changes.

---

## ⚠️ Critical Notes

### Cross-Session Invocation
- Skills MUST exist in project-local `./.claude/skills/` directory
- Project-local overrides global `~/.claude/skills/`
- Always sync after modifying global skills

### YAML Frontmatter Requirements
```yaml
---
name: skill-name           # Must match filename
description: "Brief desc"  # Required
tags: ['tag1', 'tag2']     # Optional but recommended
recommended_tier: sonnet   # haiku, sonnet, or opus
---
```

### File Naming
- Filename: `skill-name.md`
- YAML name: `skill-name` (must match exactly)
- Invocation: `/skill-name`

### Subdirectories
- Skills in subdirectories are NOT invocable
- Only root-level `*.md` files are registered
- Use subdirectories for documentation only

---

## 🆕 Recently Created Skills

### lighthouse-webvitals-expert.md
- **Purpose:** Lighthouse audits + Core Web Vitals measurement
- **Size:** 7,683 bytes
- **Coordination:** Works with /performance-optimizer, /perf-audit
- **Key Metrics:** LCP < 2.5s, INP < 200ms, CLS < 0.1

### accessibility-specialist.md
- **Purpose:** WCAG 2.1 AA compliance + a11y expertise
- **Size:** 12,596 bytes
- **Coordination:** Works with /parallel-accessibility-audit
- **Coverage:** Semantic HTML, ARIA, keyboard nav, screen readers

---

## 🚀 Next Steps

### If Skills Aren't Working
1. Check you're in correct project directory
2. Verify skill exists: `ls ./.claude/skills/skill-name.md`
3. If missing, sync: `rsync -av ~/.claude/skills/ ./.claude/skills/ --exclude='_*'`
4. Restart Claude Code if needed

### If Adding New Skills
1. Create in global: `~/.claude/skills/new-skill.md`
2. Add valid YAML frontmatter
3. Sync to projects (see Maintenance Commands)
4. Validate: `/tmp/final-skills-validation.sh`

### If Modifying Skills
1. Edit in global directory
2. Sync to all projects
3. Test invocation in each project
4. Run validation script

---

## 📞 Quick Help

**Full Report:** `SKILLS_ECOSYSTEM_FINAL_REPORT.md`
**Validation Script:** `/tmp/final-skills-validation.sh`
**Token Optimization Docs:** `~/.claude/skills/token-optimization/`
**Coordination Patterns:** `~/.claude/skills/_docs/SKILL_INTEGRATION_PATTERNS.md`

**Status:** All systems operational ✅
