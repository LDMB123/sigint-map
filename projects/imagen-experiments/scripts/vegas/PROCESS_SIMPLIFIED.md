# Simplified Vegas Process

## Recommended Batch Command

True three-phase batch mode:

```bash
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/run-v29-fast-batch.sh \
  --reference /Users/louisherman/Documents/IMG_4947.jpeg \
  --range 521 540
```

Behavior:

- Runs global phases in this order:
  Phase A (all concepts) -> Phase B (all concepts) -> Phase C (all concepts)
- All outputs are forced/rendered to 4K
- If a concept fails due to safety during Phase A or Phase B, it is deferred immediately, the batch continues, and deferred items are retried at end-of-phase with revised compliance-first prompts
- Creates one batch folder with:
  `Pass A/`, `Pass B/`, `Pass C/`

## Single Concept Command

```bash
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/run-v29-managed.sh \
  --reference /Users/louisherman/Documents/IMG_4947.jpeg \
  --concept 527
```

Defaults are optimized for simplicity:

- `--quality full`
- `--run-profile simple`
- `--max-attempts 1`

## Simplified Folder Layout

```text
~/nanobanana-output/projects/<reference-stem>/
  batch-<timestamp>/
    Pass A/
    Pass B/
    Pass C/
```

Internal run artifacts are kept outside the project folder:

```text
~/nanobanana-output/_internal/<reference-stem>/
  runs/<timestamp>-cXXX/...
  logs/three-phase/<timestamp>/run.log
  latest/<concept>.png
  best/by-score.png
  best/by-identity.png
  summary.json
  history.jsonl
```

Notes:

- Project folders are batch-only for easier navigation.
- Internal data stays in `_internal/` to avoid clutter.
- Attempt-archive versions are disabled by default in `simple` and `streamlined` profiles to reduce file clutter.
