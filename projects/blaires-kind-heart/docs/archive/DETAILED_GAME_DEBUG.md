# Game Debugging Guide

## Issues Found (Code Analysis)

### 🔴 Critical: Potential Panics from `.unwrap()`

**Location:** `game_paint.rs` line 145, `game_unicorn.rs` lines 136, 157

**Issue:** Canvas element creation uses `.unwrap()` which will panic if creation fails

**Impact:** Games will crash instead of showing error message

**Test:**
1. Open browser console (Cmd+Opt+I in Safari)
2. Navigate to Games panel
3. Click "Magic Painting" or "Unicorn Adventure"
4. Check console for panic messages

**Expected:** Game should load without errors
**If broken:** You'll see: `panicked at 'called unwrap() on a None value'`

---

## Manual Testing Checklist

### Test Environment
- Device: iPad mini 6
- Browser: Safari 26.2
- Network: Offline mode (disable WiFi after initial load)
- URL: http://localhost:8080 (or Mac IP:8080 for iPad)

### Game 1: Kindness Catcher ❤️

**Basic Functionality:**
- [ ] Game starts when clicked
- [ ] Hearts, stars, unicorns fall from top
- [ ] Tapping items increases score
- [ ] Lives counter decreases when hitting clouds
- [ ] Game ends when lives reach 0
- [ ] End screen shows score and level
- [ ] "Play Again" button works
- [ ] "Back to Menu" button works

**Advanced Features:**
- [ ] Power-ups appear (golden heart, shield, magnet, etc.)
- [ ] Power-up effects activate when caught
- [ ] Combo counter increases for consecutive catches
- [ ] Level progression occurs
- [ ] Speed increases with levels
- [ ] Personal best saves to database
- [ ] Stats show on game hub card after playing

**Console Checks:**
```javascript
// Open Safari console, run after playing:
db.query("SELECT * FROM game_scores WHERE game_id = 'catcher' ORDER BY created_at DESC LIMIT 1")
```

Expected: Latest game score recorded with correct level

---

### Game 2: Memory Match 🃏

**Basic Functionality:**
- [ ] Game starts when clicked
- [ ] 8 cards displayed face-down (4 pairs)
- [ ] Tapping card flips it over
- [ ] Second card flip shows if match
- [ ] Matched pairs stay face-up
- [ ] Unmatched pairs flip back after delay
- [ ] Game ends when all pairs matched
- [ ] End screen shows time and moves
- [ ] "Play Again" button works
- [ ] "Back to Menu" button works

**Edge Cases:**
- [ ] Can't flip more than 2 cards at once
- [ ] Can't flip already-matched cards
- [ ] Can't flip same card twice
- [ ] Timer stops when game completes

**Console Checks:**
```javascript
// Check best time saved:
db.query("SELECT MIN(duration_ms) as best FROM game_scores WHERE game_id LIKE 'memory_%' AND duration_ms > 0")
```

Expected: Best time in milliseconds

---

### Game 3: Hug Machine 🤗

**Basic Functionality:**
- [ ] Game starts when clicked
- [ ] Sparkle character appears
- [ ] "Hug" and "Tickle" buttons visible
- [ ] Tapping "Hug" plays animation
- [ ] Tapping "Tickle" plays different animation
- [ ] Sparkle reacts to interactions
- [ ] Counter increments with each hug/tickle
- [ ] End screen shows total hugs given
- [ ] "Play Again" resets counter
- [ ] "Back to Menu" button works

**Console Checks:**
```javascript
// Check hug count:
db.query("SELECT COUNT(*) as total FROM game_scores WHERE game_id = 'hug'")
```

Expected: Count increases after each game session

---

### Game 4: Magic Painting 🎨

**Basic Functionality:**
- [ ] Game starts when clicked
- [ ] Canvas appears with drawing area
- [ ] Color palette visible
- [ ] Brush size selector works
- [ ] Drawing with finger/mouse works
- [ ] Colors change when selected
- [ ] Brush sizes change when selected
- [ ] Clear button erases canvas
- [ ] Save button captures painting
- [ ] "Done" button returns to menu

**Canvas-Specific Tests:**
- [ ] Multi-touch drawing works (iPad)
- [ ] Brush strokes are smooth
- [ ] No lag when drawing fast
- [ ] Retina display renders crisp lines
- [ ] Canvas doesn't scroll page when drawing

**Console Checks:**
```javascript
// Check if canvas element exists:
document.querySelector('[data-paint-canvas]')

// Check canvas context:
document.querySelector('[data-paint-canvas]').getContext('2d')
```

Expected: Canvas element exists, context is valid

**Known Issue Test:**
If game crashes immediately:
1. Check console for: `panicked at 'called unwrap() on a None value'`
2. Check line reference - should be game_paint.rs:145
3. This confirms canvas creation failure

---

### Game 5: Unicorn Adventure 🦄

**Basic Functionality:**
- [ ] Game starts when clicked
- [ ] Unicorn character appears
- [ ] Forest friends (animals) spawn
- [ ] Tapping friends collects them
- [ ] Score increases per collection
- [ ] Character moves/animates
- [ ] Game has clear objective
- [ ] End condition triggers
- [ ] End screen shows friends collected
- [ ] "Play Again" button works
- [ ] "Back to Menu" button works

