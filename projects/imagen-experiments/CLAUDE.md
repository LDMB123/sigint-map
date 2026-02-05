# Imagen Experiments

Google Imagen API experimentation and batch generation scripts.

## Quick Start

```bash
# Set up credentials
export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"

# Run generation
node scripts/vegas/vegas-v29-apex.js
```

## Project Structure

```
imagen-experiments/
├── scripts/
│   ├── lib/              # Shared modules
│   │   ├── physics-engine.js   # Physics formulas (shared)
│   │   ├── grounding.js        # Location grounding
│   │   └── prompt-builder.js   # Template system (experimental)
│   ├── vegas/            # vegas-v29-apex.js (latest; 39 iterations in _archived/)
│   ├── nashville/        # 6 Nashville concept scripts
│   ├── batch/_archived/  # 41 historical batch runners (broken paths)
│   └── experiments/      # 6 active scripts (14 in _archived/)
├── prompts/
│   ├── _archived/                    # AUTHORITATIVE: Original 60 detailed prompts
│   └── concepts-template-examples.json  # Template demo (NOT originals)
├── docs/                 # 9 active reference docs (historical in _archived/)
├── _compressed/          # 3 compressed refs + index (stale YAMLs in _archived/)
└── assets/               # 3 active reference images (5 large in _archived/)
```

## Key Reference Docs (Session Start)

**Essential load (5.1K tokens, 84% savings vs full docs):**
1. `docs/SESSION-MASTER-2026-02-02.md` - Authoritative session state
2. `_compressed/docs/PHYSICS-METHODOLOGY.ref.md` - Physics formulas
3. `_compressed/docs/BOUNDARY-FINDINGS.ref.md` - Safety boundaries

**Full documentation:**
- **Compression index:** `_compressed/INDEX.md`
- **Knowledge base:** `docs/KNOWLEDGE_BASE.md`
- **Experiments:** `docs/EXPERIMENTS_INDEX.md`

## Vertex AI Configuration

Current config (from `scripts/experiments/nanobanana-direct.js`):
- `PROJECT_ID`: `process.env.GOOGLE_CLOUD_PROJECT` (defaults to `gen-lang-client-0925343693`)
- `LOCATION`: `process.env.VERTEX_LOCATION` (defaults to `global`)
- `MODEL`: `gemini-3-pro-image-preview`

Auth:
- Uses ADC via `google-auth-library` with scope `https://www.googleapis.com/auth/cloud-platform`
- Set `GOOGLE_APPLICATION_CREDENTIALS` or run `gcloud auth application-default login`
- Config file: `config/vertex.env` (loaded automatically if present)

## Prompt Sources

**Authoritative prompts:** `prompts/_archived/dive-bar-concepts-*.md` (original detailed prompts)

**Template system (experimental):** `scripts/lib/prompt-builder.js` + `prompts/concepts-template-examples.json`
- Template examples are NEW creative concepts, NOT extracted from originals
- Use for generating new variations, not for reproducing original prompts

```javascript
// For template-based NEW concepts:
import { buildDiveBarPrompt } from './scripts/lib/prompt-builder.js';
import examples from './prompts/concepts-template-examples.json' with { type: 'json' };
const prompt = buildDiveBarPrompt(examples.concepts[0]);

// For ORIGINAL detailed prompts: read from prompts/_archived/*.md directly
```

## Common Commands

```bash
# Latest Vegas generation
node scripts/vegas/vegas-v29-apex.js

# Nashville concepts
node scripts/nashville/nashville-honkytonk-30.js

# Boundary testing
node scripts/experiments/generate-daring-boundary-tests.js
```

## Compressed Documentation

**Purpose:** Quick session start (5.1K tokens vs 31.9K = 84% savings)

**How to use:**
- Load compressed refs: `_compressed/docs/*.ref.md`
- See `_compressed/INDEX.md` for complete list
- Originals in `docs/` for full detail

**Compressed:** Physics methodology (formulas + tables), boundary findings (safe/blocked lists)
**Note:** Compression is lossy - preserves actionable info, omits theoretical reasoning.

## Reference Images

**Active (assets/):** `reference_nashville_new.jpeg`, `reference_nashville.jpeg`, `reference_img4945.jpeg`
**Archived (assets/_archived/):** 5 large images from earlier series (47MB)

## Troubleshooting

**429 Rate Limit:** Scripts auto-retry with 90s backoff, max 10 attempts
**API Errors (500/502/503):** Auto-retry 3 times with 30s backoff
**Content Filter Blocks:** Check `_compressed/docs/BOUNDARY-FINDINGS.ref.md`
- Conservative concepts: 100% success | Moderate: ~71% | Maximum-daring: ~37.5%

## Gotchas

- **API Quota**: Rate limits - scripts auto-pace at 35s intervals
- **Credentials**: Must set `GOOGLE_APPLICATION_CREDENTIALS` or use `gcloud auth application-default login`
- **Output size**: 1K images = 1.6-1.9MB PNG, 4K = 21MB
- **Physics engine**: Import from `scripts/lib/physics-engine.js` to avoid duplication
- **Skip-if-exists**: Default ON - use `--force` to overwrite existing outputs
- **Fishnet instant block**: ANY fishnet hosiery triggers IMAGE_SAFETY filter regardless of physics shield
