# Quick Reference - Session Start Checklist

**Use this for every new session. Estimated cost: 2K tokens vs 100K+ for full context**

---

## Load These Files First (2K tokens)

```bash
# 1. Load master context
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/docs/SESSION-CONTEXT-MASTER-COMPRESSED-2026-02-01.md

# 2. Check Vegas script status (only if modifying)
ls -lh ~/nanobanana-output/vegas-v11-gaze/
```

---

## Current Status at a Glance

- **Script:** vegas-v11-gaze.js (405 lines, V11 physics, 33 phenomena)
- **Batch:** Paused - 11/30 done (quota limit), 19 remaining
- **Output:** ~/nanobanana-output/vegas-v11-gaze/ (mixed 2K/4K resolution)
- **Config:** 2K output, 3s delay, auto-skip existing
- **Auth:** OAuth ADC working (API key method failed)

---

## Resume Batch (When Quota Resets)

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments

# Check where batch stopped
ls ~/nanobanana-output/vegas-v11-gaze/ | wc -l

# Resume with corrected start offset
node scripts/vegas-v11-gaze.js "" [last_concept_number] 30
```

**Example:** If 11 images done (concepts 01-07, 09-10, 13, 15), start from concept 08:
```bash
node scripts/vegas-v11-gaze.js "" 8 30
```

---

## Quick Decisions Reference

| Decision | Choice | Reason |
|----------|--------|--------|
| Physics approach | Grounded (vergence+P1) | Measurable, reproducible |
| Word count | 779-802w | Within 700-900w safety zone |
| Attire | Daring mesh/chains/backless | Physics interactive with light |
| Expressions | 30 unique per concept | Eye contact variation key |
| Resolution | 2K output (from 4K) | Rate limit compliance, similar quality |

---

## File Locations

- **Scripts:** `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/`
- **Output:** `~/nanobanana-output/vegas-v11-gaze/`
- **Docs:** `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/docs/`
- **Auth:** `~/.config/gcloud/application_default_credentials.json`

---

## Rate Limit Info

- **Method:** OAuth ADC via GoogleAuth
- **Delay:** 180s between concepts (timeout), 180s flat retry
- **Quota:** Appears to hit ~11 images then rate limited
- **Action:** Wait 24h or check Google Cloud console for reset

---

## For Deep Work (Only Load if Needed)

```bash
# Script details: Read only if modifying physics/prompts
scripts/vegas-v11-gaze.js

# All concepts 30 summary: Read if reviewing generation strategy
docs/SULTRY-VEGAS-FINAL-181-210-COMPRESSED.md

# Physics reference: Read if adding new phenomena
docs/PHYSICS-CAPABILITY-MATRIX.md

# Old session history: Read if analyzing earlier versions
docs/SESSION-2026-02-01-V10-V11-COMPRESSED.md
```

---

## Common Tasks

### Check batch progress
```bash
ls -lh ~/nanobanana-output/vegas-v11-gaze/ | grep .png | wc -l
```

### View latest generated image
```bash
ls -lt ~/nanobanana-output/vegas-v11-gaze/*.png | head -1
```

### Monitor API logs
Check Google Cloud Imagen quota status: https://console.cloud.google.com/

### Modify physics
Edit `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas-v11-gaze.js` around line 150 (physicsParams)

### Update output path
Change line ~40 in vegas-v11-gaze.js: `outputDir = `...``

---

## Token Budget Status

- Current: 85K/200K (42.5%) - YELLOW status
- After Phase 1: 40K/200K (20%) - GREEN status
- After Phase 2: 35K/200K (17.5%) - GREEN status

**Strategy:** Always load compressed files first. Only read full scripts when modifying.

---

**Updated:** 2026-02-01
**Session count with this context:** Unlimited (self-documenting)

