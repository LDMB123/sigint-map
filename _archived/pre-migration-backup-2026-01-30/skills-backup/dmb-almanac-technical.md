---
name: dmb-almanac-technical
description: "Technical architecture and implementation details"
recommended_tier: sonnet
category: scraping
complexity: advanced
tags:
  - projects
  - scraping
  - chromium-143
  - apple-silicon
target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."
prerequisites: []
related_skills: []
see_also: []
minimum_example_count: 3
requires_testing: true
performance_critical: false
migrated_from: projects/dmb-almanac/app/docs/archive/misc/TECHNICAL_REFERENCE.md
migration_date: 2026-01-25
---

# Technical Reference - InstallBanner Component


### Token Management

See [Token Optimization Skills](./token-optimization/README.md) for all automatic optimizations.

## Skill Coordination

**When to delegate:**
- Complex multi-file tasks → `/parallel-audit`
- Specialized domains → Category-specific experts
- Performance issues → `/perf-audit`

**Works well with:**
- Related skills in same category
- Debug and optimization tools

## Component Source Code Overview

### File Location
`~/Documents/dmbalmanac-v2/apps/web/src/components/frontend/InstallBanner.tsx`

### Component Signature
```tsx
export function InstallBanner(): JSX.Element | null
```

### Imports
```tsx
'use client';  // Client component required for browser APIs

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
```

---

## Type Definitions

### BeforeInstallPromptEvent Interface
```typescript
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
```

**Properties:**
- `prompt()`: Async method that displays the native install dialog
  - Returns: Promise that resolves when dialog is dismissed
  - No parameters
  - Can only be called once per event instance

- `userChoice`: Promise that resolves when user completes action
  - Resolves to: `{ outcome: 'accepted' | 'dismissed' }`
  - `'accepted'`: User clicked Install in the dialog
  - `'dismissed'`: User closed dialog or clicked Cancel

---

## State Variables

### deferredPrompt
```typescript
const [deferredPrompt, setDeferredPrompt] =
  useState<BeforeInstallPromptEvent | null>(null);
```

**Lifecycle:**
1. Initial: `null`
2. When `beforeinstallprompt` fires: Set to the event object
3. After user acts (install/dismiss): Set back to `null`

**Usage:**
- Guard clause: `if (!deferredPrompt) return;`
- Trigger install: `await deferredPrompt.prompt()`

**Why Store It?**
The `beforeinstallprompt` event is a one-time event. We capture and store it so the user can trigger installation later when they click the button.

### isInstalled
```typescript
const [isInstalled, setIsInstalled] = useState(false);
```

**Lifecycle:**
1. Initial: `false`
2. When detected via media query: `true`
3. When `appinstalled` event fires: `true`

**Detection Methods:**
```javascript
// Method 1: Media query (checks if running in standalone mode)
window.matchMedia('(display-mode: standalone)').matches

// Method 2: appinstalled event (fires after successful install)
window.addEventListener('appinstalled', () => {
  setIsInstalled(true);
});
```

**Purpose:**
Hide banner if app is already installed on device.

### isVisible
```typescript
const [isVisible, setIsVisible] = useState(false);
```

**Lifecycle:**
1. Initial: `false`
2. When `beforeinstallprompt` fires: `true`
3. When dismissed or installed: `false`

**Rendering:**
```javascript
if (!isVisible || isInstalled) {
  return null; // Don't render anything
}
```

---

## Effect Hook - Event Listeners Setup

### useEffect Hook
```typescript
useEffect(() => {
  // 1. Define handler functions
  const handleBeforeInstallPrompt = (e: Event) => { ... };
  const handleAppInstalled = () => { ... };

  // 2. Attach listeners
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  // 3. Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    setIsInstalled(true);
  }

  // 4. Cleanup function (runs on unmount)
  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  };
}, []); // Empty dependency array = runs once on mount
```

**Dependency Array Explanation:**
- `[]` = Empty array means this effect runs once when component mounts
- No re-runs on component updates
- This is correct because we only want one set of listeners