**Canvas-Specific Tests:**
- [ ] Animations are smooth (60fps)
- [ ] No visual glitches
- [ ] Touch/click detection accurate
- [ ] Canvas renders at correct size

**Console Checks:**
```javascript
// Check canvas element:
document.querySelector('canvas')

// Check if game loop running:
// Should see requestAnimationFrame calls in Performance tab
```

**Known Issue Test:**
If game crashes immediately:
1. Check console for: `panicked at 'called unwrap() on a None value'`
2. Check line references - should be game_unicorn.rs:136 or :157
3. This confirms canvas creation or context failure

---

## Common Issues & Fixes

### Issue: Game doesn't start (stays on menu)

**Symptoms:** Clicking game card does nothing

**Debug:**
```javascript
// Check if click handler bound:
document.querySelector('[data-game="catcher"]').click()

// Check if arena exists:
document.querySelector('#game-arena')
```

**Fix:** Refresh page, check console for errors

---

### Issue: Game starts but canvas is black/blank

**Symptoms:** Game UI loads but canvas shows nothing

**Debug:**
```javascript
// Check canvas dimensions:
const canvas = document.querySelector('canvas')
console.log(canvas.width, canvas.height)

// Check if too small:
if (canvas.width < 100 || canvas.height < 100) {
  console.error('Canvas size invalid')
}
```

**Fix:** Check responsive layout CSS, device pixel ratio

---

### Issue: Touch events don't work (iPad)

**Symptoms:** Can't tap items in catcher, can't draw in paint

**Debug:**
```javascript
// Check touch-action CSS:
const canvas = document.querySelector('canvas')
console.log(getComputedStyle(canvas).touchAction)
```

Expected: `touchAction` should be `'none'` for paint/unicorn

**Fix:** Verify `touch-action: none` in CSS

---

### Issue: Game loop freezes or stutters

**Symptoms:** Animations stop or are choppy

**Debug:**
```javascript
// Monitor FPS in Safari:
// 1. Open Web Inspector → Timelines
// 2. Start "Rendering Frames" recording
// 3. Play game
// 4. Check for dropped frames (should be 60fps)
```

**Fix:** Check for long tasks blocking main thread

---

### Issue: Scores don't save

**Symptoms:** Stats don't appear on game hub cards

**Debug:**
```javascript
// Check offline queue:
db.query("SELECT COUNT(*) as pending FROM offline_queue")

// Check game_scores table:
db.query("SELECT * FROM game_scores ORDER BY created_at DESC LIMIT 10")
```

**Fix:** Verify offline_queue is processing writes

---

## Performance Benchmarks

### Expected Performance (iPad mini 6, A15 chip)

| Game | Load Time | FPS | Memory |
|------|-----------|-----|---------|
| Catcher | <500ms | 60fps | <50MB |
| Memory | <300ms | N/A | <20MB |
| Hug | <200ms | 60fps | <30MB |
| Paint | <400ms | 60fps | <40MB |
| Unicorn | <500ms | 60fps | <60MB |

### How to Measure

**Load Time:**
1. Open Safari Web Inspector → Timelines
2. Click game card
3. Measure from click to first render
4. Should be <500ms

**FPS:**
1. Open Timelines → Rendering Frames
2. Start recording
3. Play game for 30 seconds
4. Stop recording
5. Check frame rate graph (should be flat at 60fps)

**Memory:**
1. Open Timelines → Memory
2. Start recording
3. Play game for 2 minutes
4. Stop recording
5. Check peak memory usage

---

## Automated Test Script

Run this in Safari console after loading app:

```javascript
// Test all 5 games automatically
async function testAllGames() {
  const games = ['catcher', 'memory', 'hug', 'paint', 'unicorn'];
  const results = {};

  for (const gameId of games) {
    console.log(`Testing ${gameId}...`);

    // Click game card
    const card = document.querySelector(`[data-game="${gameId}"]`);
    if (!card) {
      results[gameId] = 'FAIL: Card not found';
      continue;
    }

    card.click();
    await new Promise(r => setTimeout(r, 1000)); // Wait for load

    // Check if game arena visible
    const arena = document.querySelector('#game-arena');
    const isVisible = arena && !arena.hasAttribute('hidden');

    if (!isVisible) {
      results[gameId] = 'FAIL: Arena not visible';
    } else {
      // Check for canvas (paint/unicorn only)
      const hasCanvas = document.querySelector('canvas') !== null;
      results[gameId] = hasCanvas || gameId === 'memory' || gameId === 'hug'
        ? 'PASS'
        : 'WARN: No canvas found';
    }

    // Return to menu
    const backBtn = document.querySelector('[data-game-back]');
    if (backBtn) backBtn.click();

    await new Promise(r => setTimeout(r, 500));
  }

  console.table(results);
  return results;
}

testAllGames();
```

Expected output:
```
┌──────────┬────────┐
│ Game     │ Result │
├──────────┼────────┤
│ catcher  │ PASS   │
│ memory   │ PASS   │
│ hug      │ PASS   │
│ paint    │ PASS   │
│ unicorn  │ PASS   │
└──────────┴────────┘
```

---

## Next Steps

1. **Run manual tests** for each game using checklist above
2. **Note failing tests** with specific error messages
3. **Check console** for panics or warnings
4. **Run automated test script** for quick validation
5. **Report findings** with specific game names and symptoms

Once you identify which specific games are broken and what the symptoms are, I can provide targeted fixes for each issue.
