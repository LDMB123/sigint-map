# Week 3 Manual Test Plan

## Test Server
- Local: http://127.0.0.1:8080/
- Network (iPad): http://192.168.1.x:8080/ (get IP with `ipconfig getifaddr en0`)

## Critical Fixes Verification

### C1: Memory Leak Fix
**What to test**: Rapid expression changes shouldn't leak memory
**Steps**:
1. Open DevTools → Memory tab
2. Take heap snapshot (baseline)
3. Log 20 kind acts rapidly (triggers many asset swaps)
4. Force garbage collection
5. Take another heap snapshot
6. Compare: Should NOT see growing closure count

**Pass criteria**: Closure count stable or decreasing

### C2: Race Condition Fix
**What to test**: Rapid expression changes show correct final state
**Steps**:
1. Trigger 5 rapid kind acts (spam click tracker button)
2. Wait 2 seconds
3. Verify companion shows correct final expression (celebrate/proud)

**Pass criteria**: Final rendered asset matches final expression state

### C3: CSS Variables Fix
**What to test**: No console errors about undefined CSS variables
**Steps**:
1. Open DevTools → Console
2. Navigate to Gardens panel
3. Check for CSS warnings

**Pass criteria**: No "invalid property value" or undefined variable errors

## Functional Testing

### Companion Skin Rendering

#### Test 1: Default Skin on Boot
1. Refresh page
2. Wait for WASM hydration
3. Verify companion shows `default_happy.webp` (unicorn emoji as fallback during load)
4. Check Network tab: `/assets/companions/default_happy.webp` loads with HTTP 200

**Pass criteria**: WebP asset displays, no 404 errors

#### Test 2: Expression Changes
1. Log a kind act
2. Verify companion switches to `default_celebrate.webp`
3. Wait 4 seconds
4. Verify reverts to `default_happy.webp`

**Pass criteria**: Smooth transitions, correct assets

#### Test 3: Asset Load Error Fallback
1. DevTools → Network tab → Block `/assets/companions/*`
2. Refresh page
3. Verify emoji fallback (🦄) displays

**Pass criteria**: Graceful degradation to emoji

### Gardens Panel

#### Test 4: Empty State
1. Fresh DB (or clear gardens table)
2. Click gardens button in navigation
3. Verify empty state shows: "🌱 No gardens yet! Complete kind acts to unlock gardens."

**Pass criteria**: Empty state renders with centered emoji + message

#### Test 5: Unlocked Garden Rendering
**Setup**: SQL to unlock test garden
```sql
INSERT INTO gardens VALUES('garden-hug-1','Bunny Garden','chain-hug-1','🐰',1,1000000000);
```

1. Navigate to gardens panel
2. Verify card shows:
   - Title: "🐰 Bunny Garden"
   - Image: `bunny_stage_1.webp`
   - Stage text: "Stage 1 of 5"
   - Progress bar: 20% filled

**Pass criteria**: Garden card renders with correct stage 1 asset

#### Test 6: Garden Growth Update
**Setup**: From Test 5, update stage
```sql
UPDATE gardens SET growth_stage=3 WHERE id='garden-hug-1';
```

1. While gardens panel is open, run SQL update
2. Trigger a kind act (to refresh UI via grow_garden flow)
3. Verify card updates to:
   - Image: `bunny_stage_3.webp`
   - Stage text: "Stage 3 of 5"
   - Progress bar: 60% filled

**Pass criteria**: Live update without page refresh

#### Test 7: Multiple Gardens
**Setup**: Unlock 3 gardens with different stages
```sql
INSERT INTO gardens VALUES('garden-hug-2','Flower Garden','chain-hug-1','🌸',2,1000000001);
INSERT INTO gardens VALUES('garden-help-1','Tree Garden','chain-help-1','🌳',4,1000000002);
```

1. Navigate to gardens panel
2. Verify grid layout (auto-fill columns, min 280px)
3. Check responsive on narrow viewport (should stack to 1 column)

**Pass criteria**: Cards display in responsive grid

## SQL Helpers

```sql
-- Reset to fresh state
DELETE FROM gardens;
DELETE FROM companion_skins WHERE id != 'default';

-- Unlock all companion skins
UPDATE companion_skins SET is_unlocked=1;

-- Activate specific skin
UPDATE companion_skins SET is_active=0;
UPDATE companion_skins SET is_active=1 WHERE id='unicorn';

-- Create test gardens at various stages
INSERT INTO gardens VALUES
  ('garden-hug-1','Bunny Garden','chain-hug-1','🐰',1,1000000000),
  ('garden-hug-2','Flower Garden','chain-hug-1','🌸',2,1000000001),
  ('garden-help-1','Tree Garden','chain-help-1','🌳',3,1000000002),
  ('garden-kind-1','Rainbow Garden','chain-kind-1','🌈',4,1000000003),
  ('garden-share-1','Star Garden','chain-share-1','⭐',5,1000000004);

-- Grow garden manually
UPDATE gardens SET growth_stage = growth_stage + 1 WHERE id='garden-hug-1' AND growth_stage < 5;
```
