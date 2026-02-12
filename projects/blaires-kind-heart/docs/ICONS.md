# Icons - Blaire's Kind Heart

Consolidated icon generation reference for Sparkle the Unicorn PWA icons.

---

## Quick Start (3 min)

### Prerequisites
```bash
python3 --version  # Requires 3.7+
pip3 install Pillow
```

### Generate Icons
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/assets
python3 generate_icons.py
```

### Verify Output
```bash
ls -lh icons/icon-*.png
# Should show 5 files (20-100 KB each):
# - icon-512.png
# - icon-192.png
# - icon-180.png
# - icon-512-maskable.png
# - icon-192-maskable.png
```

---

## Design: Sparkle the Unicorn

**Character**: Kawaii-style unicorn for 4-year-old Blaire
**Style**: Big eyes, cute smile, child-friendly, recognizable at small sizes
**Safe Zone**: Maskable icons use 80% center (10% padding all sides)

### Color Palette

| Element | Hex Color | Description |
|---------|-----------|-------------|
| Background (top) | #FFB7C5 | Pastel pink |
| Background (bottom) | #E6D4F5 | Pastel lavender |
| Body | #C896DC | Light purple, rounded |
| Head | #DCC4F0 | Light lavender |
| Horn | #FFC864 | Golden yellow w/ sparkles |
| Heart | #FF6EA0 | Hot pink, glowing |
| Mane | #EBA0D2 | Pink, 3 fluffy puffs |
| Eyes | White | Big sparkly w/ highlights |
| Pupils | Black | Cute, centered |

### Key Features
- **Golden horn**: Magical with star sparkles (#FFF564, #FFFF96)
- **Pink heart**: Large, glowing, centered on body
- **Fluffy mane**: 3 rounded puffs
- **Background gradient**: Smooth pink→lavender transition

---

## Generation Methods

| Method | Command | Time | Pros | Cons |
|--------|---------|------|------|------|
| **Python (⭐ Recommended)** | `python3 generate_icons.py` | 10s | Automated, consistent, repeatable | Requires Pillow |
| **Make** | `make icons` | 30s | One-liner, includes verify | Requires Make + Pillow |
| **SVG + ImageMagick** | `convert sparkle-unicorn.svg icon-*.png` | 30s | Scalable source, editable | Requires ImageMagick |
| **Online Tools** | PWABuilder, Canva, Figma | 5m | No install, visual editor | Less control, manual work |

### Python Method (Recommended)

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/assets
python3 generate_icons.py
```

**What it does**:
1. Creates base image with pastel gradient
2. Draws unicorn using geometric shapes
3. Adds heart and details
4. Applies soft blur for friendly appearance
5. Saves 5 sizes: 512, 192, 180, + maskable variants

### Make Method

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/assets
make icons        # Generate using Python
make icons-svg    # Generate from SVG
make icons-check  # Verify all files
```

### SVG + ImageMagick Method

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/assets/icons
convert -density 150 -resize 512x512 sparkle-unicorn.svg icon-512.png
convert -density 150 -resize 192x192 sparkle-unicorn.svg icon-192.png
convert -density 150 -resize 180x180 sparkle-unicorn.svg icon-180.png
cp icon-512.png icon-512-maskable.png
cp icon-192.png icon-192-maskable.png
```

**Install ImageMagick**: `brew install imagemagick`

### Online Tools Method