**Cleanup Function Importance:**
The return statement is critical:
```javascript
return () => {
  // This runs when component unmounts
  window.removeEventListener(...);
  window.removeEventListener(...);
};
```
Without cleanup, listeners would accumulate if component mounted/unmounted multiple times.

---

## Event Handlers

### handleBeforeInstallPrompt
```typescript
const handleBeforeInstallPrompt = (e: Event) => {
  e.preventDefault();           // Prevent default browser behavior
  setDeferredPrompt(e as BeforeInstallPromptEvent);  // Save the event
  setIsVisible(true);           // Show the banner
};

window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
```

**When It Fires:**
Browser fires this event when the app meets PWA installation criteria.

**Why preventDefault()?**
By default, the browser might show its own install UI. We prevent that and handle it ourselves.

**Why Type Assertion?**
TypeScript needs to know the Event is our custom BeforeInstallPromptEvent interface:
```typescript
e as BeforeInstallPromptEvent
```

### handleAppInstalled
```typescript
const handleAppInstalled = () => {
  setIsInstalled(true);       // Mark as installed
  setDeferredPrompt(null);    // Clear the saved event
  setIsVisible(false);        // Hide the banner
};

window.addEventListener('appinstalled', handleAppInstalled);
```

**When It Fires:**
Browser fires this after the user completes the installation process.

**Why Clear State?**
After install, we don't need the event anymore and we want to hide the banner.

---

## User Action Handlers

### handleInstallClick
```typescript
const handleInstallClick = async () => {
  if (!deferredPrompt) return;  // Safety check

  try {
    // 1. Show native install dialog
    await deferredPrompt.prompt();

    // 2. Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;

    // 3. Check outcome
    if (outcome === 'accepted') {
      console.log('PWA install accepted');
      setIsVisible(false);  // Hide banner on success
    } else {
      console.log('PWA install dismissed');
    }

    // 4. Clear the prompt
    setDeferredPrompt(null);
  } catch (error) {
    console.error('Error installing PWA:', error);
  }
};
```

**Call Stack:**
```
User clicks button
  ↓
handleInstallClick() called
  ↓
deferredPrompt.prompt() called
  ↓
Native install dialog appears (user sees this)
  ↓
User clicks Install or Cancel
  ↓
userChoice Promise resolves
  ↓
We check outcome and update state
```

**Error Scenarios:**
- `if (!deferredPrompt)`: Shouldn't happen, but guard against it
- `try-catch`: Catches unexpected errors from browser APIs
- `outcome === 'accepted'`: User completed install
- `outcome === 'dismissed'`: User canceled

### handleDismiss
```typescript
const handleDismiss = () => {
  setIsVisible(false);      // Hide the banner
  setDeferredPrompt(null);  // Clear the saved event
};
```

**When Called:**
User clicks "Not now" button.

**Effect:**
Banner disappears. User won't see it again until page reloads (because we don't persist the dismissal).

---

## Conditional Rendering

### Return Statement
```typescript
if (!isVisible || isInstalled) {
  return null;
}

return (
  <div className="glass rounded-xl p-8 text-center">
    {/* Banner JSX */}
  </div>
);
```

**Logic:**
- Return `null` (render nothing) if:
  - `!isVisible`: Banner hasn't been triggered yet
  - `isInstalled`: App is already installed
- Return JSX otherwise

**Why null?**
In React, returning `null` is the standard way to render nothing. This prevents the banner from taking up space in the DOM when not visible.

---

## JSX Structure

### Root Container
```tsx
<div className="glass rounded-xl p-8 text-center">
```
- `glass`: Design system class for frosted glass effect
- `rounded-xl`: Large border radius
- `p-8`: Padding on all sides
- `text-center`: Center-align text

### Heading
```tsx
<h2 className="text-xl font-bold">Install DMB Almanac</h2>
```
- `text-xl`: Large text size
- `font-bold`: Bold font weight

### Description
```tsx
<p className="mt-2 text-foreground-secondary">
  Access setlists offline, get notifications for new shows, and enjoy
  a native app experience.
</p>
```
- `mt-2`: Margin-top (spacing from heading)
- `text-foreground-secondary`: Secondary text color (less prominent)

