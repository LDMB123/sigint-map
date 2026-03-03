# Icon Assets

Last updated: 2026-03-03

**Quick generate:** `python3 generate_icons.py`

---

## Files

- **sparkle-unicorn.svg** - SVG template for ImageMagick conversion
- **generate_icons.py** - Python icon generator (all 5 sizes)
- **generate-icons.sh** - Shell script wrapper
- **Makefile** - Make automation targets

## Generated Icons

- `icon-512.png` (512×512) - Main high-res
- `icon-192.png` (192×192) - Standard
- `icon-180.png` (180×180) - Apple touch
- `icon-512-maskable.png` (512×512) - Android 12+ shaped
- `icon-192-maskable.png` (192×192) - Android 12+ shaped

---

## Design: Sparkle the Unicorn

- **Character**: Friendly kawaii unicorn for 4-year-old
- **Style**: Big eyes, cute smile, pink heart on body
- **Colors**: Purple-pink gradient (#FFB7C5→#E6D4F5)
  - Body: #C896DC (light purple)
  - Heart: #FF6EA0 (hot pink)
  - Horn: #FFC864 (golden)
  - Mane: #EBA0D2 (pink, 3 puffs)
- **Format**: PNG with transparency
- **Safe zone**: 80% center for maskable icons

---

## Quick Start

### Prerequisites
```bash
pip3 install Pillow
```

### Generate
```bash
python3 generate_icons.py
```

### Verify
```bash
ls -lh icon-*.png
# Should show 5 files (20-100 KB each)
```

---

## Full Documentation

See **`../../docs/ICONS.md`** for:
- Complete generation methods (Python, Make, SVG, online)
- Detailed design specifications
- Testing workflows
- Troubleshooting guide
- Customization instructions

Archive: `../../docs/archive/ICON_*.md` (verbose guides with ASCII art)

## Navigation
- Active icon docs: `../../docs/ICONS.md`
- Active docs index: `../../docs/INDEX.md`
