# Imagen Experiments

Google Imagen API experimentation and batch generation using Vertex AI.

## Quick Start

```bash
# Authenticate
export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"
# or
gcloud auth application-default login

# Run recommended batch runner (Vegas V29)
bash scripts/vegas/run-v29-fast-batch.sh

# Run with a specific prompt pack
bash scripts/vegas/run-speakeasy-v9-default.sh
```

## Project Structure

```
imagen-experiments/
├── scripts/
│   ├── lib/                  # Shared modules
│   │   ├── physics-engine.js # Physics formulas (imported by vegas)
│   │   ├── grounding.js      # Location grounding
│   │   └── prompt-builder.js # Template system (experimental)
│   ├── vegas/                # V29 system (primary)
│   │   ├── vegas-v29-apex.js       # Core generation engine
│   │   ├── run-v29-fast-batch.sh   # Recommended batch runner
│   │   ├── run-speakeasy-v9-default.sh
│   │   ├── prompt-packs/           # 82 Speakeasy concept variants
│   │   └── _archived/              # Historical iterations
│   ├── nashville/            # 6 Nashville concept scripts
│   └── experiments/          # 6 active experimental scripts
├── prompts/
│   ├── _archived/            # AUTHORITATIVE: Original 60 detailed prompts
│   └── concepts-template-examples.json
├── docs/                     # 9 active reference docs
├── _compressed/              # Compressed refs for session start (5.1K tokens)
└── assets/                   # 3 active reference images
```

## Vegas V29 Three-Phase System

The V29 system runs generation in three phases:
- **Phase A**: Baseline generation — core concepts against conservative prompts
- **Phase B**: Boundary expansion — iterates on A successes with elevated daring
- **Phase C**: Synthesis — curates best results from A+B into final output set

Prompt packs in `scripts/vegas/prompt-packs/` are named Speakeasy variants (v1–v82+) with different concept, venue, and styling parameters.

## Vertex AI Configuration

- `PROJECT_ID`: `GOOGLE_CLOUD_PROJECT` env (default: `gen-lang-client-0925343693`)
- `LOCATION`: `VERTEX_LOCATION` env (default: `global`)
- `MODEL`: `gemini-3-pro-image-preview`
- Config file: `config/vertex.env` (loaded automatically if present)

## Troubleshooting

- **429 Rate Limit**: Auto-retry with 90s backoff, max 10 attempts
- **500/502/503**: Auto-retry 3 times with 30s backoff
- **Content Filter Blocks**: See `_compressed/docs/BOUNDARY-FINDINGS.ref.md`
  - Conservative: 100% pass | Moderate: ~71% | Maximum-daring: ~37.5%

## Gotchas

- Scripts auto-pace at 35s intervals to respect API quota
- Output sizes: 1K PNG = 1.6–1.9MB, 4K PNG = ~21MB
- `--force` flag required to overwrite existing outputs (skip-if-exists is default ON)
- ANY fishnet hosiery triggers IMAGE_SAFETY filter regardless of other parameters
- Import physics formulas from `scripts/lib/physics-engine.js` — never duplicate inline

## Key Reference Docs

Fast session start (84% token savings): load `_compressed/docs/*.ref.md`
Full docs: `docs/KNOWLEDGE_BASE.md`, `docs/EXPERIMENTS_INDEX.md`