### Button Container
```tsx
<div className="mt-6 flex items-center justify-center gap-3">
```
- `mt-6`: Margin-top (spacing from description)
- `flex`: Flexbox layout
- `items-center`: Vertically center items
- `justify-center`: Horizontally center items
- `gap-3`: Space between buttons

### Install Button
```tsx
<button
  onClick={handleInstallClick}
  className={cn(
    'inline-flex items-center gap-2 rounded-lg px-6 py-3',
    'bg-primary text-primary-foreground',
    'hover:bg-primary-hover',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    'transition-colors font-semibold'
  )}
>
  <Download className="h-5 w-5" aria-hidden="true" />
  Install App
</button>
```

**Class Breakdown:**
- `inline-flex`: Display as inline flex container
- `items-center gap-2`: Center items vertically, space them
- `rounded-lg`: Medium border radius
- `px-6 py-3`: Horizontal and vertical padding
- `bg-primary`: Primary color background
- `text-primary-foreground`: Contrasting text color
- `hover:bg-primary-hover`: Different color on hover
- `focus-visible:*`: Keyboard focus styling (accessibility)
- `transition-colors`: Smooth color transitions
- `font-semibold`: Semi-bold font

**Icon:**
```tsx
<Download className="h-5 w-5" aria-hidden="true" />
```
- `h-5 w-5`: 20x20 pixel size
- `aria-hidden="true"`: Hide from screen readers (decorative)

### Dismiss Button
```tsx
<button
  onClick={handleDismiss}
  className={cn(
    'inline-flex items-center gap-2 rounded-lg px-6 py-3',
    'border border-border bg-transparent text-foreground',
    'hover:bg-background-surface',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    'transition-colors font-semibold'
  )}
>
  Not now
</button>
```

**Key Differences from Install Button:**
- `border border-border`: Bordered style (outline button)
- `bg-transparent`: No background fill
- `text-foreground`: Regular text color
- `hover:bg-background-surface`: Subtle background on hover

---

## CSS Class Merging

### cn() Function
```typescript
import { cn } from '@/lib/utils';

className={cn(
  'base-classes',
  'conditional ? "class-a" : "class-b"'
)}
```

**Purpose:**
Merges multiple Tailwind class strings, removing duplicates.

**Example:**
```typescript
cn(
  'px-4 py-2',
  'bg-primary',
  'hover:bg-primary-hover'
)
// Output: "px-4 py-2 bg-primary hover:bg-primary-hover"
```

---

## Browser API Reference

### beforeinstallprompt Event
```typescript
// Fired by: Browser
// When: App meets PWA installation criteria
// Properties:
{
  prompt: () => Promise<void>,
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
```

### appinstalled Event
```typescript
// Fired by: Browser
// When: User completes app installation
// Properties: None (empty Event object)
```

### display-mode Media Query
```typescript
window.matchMedia('(display-mode: standalone)').matches
// Returns: true if app running in standalone mode (installed)
// Returns: false if running in browser
```

---

## Data Flow Diagram

```
Browser                Component State          UI
  │                        │                     │
  ├─ Page loads ───────────┼─→ All state: false  │
  │                        │    (hidden)         │
  │                        │                     │
  ├─ beforeinstallprompt ─→ deferredPrompt=event
  │    event fires         │ isVisible=true  ────┼──→ Banner shows
  │                        │                     │
  │                    [User clicks Install App] │
  │                        │                     │
  │                        ├─ deferredPrompt     │
  │                        │   .prompt()         │
  │                        │                     │
  ├─ Show native dialog ──┬─┼──────────────────────┼──→ (system UI)
  │                       │ │                     │
  │              [User clicks Install]           │
  │                       │ │                     │
  ├─ appinstalled ────────┼→ isInstalled=true
  │    event fires        │ isVisible=false  ────┼──→ Banner hides
  │                       │                      │
  ├─ App installed on home screen/menu           │
```

---

## Performance Considerations

### Bundle Size
- Component code: ~3.4 KB (unminified)
- Minified: ~1.2 KB
- Gzipped: ~600 bytes

