# Emotion Vocabulary & Learning System

## Overview

The emotion system teaches emotional intelligence through 16 emotions across 4 developmental tiers. After completing a kind act reflection, children identify their own emotions, building self-awareness and vocabulary.

---

## Emotion Tiers

### Tier 1: Basic (4 emotions)
**Purpose:** Foundation emotions, immediately accessible

- Happy 😊
- Sad 😢
- Excited 🤩
- Proud 😌

**Age Appropriateness:** Pre-K (3-4 years)  
**Cognitive Load:** Low - single-word, universally understood

---

### Tier 2: Kindness (4 emotions)
**Purpose:** Emotions related to kind actions

- Caring 🤗
- Loving 💕
- Helpful 🙏
- Generous 🎁

**Age Appropriateness:** Pre-K to K (4-5 years)  
**Cognitive Load:** Medium - tied to actions, contextual

---

### Tier 3: Impact (4 emotions)
**Purpose:** How kindness affects the child

- Grateful 🙏
- Relieved 😌
- Comforted 🫂
- Included 🤝

**Age Appropriateness:** K to 1st grade (5-6 years)  
**Cognitive Load:** Higher - requires understanding of emotional states beyond simple feelings

---

### Tier 4: Growth (4 emotions)
**Purpose:** Character development emotions

- Brave 💪
- Patient 🧘
- Gentle 🌸
- Thoughtful 💭

**Age Appropriateness:** 1st grade+ (6-7 years)  
**Cognitive Load:** Highest - requires self-reflection and understanding of virtues

---

## Emotion Check-In Flow

### Trigger
After reflection prompt + story moment (total ~7 seconds from kind act logged)

### UI Design
```
┌─────────────────────────────────────┐
│        How did YOU feel?            │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 😊   │ │ 😢   │ │ 🤩   │ │ 😌   │ │
│  │Happy │ │ Sad  │ │Excited│ │Proud │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 🤗   │ │ 💕   │ │ 🙏   │ │ 🎁   │ │
│  │Caring│ │Loving│ │Helpful│ │Generous│
│  └──────┘ └──────┘ └──────┘ └──────┘ │
│                                     │
│  [... remaining 8 emotions ...]    │
│                                     │
│       [ Skip for now 🏃‍♀️ ]          │
└─────────────────────────────────────┘
```

**Touch Targets:** 48px minimum (Safari guidelines)  
**Grid:** 4×4 layout, responsive on iPad mini 6  
**Feedback:** Jelly wobble animation + toast "You felt {emotion}! 💜"

### Database Schema

```sql
-- kind_acts table
ALTER TABLE kind_acts ADD COLUMN emotion_selected TEXT;

-- Example row after complete flow
{
  id: "act_123",
  category: "hug",
  reflection_type: "Made someone happy 😊",
  emotion_selected: "Happy",  -- ← Stored emotion name
  hearts_earned: 2,  -- Base 1 + Reflection bonus 1
  created_at: 1738368000000
}
```

---

## Learning Algorithm (Future)

### Current Implementation
- All 16 emotions shown immediately
- No progressive unlocking
- No tier-based visibility

### Future: Adaptive Tier Unlocking

**Concept:** Unlock higher tiers based on mastery of lower tiers

**Mastery Criteria (proposed):**
- Tier 1 → Tier 2: Select each Tier 1 emotion at least 3 times
- Tier 2 → Tier 3: Select each Tier 2 emotion at least 5 times
- Tier 3 → Tier 4: Select each Tier 3 emotion at least 7 times

**Benefits:**
- Reduces cognitive load for young children
- Encourages vocabulary breadth before depth
- Gamification element (unlock new emotions)

**Implementation Notes:**
```rust
// Example future logic in emotion_vocabulary.rs
pub fn get_available_emotions(user_id: &str) -> Vec<Emotion> {
    let tier1_mastered = check_tier_mastery(user_id, EmotionTier::Basic);
    let tier2_mastered = check_tier_mastery(user_id, EmotionTier::Kindness);
    let tier3_mastered = check_tier_mastery(user_id, EmotionTier::Impact);
    
    let mut available = EMOTIONS
        .iter()
        .filter(|e| match e.tier {
            EmotionTier::Basic => true,  // Always available
            EmotionTier::Kindness => tier1_mastered,
            EmotionTier::Impact => tier2_mastered,
            EmotionTier::Growth => tier3_mastered,
        })
        .cloned()
        .collect();
    
    available
}
```

---

## Parent Insights

### Weekly Emotion Summary

**Location:** Mom Mode → Progress → Emotion Awareness

**Display:**
```
📊 Emotion Awareness This Week

Most Selected Emotions:
1. Happy (12 times) 😊
2. Proud (8 times) 😌
3. Caring (7 times) 🤗
4. Loving (5 times) 💕

Emotion Tier Progress:
✅ Basic emotions: 25 selections
✅ Kindness emotions: 18 selections
🌱 Impact emotions: 6 selections (growing!)
🌱 Growth emotions: 3 selections (emerging!)
```

**SQL Query:**
```sql
SELECT emotion_selected, COUNT(*) as count
FROM kind_acts
WHERE week_key = ?
  AND emotion_selected IS NOT NULL
GROUP BY emotion_selected
ORDER BY count DESC
LIMIT 10;
```

