# Testing Guide: Reflection & Emotion System

**Target Device:** iPad mini 6 (A15, 4GB RAM)  
**OS:** iPadOS 26.2  
**Browser:** Safari 26.2 only  
**Network:** Offline-first (disable WiFi after initial load)

## Setup

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart
trunk serve --address 0.0.0.0
```

Access from iPad: `http://<LAPTOP_IP>:8080`

---

## Test Suite

### Test 1: Category Story Correctness ✅ P0 Fix

**Validates:** Each category shows correct stories, not fallback "hug" stories

**Steps:**
1. Log 1 act from each category (6 total): Hug, Nice Words, Sharing, Helping, Love, Unicorn
2. For each act:
   - Wait for reflection prompt (~3s)
   - Tap any response emoji
   - Read story moment toast (2s display)
3. Verify story matches category

**Expected Results:**
- Hug → "Your hug made them feel warm..." or other HUG_STORIES
- Nice Words → "Your kind words made..." or other NICE_WORDS_STORIES
- Sharing → "When you share, friends feel..." or other SHARING_STORIES
- Helping → "Your helping hands made..." or other HELPING_STORIES
- Love → "Love is the most powerful..." or other LOVE_STORIES
- Unicorn → "That was magical kindness..." or other UNICORN_STORIES

**Pass:** All 6 categories show category-specific stories (no "hug" fallback)

---

### Test 2: Early Dismissal Race Condition ✅ P1 Fix

**Validates:** Dismissing reflection early cancels pending timeouts

**Steps:**
1. Log Hug act
2. Wait for reflection prompt (3s)
3. **IMMEDIATELY** tap "Maybe later! 🏃‍♀️" skip button (within 500ms)
4. Wait 5 seconds
5. Observe: No story toast should appear
6. Observe: No emotion check-in should appear

**Repeat 3 times** with different categories

**Pass:** 3/3 attempts show clean dismissal with no follow-up prompts

---

### Test 3: Memory Leak Prevention ✅ P1 Fix

**Validates:** Event listeners cleaned up, no memory growth

**Steps:**
1. Open Safari Web Inspector (Settings → Safari → Advanced → Web Inspector)
2. Connect iPad to Mac, open inspector
3. Go to Timelines → Memory
4. Start recording
5. Log 50 kind acts rapidly:
   - Tap random categories
   - Always skip reflection prompts
   - No emotion selections
6. Stop recording after 50 acts
7. Analyze memory graph

**Pass:** Memory stable after 50 acts, GC reclaims closures (±20% final vs initial)

---

### Test 4: Database Error Handling ✅ P0/P1 Fix

**Validates:** Error toasts shown when DB writes fail

**Approach A: OPFS Quota Exceeded**
1. Fill OPFS storage to quota limit
2. Log act → respond to reflection → select emotion
3. Verify: Toast shows "Couldn't save emotion - try again?"

**Approach B: Console Verification (easier)**
1. Log 10 acts normally
2. Respond to all reflections
3. Select emotions for all
4. Open Safari console
5. Verify: No red error logs for "Failed to save emotion" or "Failed to save reflection"

**Pass:** Either successful error toast in A, OR zero errors in B

---

### Test 5: Prompt Stacking Prevention ✅ P1 Fix

**Validates:** Only one prompt shows at a time

**Steps:**
1. Log Hug act
2. Wait for reflection prompt to appear
3. **WHILE reflection is visible**, rapidly tap Nice Words 5 times
4. Observe: No second reflection prompt stacks
5. Dismiss first reflection
6. Verify: Second reflection appears for queued acts

**Repeat:** Do same test but tap category buttons while emotion check-in is visible

**Pass:** Single prompt discipline maintained in both scenarios

---

### Test 6: Timing Constants ✅ P1 Fix

**Validates:** All timeouts use correct constant values

**Steps:**
1. Log Hug act
2. Time each phase with stopwatch:
   - Reflection appears: ~3s (tracker delay)
   - Auto-dismiss if no interaction: 10s
   - Story display duration: 2s
   - Emotion fade before check-in: 2s

**Expected Timings:**
- Reflection auto-dismiss: 10,000ms ±500ms
- Story visible: 2,000ms ±200ms
- Story → Emotion gap: 2,000ms ±200ms

**Pass:** All timings within expected ranges

---

### Test 7: Category Fallback Warning ✅ P1 Fix

**Validates:** Console warnings appear when category fallback occurs

**Steps:**
1. Open Safari Web Inspector → Console tab
2. Enable "Warnings" filter
3. Log 5 acts across different categories
4. Complete full flow for each
5. Check console for warning messages

**Expected:** ZERO warnings (category always found in DOM)

**Pass:** Zero console warnings during normal flow

---

### Test 8: Emotion Tap Debouncing ✅ P1 Fix

**Validates:** Rapid emotion tapping only registers once per 300ms

**Steps:**
1. Log Hug act
2. Respond to reflection
3. Wait for emotion check-in grid
4. **Triple-tap** "Happy 😊" button rapidly (<100ms between taps)
5. Observe: Only 1 toast appears: "You felt Happy! 💜"
6. Check database afterward

**Database Verification:**
```sql
SELECT emotion_selected FROM kind_acts WHERE id = <act_id>;
```

