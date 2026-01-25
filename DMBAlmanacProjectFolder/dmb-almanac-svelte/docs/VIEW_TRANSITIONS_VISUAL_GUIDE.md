# View Transitions Visual Reference Guide

## Animation Behaviors

### 1. Fade Transition (200ms)
**Used for**: Homepage, general pages, default transitions

```
┌─────────────┐         ┌─────────────┐
│  Old Page   │         │  New Page   │
│  (opacity   │ ──────> │  (opacity   │
│   1.0)      │  200ms  │   0 → 1.0)  │
└─────────────┘         └─────────────┘
```

**When used**:
- `/` (home)
- `/about`, `/faq`, `/contact`
- `/liberation` (visualizations)

---

### 2. Slide-Left Transition (250ms)
**Used for**: Forward navigation, drilling deeper into content

```
┌──────────────────┐         ┌──────────────────┐
│ Old Page (Shows) │         │ New Page (Songs) │
│ ◄──────          │ ──────> │          ──────► │
│ -30px opacity:0  │  250ms  │ +30px opacity:1  │
└──────────────────┘         └──────────────────┘
```

**Navigation Flow**:
```
Home ──────────> Shows (first visit)
                  ↓ (list to detail)
                 Shows/:id ─────────> Songs (related)
```

**When used**:
- `/shows` (list)
- `/songs` (list)
- `/venues` (list)
- `/tours` (list)

---

### 3. Slide-Right Transition (250ms)
**Used for**: Back navigation, returning to parent level

```
┌──────────────────┐         ┌──────────────────┐
│  New Page (Home) │         │  Old Page (Shows)│
│          ◄────── │ ──────> │ ──────►          │
│ -30px opacity:0  │  250ms  │ +30px opacity:1  │
└──────────────────┘         └──────────────────┘
```

**Navigation Flow**:
```
Shows/:id ─(back)──> Shows
   ↓                  ↓ (back)
  (more detail)      Home
```

**When used**:
- Back button
- Breadcrumb navigation
- "Back to list" links

---

### 4. Zoom-In Transition (300ms)
**Used for**: Opening detail view, drilling into focused content

```
┌──────────────┐         ┌──────────────┐
│ Old (zoomed  │         │ New (zoomed  │
│  out, small) │ ──────> │  in, large)  │
│ scale: 0.9   │  300ms  │ scale: 1.0   │
└──────────────┘         └──────────────┘
```

**Navigation Flow**:
```
Shows (list view)
  ↓ (click card)
Shows/:id (detail view, zoomed in)
  ↓ (click song)
Songs/:slug (even more detail)
```

**When used**:
- `/shows/:id` (detail page)
- `/songs/:slug` (song details)
- `/venues/:id` (venue details)

---

## Element Animation Sequences

### Hero Section Animation
```
BEFORE TRANSITION:
┌─────────────────────────────────┐
│  ◄◄◄ Hero Title ███████        │
│  ◄◄◄ Hero Subtitle             │
│  ◄◄◄ Hero Image ████████████   │
└─────────────────────────────────┘

DURING TRANSITION (250ms):
├─ Scale down: 1.0 ──────> 0.95
├─ Fade out:   1.0 ──────> 0.0
└─ Old pseudo-element exits

AFTER TRANSITION:
┌─────────────────────────────────┐
│  NEW Hero Title ███████        │
│  Scale: 0.95 ──────> 1.0       │
│  Fade:   0.0 ──────> 1.0       │
│  (New pseudo-element enters)    │
└─────────────────────────────────┘
```

### Card Animation Sequence
```
CARD LIST (Shows Page):
┌─────────────────────┐
│ ┌─────────────────┐ │
│ │ ◄ Card 1 ◄      │ │
│ │ scale: 1.0      │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ ◄ Card 2 ◄      │ │
│ │ scale: 0.98     │ │
│ └─────────────────┘ │
└─────────────────────┘

DURING CARD EXIT (300ms):
├─ Scale: 1.0 ──────> 0.98
├─ Fade:  1.0 ──────> 0.0
├─ Shift: 0px ──────> -10px (Y)
└─ Duration: 300ms

NEW CARD ENTRANCE:
├─ Scale: 0.98 ──────> 1.0
├─ Fade:  0.0 ──────> 1.0
├─ Shift: 10px ──────> 0px (Y)
└─ Duration: 300ms
```

