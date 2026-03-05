# Data Directory

## Canonical Source

- `data/static-data/` is the canonical checked-in static dataset used by the app.

## Notes

- Treat files in `data/static-data/` as versioned artifacts.
- Generated duplicates under `rust/static/data/` and `rust/data/` are non-canonical and should not be committed.
- Use `bash scripts/clean-workspace.sh --include-generated-data` to remove generated duplicates.