**Pass:** Debounce prevents duplicate registrations in 3/3 attempts

---

### Test 9: Offline Queue Integration ✅ P0 Fix

**Validates:** Reflection and emotion data queued when offline

**Steps:**
1. Load app, wait for full initialization
2. **Disable WiFi/network completely**
3. Log 5 kind acts
4. Respond to all 5 reflections
5. Select emotions for all 5
6. Check database:
   ```sql
   SELECT id, reflection_type, emotion_selected FROM kind_acts ORDER BY created_at DESC LIMIT 5;
   ```
7. Verify all fields populated (queued writes succeeded)

**Pass:** All 5 records have non-null reflection_type and emotion_selected

---

### Test 10: Random Index Bounds Safety ✅ P0 QA Fix

**Validates:** Random selection never causes out-of-bounds panic

**Steps:**
1. Log 100 acts rapidly
2. Observe console for any panic messages
3. Verify app remains responsive
4. Check all reflection prompts display correctly

**Pass:** Zero panics, all prompts render, app stable

---

### Test 11: JSON Cache Corruption Recovery ✅ P2 QA Fix

**Validates:** Cache corruption triggers recalculation instead of showing empty data

**Setup:**
1. Log 10+ acts in a week
2. Manually corrupt cache in database:
   ```sql
   UPDATE weekly_insights SET skill_breakdown = 'INVALID_JSON' WHERE week_key = '2026-W06';
   ```
3. Open Parent Insights (Mom Mode)
4. Check console for warning: "Cache corrupted, recalculating..."
5. Verify skill breakdown displays correctly (recalculated, not empty)

**Pass:** Console shows warning, parent sees correct data (not empty)

---

## Complete Flow Integration Test

**Purpose:** Validate end-to-end experience with all features working

**Steps:**
1. Fresh start: Clear all data, reload app
2. Log 10 acts across all 6 categories (randomized)
3. For each act:
   - Read reflection prompt (verify variety - 10 prompts should appear)
   - Tap a response emoji
   - Read story moment (verify category-specific)
   - Select emotion from 16-option grid (vary selections)
4. Verify database:
   ```sql
   SELECT category, reflection_type, emotion_selected FROM kind_acts ORDER BY created_at DESC LIMIT 10;
   ```
5. Expected: All 10 records have:
   - Correct category
   - Non-null reflection_type
   - Non-null emotion_selected

**Prompt Variety:** After 15 acts, see at least 8/10 unique reflection prompts
**Story Variety:** After 30 acts (5 per category), see at least 20/30 unique stories
**Emotion Variety:** User naturally selects from multiple tiers

**Pass:** 100% data integrity, reflection prompt variety, story category accuracy, smooth timing

---

## Parent Insights Verification

**Purpose:** Verify emotion analytics display correctly

**Steps:**
1. Log 20+ acts with emotion selections across 1 week
2. Enter Mom Mode (PIN required)
3. Navigate to Emotion Awareness section
4. Verify display shows:
   - Top 5 selected emotions with counts
   - Emoji for each emotion
   - Tier progress (Basic/Kindness/Impact/Growth)

**Expected Output Example:**
```
Most Selected Emotions:
1. Happy (8 times) 😊
2. Proud (6 times) 😌
3. Caring (5 times) 🤗
4. Loving (4 times) 💕

Tier Progress:
✅ Basic emotions: 14 selections
✅ Kindness emotions: 9 selections
🌱 Impact emotions: 3 selections
🌱 Growth emotions: 1 selection
```

**Pass:** Counts match database, emoji render correctly, tiers categorized properly

---

## Performance Validation

**Metrics:**

1. **Frame Rate:** Maintain 60fps during transitions
   - Use Safari Timeline → Rendering Frames
   - Check reflection prompt appear/dismiss
   - Check emotion grid render

2. **Memory Usage:** Stable after 50 acts (<100MB growth)
   - Monitor in Safari Web Inspector → Memory tab

3. **Database Write Performance:** <50ms per operation
   - Check Network tab for db-worker.js timing

4. **Offline Behavior:** All features work with WiFi disabled
   - Disable network after initial load
   - Log 10 acts, verify all data persists

**Pass Criteria:**
- Consistent 60fps
- Memory stable
- DB writes fast
- Offline-first verified

---

## Regression Testing Checklist

Ensure existing features still work:

- [ ] Kind act logging (all 6 categories)
- [ ] Heart counter increments
- [ ] Bonus heart for reflection response (+1)
- [ ] Sparkle companion animations
- [ ] Haptic feedback on taps
- [ ] Confetti on milestones
- [ ] Celebration effects
- [ ] Progress persistence
- [ ] Mom Mode analytics
- [ ] Quest system
- [ ] Story library
- [ ] Rewards panel

**Pass:** All existing features functional, no regressions

---

## Known Limitations

**Not Tested (Out of Scope):**
- Cross-browser compatibility (Safari 26.2 only)
- Older Safari versions (<26.2)
- Network sync (fully offline app)
- Multi-user scenarios
- Accessibility tools (VoiceOver)

**Future Testing:**
- Voice narration quality (SpeechSynthesis)
- Emotion vocabulary learning outcomes (longitudinal data)
- Story moment engagement metrics
- Reflection prompt effectiveness by age group