### Runtime Performance
- No expensive operations on render path
- Event listeners only attached once
- Proper cleanup prevents memory leaks
- Conditional rendering prevents unnecessary DOM

### Browser Performance
- No blocking operations
- No synchronous DOM writes
- Uses async/await for browser prompts
- No polling or timers

---

## Error Handling Details

### Safety Checks
```typescript
// Guard against null deferredPrompt
if (!deferredPrompt) return;

// Try-catch for unexpected errors
try {
  await deferredPrompt.prompt();
  // ... rest of logic
} catch (error) {
  console.error('Error installing PWA:', error);
}
```

### Logging
```typescript
console.log('PWA install accepted');   // Success case
console.log('PWA install dismissed');  // User canceled
console.error('Error installing PWA:', error);  // Exceptions
```

---

## Testing Approaches

### Unit Testing
```typescript
// Test that event listeners are attached
// Test that state updates correctly
// Test that handlers are called
```

### Integration Testing
```typescript
// Test with real beforeinstallprompt event
// Test user interactions (click buttons)
// Test state transitions
```

### E2E Testing
```typescript
// Test full install flow in Chrome DevTools
// Test on multiple browsers
// Test on mobile devices
```

---

## Browser Compatibility Matrix

| Browser | Version | beforeinstallprompt | appinstalled | display-mode |
|---------|---------|---------------------|--------------|--------------|
| Chrome | 39+ | ✅ | ✅ | ✅ |
| Edge | 79+ | ✅ | ✅ | ✅ |
| Samsung Internet | 5+ | ✅ | ✅ | ✅ |
| Firefox | 104+ | ✅ (Partial) | ✅ (Partial) | ⚠️ |
| Safari | 15.1+ | ❌ | ❌ | ❌ |

---

## Debug Tips

### Enable Logging
```typescript
// Add more detailed logging
const handleBeforeInstallPrompt = (e: Event) => {
  console.log('[InstallBanner] beforeinstallprompt fired', e);
  e.preventDefault();
  setDeferredPrompt(e as BeforeInstallPromptEvent);
  setIsVisible(true);
};
```

### Check Component Rendering
```typescript
// Add console logs to see render calls
console.log('[InstallBanner] Rendering with:', {
  isVisible,
  isInstalled,
  hasDeferredPrompt: !!deferredPrompt
});
```

### Monitor State Changes
```typescript
// Add effect to log state changes
useEffect(() => {
  console.log('[InstallBanner] State updated:', {
    deferredPrompt: !!deferredPrompt,
    isInstalled,
    isVisible
  });
}, [deferredPrompt, isInstalled, isVisible]);
```

---

## Related Components

### ServiceWorkerRegistration.tsx
- Registers the Service Worker
- Must complete before beforeinstallprompt fires
- Independent from InstallBanner

### Footer.tsx
- Has identical install logic (lines 37-106)
- Alternative install entry point
- Both work independently

### Layout.tsx
- Root layout with PWA setup
- No dependencies on InstallBanner
- InstallBanner can be used in any page

---

## Future Enhancement Patterns

### Add Install Attribution
```typescript
const handleInstallClick = async () => {
  // Track which page user installed from
  const source = 'home-page-banner';
  console.log('Install triggered from:', source);

  // ... rest of logic
};
```

### Add Dismissal Persistence
```typescript
const handleDismiss = () => {
  // Remember dismissal in localStorage
  localStorage.setItem('install-banner-dismissed', Date.now().toString());
  setIsVisible(false);
  setDeferredPrompt(null);
};

// In useEffect:
if (localStorage.getItem('install-banner-dismissed')) {
  setIsVisible(false);
}
```

### Add Timed Display
```typescript
useEffect(() => {
  // Only show banner after 5 seconds
  const timer = setTimeout(() => {
    setIsVisible(true);
  }, 5000);

  return () => clearTimeout(timer);
}, [deferredPrompt]);
```

---

## Summary

The InstallBanner component is a well-architected, production-ready React component that:
- Properly manages browser PWA install events
- Maintains clean, predictable state
- Handles edge cases gracefully
- Provides good user experience
- Follows React best practices
- Is type-safe and accessible