**Tier Aggregation:**
```rust
pub async fn get_weekly_emotion_insights(week_key: &str) -> EmotionInsights {
    let emotion_counts = query_emotion_counts(week_key).await;
    
    let mut tier_counts = HashMap::new();
    for (emotion_name, count) in emotion_counts {
        if let Some(emotion) = get_emotion_by_name(&emotion_name) {
            *tier_counts.entry(emotion.tier).or_insert(0) += count;
        }
    }
    
    EmotionInsights {
        top_emotions: emotion_counts.iter().take(5).collect(),
        tier_progress: tier_counts,
    }
}
```

---

## Design Rationale

### Why 16 Emotions?

**Grid Layout:** 4×4 fits perfectly on iPad mini 6 without scrolling  
**Cognitive Load:** Manageable for 4-year-olds with tier structure  
**Coverage:** Spans basic → growth emotions for 3-7 year age range  
**Future-Proof:** Room for tier-based unlocking without UI redesign

### Why 4 Tiers?

**Developmental Progression:** Maps to Pre-K → 1st grade emotional development  
**Parent Tracking:** Clear milestones for parents to observe growth  
**Gamification:** Potential unlock system creates motivation  
**Balanced:** 4 emotions per tier = even distribution

### Why Emoji + Text Labels?

**Visual Learners:** Emoji provides immediate recognition  
**Literacy Building:** Text labels teach spelling and reading  
**Accessibility:** Dual encoding (visual + textual) aids comprehension  
**Engagement:** Emoji make UI playful and age-appropriate

---

## Validation & Safety

### Emotion Validation (P0 Fix Applied)

**Location:** `reflection.rs` line 297

```rust
// CRITICAL: Validate emotion exists in EMOTIONS array before saving
if emotion_vocabulary::get_emotion_by_name(emotion).is_none() {
    web_sys::console::error_1(&format!("Invalid emotion: {}", emotion).into());
    return;
}
```

**Purpose:** Prevents corrupted data if emotion name is tampered with

### Debouncing (P1 Fix Applied)

**Location:** `reflection.rs` lines 304-314

```rust
// Bug Fix #8: Debounce rapid taps (300ms)
let now = js_sys::Date::now();
let should_process = LAST_EMOTION_TAP.with(|last| {
    let last_time = *last.borrow();
    if now - last_time < EMOTION_TAP_DEBOUNCE_MS {
        false // Too soon, ignore
    } else {
        *last.borrow_mut() = now;
        true
    }
});
```

**Purpose:** Prevents duplicate emotion saves from rapid tapping

---

## Future Enhancements

### 1. Emotion Trends Over Time
Track emotional patterns across weeks/months:
- Most common emotions per category (e.g., "Blaire feels Proud when Sharing")
- Seasonal variations
- Growth in tier usage (Basic → Growth progression)

### 2. Emotion Diversity Score
```
Diversity = (Unique emotions selected this week) / 16 * 100
```
Encourage exploring full vocabulary, not just favorites

### 3. Context-Aware Emotion Suggestions
Suggest emotions based on category:
- Hug → Loving, Comforted
- Helping → Helpful, Proud
- Sharing → Generous, Happy

### 4. Voice-Recorded Reflections
Allow child to explain WHY they felt that emotion (speech-to-text)

### 5. Emotion Journal
Visual timeline of emotions over time with sparkline charts

---

## Technical Implementation

### Files

- **`rust/emotion_vocabulary.rs`** - Emotion data structures, tier definitions, UI rendering
- **`rust/reflection.rs`** - Emotion check-in trigger, validation, database saves
- **`rust/parent_insights.rs`** - Emotion analytics, tier progress calculation
- **`styles/tracker.css`** - Emotion grid layout, button styling

### Event Flow

```
Kind Act Logged
  ↓
3s delay
  ↓
Reflection Prompt (dynamic question)
  ↓
User responds or skips
  ↓
Sparkle Story Moment (2s, category-specific)
  ↓
2s fade duration
  ↓
Emotion Check-In Prompt ← YOU ARE HERE
  ↓
User selects emotion (debounced, validated)
  ↓
Database UPDATE via offline queue
  ↓
Toast: "You felt {emotion}! 💜"
  ↓
Flow complete
```

### Offline-First

All emotion selections use `offline_queue::queued_exec()` to ensure data persists even when offline. Queued writes sync automatically when connection restored.

---

## Accessibility Considerations

**Large Touch Targets:** 48px minimum per Safari guidelines  
**High Contrast:** Emoji + black text on white background  
**No Pressure:** Skip button always visible, optional interaction  
**Voice Narration:** Prompt read aloud via SpeechSynthesis API  
**No Timers:** User-paced (unlike reflection's 10s auto-dismiss)

---

## References

- **Emotion Development Research:** Pre-K to 1st grade emotional vocabulary progression
- **Safari 26.2 APIs:** Touch events, event delegation, Web Locks
- **Design System:** 48px touch targets, emoji accessibility
- **Offline-First Pattern:** OPFS + SQLite + offline queue