### Image Animation
```
IMAGE GALLERY:
┌────────┐ ┌────────┐ ┌────────┐
│ Img1   │ │ Img2   │ │ Img3   │
│ scale: │ │ scale: │ │ scale: │
│ 1.0    │ │ 1.0    │ │ 1.0    │
└────────┘ └────────┘ └────────┘

CLICK IMAGE (zoom-in):

DURING (200ms):
├─ Scale: 1.0 ──────> 0.95
├─ Fade:  1.0 ──────> 0.0
└─ Aspect ratio: preserved

NEW PAGE:
├─ Scale: 0.95 ──────> 1.0
├─ Fade:  0.0 ──────> 1.0
└─ Result: smooth image zoom
```

---

## Navigation Flow Diagram

```
                    ┌─────────────────────────────────┐
                    │      HOME PAGE                  │
                    │  (fade transition, 200ms)       │
                    └──────────┬──────────────────────┘
                              /  \
                         fade /    \ fade
                            /        \
                           /          \
              ┌────────────▼─┐    ┌───▼────────────┐
              │ ABOUT/FAQ    │    │ LIBERATION     │
              │ (fade 200ms) │    │ (fade 200ms)   │
              └──────────────┘    └────────────────┘


         ┌──────────────────────────────────────┐
         │    SHOWS PAGE (list)                 │
         │  (slide-left 250ms from home)        │
         └──────────────┬───────────────────────┘
                        │
        (card click,    │ (zoom-in 300ms)
         slide-left     │
         250ms)         │
              │         │
        ┌─────▼─────┐   ▼
        │ SONGS     │ SHOWS/:ID (detail)
        │ PAGE      │ (zoom-in 300ms, hero animates)
        │ (list)    │
        └─────┬─────┘
              │ (song click, zoom-in 300ms)
              ▼
          SONGS/:SLUG (detail)

        ┌──────────────────────────────────────┐
        │    VENUES PAGE (gallery)             │
        │  (slide-left 250ms from home)        │
        └──────────────┬───────────────────────┘
                       │
            (image     │ (zoom-in 300ms)
             click)    │
                 ▼     ▼
            VENUES/:ID (detail, image zooms in)
```

---

## Performance Visualization

### GPU Resource Usage
```
BEFORE TRANSITION (rest state):
GPU Memory: ██░░░░░░░░ (minimal)
GPU FPS:    ████████░░ (potential ready)

DURING TRANSITION (250-300ms):
GPU Memory: ██████░░░░ (pseudo-elements temporary)
GPU FPS:    ██████████ (60fps sustained)

AFTER TRANSITION (cleanup):
GPU Memory: ██░░░░░░░░ (back to minimal)
GPU FPS:    ████████░░ (ready for next)

Timeline (M1 Mac):
Time:  0ms         50ms        100ms        150ms       200ms-250ms
      Start ────────────────────────────────────────────→ Finish
      GPU Usage ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

---

## Browser Compatibility Chart

```
DESKTOP BROWSERS:
├─ Chrome 111+       ████████████ ✅ Full support
├─ Edge 111+         ████████████ ✅ Full support
├─ Brave 1.50+       ████████████ ✅ Full support
├─ Opera 97+         ████████████ ✅ Full support
├─ Safari 18+        ███░░░░░░░░░ ⚠️  Partial (WebKit staging)
└─ Firefox (future)  ░░░░░░░░░░░░ ❌ Not yet supported

MOBILE BROWSERS:
├─ Chrome Mobile     ████████████ ✅ Full support
├─ Edge Mobile       ████████████ ✅ Full support
├─ Safari iOS        ░░░░░░░░░░░░ ❌ Limited (WebKit staging)
└─ Android Default   ████░░░░░░░░ ⚠️  Depends on version
```

---

## Animation Timing Reference

```
TRANSITION DURATIONS (milliseconds):

Fade transition       ║████░░░░░░║ 200ms
Card transition      ║██████░░░░║ 300ms
Hero transition      ║█████░░░░░║ 250ms
Image transition     ║████░░░░░░║ 200ms
Visualization        ║████░░░░░░║ 200ms
Header transition    ║███░░░░░░░║ 150ms
Sidebar transition   ║████░░░░░░║ 200ms

Custom transitions (configurable):
Min:                 ║░░░░░░░░░░║ 100ms (too fast)
Recommended range:   ║███████░░░║ 150-350ms ✅
Max:                 ║██████████║ 500ms+ (too slow)
```

---

## Easing Functions Visualization

### Cubic Bezier Curves

```
EASE-OUT (default for enter):
                          ╱
          ╱───────────────╱
      ╱──╱
    ╱
  ╱

EASE-IN (default for exit):
    ╲
      ╲──╲
          ╲───────────────╲
                          ╲

EASE-IN-OUT:
  ╱─────────────────────╲
 ╱                       ╲
