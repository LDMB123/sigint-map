# Imagen Experiments

Google Imagen API experimentation and batch generation scripts.

## Quick Start

```bash
# Set up credentials
export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"

# Run generation
node scripts/vegas/vegas-v29-apex.js
```

## Project Structure (Token-Optimized)

```
imagen-experiments/
├── scripts/
│   ├── lib/              # Shared modules
│   │   ├── physics-engine.js   # Physics formulas (shared)
│   │   ├── grounding.js        # Location grounding
│   │   └── prompt-builder.js   # Template system (experimental)
│   ├── vegas/            # Vegas series v4-v29 (36 scripts)
│   ├── nashville/        # Nashville concepts (6 scripts)
│   ├── batch/            # Shell batch runners (40 scripts)
│   └── experiments/      # Experimental scripts (22 scripts)
├── prompts/
│   ├── _archived/                    # AUTHORITATIVE: Original 60 detailed prompts
│   └── concepts-template-examples.json  # Template demo (NOT originals)
├── docs/
│   ├── SESSION-MASTER-2026-02-02.md  # Authoritative session state
│   ├── KNOWLEDGE_BASE.md             # Physics methodology
│   ├── EXPERIMENTS_INDEX.md          # Experiment tracking
│   └── _archived/                    # Historical only
└── assets/               # Reference images
```

## Key Reference Docs

- **Session state:** `docs/SESSION-MASTER-2026-02-02.md`
- **Knowledge base:** `docs/KNOWLEDGE_BASE.md`
- **Experiments:** `docs/EXPERIMENTS_INDEX.md`
- **Optimization:** `TOKEN-OPTIMIZATION-AGENT-REPORT-2026-02-03.md`

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
- Original markdown files remain the source of truth for production generation

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

# Batch shell scripts
bash scripts/batch/generate-all-30-auto.sh
```

## Gotchas

- **API Quota**: Imagen has rate limits - pace requests appropriately
- **Credentials**: Must set GOOGLE_APPLICATION_CREDENTIALS env var
- **Output size**: Generated images are large (4K) - plan storage
- **Physics engine**: Import from `lib/physics-engine.js` to avoid duplication
