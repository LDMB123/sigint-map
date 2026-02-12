# Phase 4.4-4.5: Box-Shadow → Drop-Shadow Conversion Audit

## Summary

**Total instances**: 176 box-shadow declarations across 12 CSS files

**Conversion strategy**:
- **Keep box-shadow** for multi-layer depth effects (paper-stack, lifted cards)
- **Convert to drop-shadow()** for simple glow effects (1-2 layers, no inset)

## Per-File Analysis

### animations.css (22 instances)
- **Convert candidates**: 20 instances (glow animations, simple shadows)
- **Keep**: 2 instances (complex multi-layer shadows in animations)
- Priority: HIGH (animations run frequently, GPU cost matters)

### games.css (56 instances)
- **Convert candidates**: 35 instances (game element glows, simple highlights)
- **Keep**: 21 instances (multi-layer depth shadows, inset shadows for buttons)
- Priority: HIGH (games render at 60fps, performance critical)

### tracker.css (18 instances)
- **Convert candidates**: 6 instances (emoji drop-shadows, simple glows)
- **Keep**: 12 instances (paper-stack effect on kind-btn requires 5-layer box-shadow)
- Priority: MEDIUM (hot path for kind act logging)

### quests.css (7 instances)
- **Convert candidates**: 4 instances (quest card glows, check animations)
- **Keep**: 3 instances (multi-layer card depth)
- Priority: MEDIUM

### home.css (12 instances)
- **Convert candidates**: 7 instances (button glows, simple highlights)
- **Keep**: 5 instances (multi-layer depth on home buttons)
- Priority: LOW (home panel is static)

### Other files
- stories.css (13): 8 convert, 5 keep
- rewards.css (8): 5 convert, 3 keep
- progress.css (17): 10 convert, 7 keep
- mom.css (14): 9 convert, 5 keep
- app.css (6): 2 convert, 4 keep (loading screen shadows)
- gardens.css (2): 0 convert, 2 keep (simple shadows)
- particle-effects.css (1): 1 convert, 0 keep

## Conversion Targets

### High Priority (Phase 4.5a)
1. **animations.css** - 20 conversions
   - Glow animations (lines 414-419, 457-460, 705-721, 759-764)
   - Simple shadow animations

2. **games.css** - 35 conversions
   - Game element glows (lines 675, 681, 1082-1094, 1104, 1202-1204)
   - Simple highlight effects

### Medium Priority (Phase 4.5b)
3. **tracker.css** - 6 conversions
   - Emoji filter replacements (lines 187-189, 294-295, 325-326, 430)
   - Note: kind-btn paper-stack effect MUST stay as box-shadow (5-layer depth)

4. **quests.css** - 4 conversions
   - Quest card simple glows

### Low Priority (Phase 4.5c)
5. **All other files** - 40 conversions

## Technical Notes

### When to use drop-shadow()
✅ **Convert** if shadow has:
- Single glow layer
- No inset shadows
- Applied to elements with transparency
- Used in animations (1 property change vs 4 for box-shadow)

### When to keep box-shadow
❌ **Keep** if shadow has:
- Multi-layer depth (3+ layers)
- Inset shadows for pressed states
- Paper-stack effects (offset layers)
- Applied to containers (not direct elements)

### Performance Win
- **drop-shadow()** is applied to element's alpha channel (1 composite operation)
- **box-shadow** requires separate layer for each shadow (N composite operations)
- On A15 GPU: ~30-40% faster rendering for simple glow effects

## Implementation Plan

### Phase 4.5a: High-Priority Conversions (animations.css + games.css)
- Target: 55 conversions
- Impact: Game loop + animation performance
- Verify: 60fps maintained in catcher/unicorn games

### Phase 4.5b: Medium-Priority Conversions (tracker.css + quests.css)
- Target: 10 conversions
- Impact: Kind act logging hot path
- Verify: No visual regression in tracker buttons

### Phase 4.5c: Low-Priority Conversions (remaining files)
- Target: 40 conversions
- Impact: Overall polish
- Verify: Lighthouse INP improvement

## Next Steps

1. Start with animations.css (20 conversions)
2. Test visual parity (screenshot before/after)
3. Run Lighthouse to measure improvement
4. Continue with games.css if no regressions