Visit:
- [PWA Builder](https://www.pwabuilder.com) - PWA icon generator
- [Canva](https://www.canva.com) - Visual design
- [Figma](https://www.figma.com) - Design tool

Create 512×512 design → Export as PNG → Resize for other sizes

---

## Files Generated

```
assets/icons/
├── sparkle-unicorn.svg          # SVG template (source)
├── generate_icons.py            # Python generator script
├── generate-icons.sh            # Shell wrapper
├── Makefile                     # Automation targets
├── icon-512.png                 # 512×512 - Main high-res
├── icon-192.png                 # 192×192 - Standard
├── icon-180.png                 # 180×180 - Apple touch (iOS)
├── icon-512-maskable.png        # 512×512 - Android 12+ shaped
└── icon-192-maskable.png        # 192×192 - Android 12+ shaped
```

### Icon Specifications

| File | Size | Purpose | Format |
|------|------|---------|--------|
| icon-512.png | 512×512 | App stores, high-res displays | PNG |
| icon-192.png | 192×192 | Home screen, standard | PNG |
| icon-180.png | 180×180 | Apple touch icon (iOS) | PNG |
| icon-512-maskable.png | 512×512 | Shaped icons (Android 12+) | PNG |
| icon-192-maskable.png | 192×192 | Shaped icons (Android 12+) | PNG |

**File sizes**: 20-100 KB each (PNG with transparency)

---

## Integration

### PWA Manifest

Icons already configured in `manifest.webmanifest`:

```json
{
  "icons": [
    {
      "src": "./assets/icons/icon-180.png",
      "sizes": "180x180",
      "type": "image/png"
    },
    {
      "src": "./assets/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "./assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "./assets/icons/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "./assets/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

✅ No additional configuration needed

### Testing Workflow

**Local browser**:
```bash
trunk build --release
trunk serve
# Visit http://localhost:8080
# DevTools > Application > Manifest → Verify icons
```

**iPad Mini 6 (primary target)**:
```bash
trunk serve --address 0.0.0.0
# Get Mac IP: ipconfig getifaddr en0
# On iPad: Visit http://<IP>:8080
# Share > Add to Home Screen
# Verify icon appearance
```

**Android**:
1. Install PWA on device
2. Maskable icons used automatically on Android 12+
3. Standard icons on older versions

### Testing Checklist

- [ ] All 5 files exist in `/assets/icons/`
- [ ] Files are PNG format
- [ ] File sizes 20-100 KB each
- [ ] Dimensions correct (512, 192, 180)
- [ ] Icons display in DevTools > Manifest
- [ ] Icon appears on iPad home screen
- [ ] Icon appears in app switcher
- [ ] Design matches specifications
- [ ] Maskable icons work on Android 12+

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **ModuleNotFoundError: No module named 'PIL'** | `pip3 install Pillow` |
| **python3: command not found** | `brew install python3` or fix PATH |
| **convert: command not found** (SVG method) | `brew install imagemagick` |
| **Icons not in manifest** | Rebuild: `trunk build --release`, clear browser cache |
| **Icons appear blurry** | Regenerate icons, check correct size used by device |
| **iOS home screen icon not updating** | Remove app, clear Safari cache (Settings > Safari), re-add |
| **Manifest won't validate** | Check JSON syntax, verify file paths exist |
| **File sizes too large** | Re-generate with Python script (optimizes automatically) |

---

## Customization

To modify icon design, edit `generate_icons.py` → function `create_blaire_kind_heart_icon()`:

### Common Customizations

**Background gradient** (lines 38-43):
```python
# Change colors
top_color = (255, 183, 197)    # Pink
bottom_color = (230, 212, 245)  # Lavender
```

**Unicorn body colors** (lines 56, 76):
```python
body_color = (200, 150, 220)  # Light purple
head_color = (220, 196, 240)  # Light lavender
```

**Heart color** (line 122):
```python
heart_color = (255, 110, 160)  # Hot pink
```

**Horn color** (line 96):
```python
horn_color = (255, 200, 100)  # Golden
```

**Mane color** (line 117):
```python
mane_color = (235, 160, 210)  # Pink
```

After editing, regenerate:
```bash
python3 generate_icons.py
```

### SVG Customization

Edit `assets/icons/sparkle-unicorn.svg`:
- Modify `fill` and `stroke` attributes for colors
- Change `cx`, `cy`, `points` for positions
- Add/remove SVG elements

Then convert to PNG with ImageMagick.

---

## CI/CD Integration

Example CI workflow:

```bash
#!/bin/bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/assets

# Check dependencies
python3 --version || exit 1
python3 -c "import PIL" || pip3 install Pillow

# Generate icons
python3 generate_icons.py || exit 1

# Verify all files exist
test -f icons/icon-512.png || exit 1
test -f icons/icon-192.png || exit 1
test -f icons/icon-180.png || exit 1
test -f icons/icon-512-maskable.png || exit 1
test -f icons/icon-192-maskable.png || exit 1

echo "✅ Icons generated and verified"
```

---

## Archive & References

### Detailed Documentation

Full verbose guides with ASCII art diagrams, extensive explanations, and detailed specifications:

- `docs/archive/ICON_DESIGN_REFERENCE.md` - Complete visual design specs with ASCII art
- `docs/archive/ICONS_SETUP.md` - Extended quick start guide
- `docs/archive/ICON_GENERATION_SUMMARY.md` - Comprehensive overview
- `docs/archive/ICON_GENERATION_INDEX.md` - Master index of all resources
- `docs/archive/ICON_GENERATION_OPTIONS.md` - Detailed method comparisons
- `docs/archive/ICON_DELIVERY_MANIFEST.md` - Complete deliverables inventory

### External Resources

- [MDN - Web Manifest Icons](https://developer.mozilla.org/en-US/docs/Web/Manifest#icons)
- [MDN - Maskable Icons](https://developer.mozilla.org/en-US/docs/Web/Manifest/icons#maskable)
- [Pillow Documentation](https://pillow.readthedocs.io/)
- [PWA Builder](https://www.pwabuilder.com) - Icon validation tool
- [ImageMagick Docs](https://imagemagick.org/)

---

## Summary

✅ **Python script ready**: `python3 generate_icons.py` (recommended)
✅ **Multiple generation methods**: Python, Make, SVG+ImageMagick, online tools
✅ **PWA manifest configured**: No additional setup needed
✅ **Testing workflows**: Local, iPad Mini 6, Android
✅ **Full documentation archived**: See `docs/archive/` for details

**Primary target**: iPad Mini 6 (iPadOS 26.2, Safari 26.2)
**Character**: Sparkle the Unicorn (kawaii, child-friendly)
**Status**: Ready to generate

---

*Last updated: 2026-02-09*
*For: Blaire's Kind Heart PWA v1.0*
