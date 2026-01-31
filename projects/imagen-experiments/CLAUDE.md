# Imagen Experiments

Google Imagen API experimentation and batch generation scripts.

## Quick Start

```bash
# Set up credentials
export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"

# Run generation
npm start
```

## Project Overview

Batch image generation experiments using Google Imagen API. Includes concept generation, prompt engineering, and output management.

## Key Technologies

- Google Imagen API
- Node.js batch scripting
- Concept-driven generation

## Common Commands

```bash
# Check scripts directory for available commands
ls scripts/

# Example batch generation (check specific scripts for actual commands)
bash scripts/generate-*.sh
```

## Gotchas

- **API Quota**: Imagen has rate limits - pace requests appropriately
- **Credentials**: Must set GOOGLE_APPLICATION_CREDENTIALS env var
- **Output size**: Generated images are large (4K) - plan storage
- **Concept files**: Markdown files define generation parameters

## Architecture

```
imagen-experiments/
├── scripts/        # Batch generation scripts
├── concepts/       # Concept definitions (markdown)
├── output/         # Generated images
└── docs/           # Documentation and reports
```

## Report Writing Standards

When writing reports:
- Use bullet points, not paragraphs
- No introductions or conclusions
- Technical shorthand allowed (e.g., "impl" for implementation)
- Omit articles (a, the) where meaning is clear
- No filler phrases ("it's important to note that...")
