# Icons (Operational Summary)

Last updated: 2026-02-28
Full reference: `docs/archive/reference-full/ICONS.full.md`

## Source of Truth
Icon assets live in `assets/icons/` and are referenced by `manifest.webmanifest`.

## Generate Icons
```bash
cd assets
python3 generate_icons.py
```

## Required Output Files
- `assets/icons/icon-180.png`
- `assets/icons/icon-192.png`
- `assets/icons/icon-512.png`
- `assets/icons/icon-192-maskable.png`
- `assets/icons/icon-512-maskable.png`

## Validation Checklist
1. Confirm files exist and have expected dimensions.
2. Verify manifest entries in `manifest.webmanifest`.
3. Build and run:
```bash
trunk build --release
trunk serve
```
4. Verify installability / icon rendering via `npm run qa:pwa-contract`.

## Notes
- Keep icon generation reproducible via script-based flow.
- Avoid manual one-off icon edits without updating source script or full archive doc.