```

**Currently Used**:
- Exit animations: `ease-in`
- Entry animations: `ease-out`
- Combined: `ease-in-out`
- Custom: `cubic-bezier(0.4, 0, 0.2, 1)` (Apple style)

---

## Accessibility Modes

### Normal Motion
```
OLD PAGE ─────────────> NEW PAGE
         250ms (animated)
```

### Reduced Motion (prefers-reduced-motion)
```
OLD PAGE ════════════> NEW PAGE
         ~1ms (instant)

User sees no animation, just instant page load
```

---

## File Dependencies Graph

```
+layout.svelte
├─ beforeNavigate (SvelteKit)
└─ viewTransitionNavigation.ts
   ├─ getTransitionConfig()
   └─ routeTransitionMap
      ├─ /shows → slide-left
      ├─ /songs → slide-left
      ├─ /songs/:slug → zoom-in
      └─ ...

viewTransition.ts (Svelte action)
├─ setTransitionName()
└─ removeTransitionName()
   ↓
viewTransitions.css (animations)
├─ ::view-transition-old(name)
├─ ::view-transition-new(name)
└─ @keyframes vt-*

Component (your page)
├─ use:viewTransition={{ name: 'card' }}
└─ Navigate to next page
   ↓
Smooth transition appears!
```

---

## CSS Cascade

```
LAYER 1: Reset & Base
└─ Browser defaults

LAYER 2: Components
└─ View Transitions CSS
   ├─ ::view-transition-old pseudo-element
   ├─ ::view-transition-new pseudo-element
   └─ @keyframes animations

LAYER 3: Utilities
└─ Inline styles
   └─ view-transition-name property

RENDERING:
Pseudo-element ─────────> Keyframe animation ─────────> Display
                           (300ms duration)
```

---

## Complete Navigation Example

```
USER ACTION: Click "View Songs"
     │
     ▼
SvelteKit beforeNavigate(event)
     │
     ├─ setupViewTransitionNavigation()
     │  └─ getTransitionConfig('/songs')
     │     ├─ type: 'slide-left'
     │     ├─ duration: 250ms
     │     └─ easing: cubic-bezier(0.4, 0, 0.2, 1)
     │
     ▼
startViewTransition() called
     │
     ├─ DOM Update (navigate to /songs)
     │  └─ Old page DOM → New page DOM
     │
     ├─ Pseudo-elements created
     │  ├─ ::view-transition-old(root)
     │  └─ ::view-transition-new(root)
     │
     ▼
Animation plays (250ms)
     ├─ Old page: slides left (opacity 1 → 0)
     ├─ New page: slides in from right (opacity 0 → 1)
     │
     ├─ GPU-accelerated (Metal backend)
     └─ 60fps on 120Hz display

     ▼
transition.finished promise resolves
     │
     └─ Pseudo-elements cleaned up
        └─ New page is ready!
```

---

## Quick Reference: Which Animation When?

```
┌─────────────────────────┬──────────────┬─────────────┐
│ User Action             │ Animation    │ Duration    │
├─────────────────────────┼──────────────┼─────────────┤
│ First page load         │ None         │ N/A         │
│ Home → About            │ Fade         │ 200ms       │
│ Shows → Songs           │ Slide-Left   │ 250ms       │
│ Songs → Song Details    │ Zoom-In      │ 300ms       │
│ Back button (any)       │ Slide-Right  │ 250ms       │
│ Gallery → Photo Detail  │ Image Scale  │ 200ms       │
│ Venue List → Venue      │ Card Exit    │ 300ms       │
│ Visualization Page      │ Fade         │ 200ms       │
└─────────────────────────┴──────────────┴─────────────┘
```

---

## CSS Selectors Reference

```css
/* All view transitions (entering and exiting) */
::view-transition-old(*) { }
::view-transition-new(*) { }

/* Specific element transitions */
::view-transition-old(card) { }
::view-transition-new(card) { }

/* Custom animation */
::view-transition-old(custom) {
  animation: my-exit 300ms ease-in forwards;
}

/* State-based (Chrome 143+) */
:root:active-view-transition-type(slide-left) {
  ::view-transition-old(root) { animation: slide-out-left; }
}
```

---

## Testing Checklist

```
✅ Transitions appear when navigating
✅ Animation duration matches config (~250ms)
✅ No jank or frame drops (60fps)
✅ Reduced motion disables animations
✅ Back button shows right-slide animation
✅ Element names appear in animations
✅ GPU memory doesn't leak
✅ Works on Apple Silicon
✅ No console errors
✅ Keyboard navigation still works
```

---

This visual guide should help you understand how View Transitions work in your DMB Almanac PWA!

For implementation details, see `/docs/VIEW_TRANSITIONS_API.md`
For quick examples, see `/docs/VIEW_TRANSITIONS_QUICK_START.md`
