# InstallPrompt Component

A Svelte 5 PWA install prompt component with automatic detection, intelligent timing, 7-day dismissal persistence, and iOS Safari support.

## Overview

This component handles the complete PWA install user experience:
- Captures the Web API `beforeinstallprompt` event
- Shows intelligent, non-intrusive install prompts
- Respects user dismissals for 7 days
- Detects iOS Safari and provides manual instructions
- Tracks analytics events for install flows
- Accessible with proper ARIA labels and focus management

## Features

### Core PWA Installation
- Automatic detection of installable app state
- Deferred install prompt capture and triggering
- Installation status tracking (installed vs. installable)
- Display mode change detection (standalone mode)

### Smart UI Behavior
- Floating banner at bottom of screen (not modal)
- Automatic show after 3 seconds on site
- Optional scroll requirement trigger
- Automatic hiding after installation
- Non-blocking, dismissible design

### Dismissal Management
- 7-day localStorage persistence on dismiss
- Manual override with `show()` and `hide()` functions
- Automatic cleanup after installation
- Smart expiration detection

### Platform Support
- **Standard browsers**: Shows install prompt via Web API
- **iOS Safari**: Detects and shows manual installation instructions
- **Already installed**: Hides prompt automatically
- **Unsupported browsers**: Gracefully skips

### Analytics Integration
- Tracks successful installs via Google Analytics (gtag)
- Tracks user dismissals
- Tracks iOS manual install button clicks

### Accessibility
- Proper ARIA roles (`role="alert"`)
- Live region support (`aria-live="polite"`)
- Focus management and restoration
- Keyboard navigation support
- High contrast mode support
- Reduced motion support
- Semantic HTML

### Responsive Design
- Desktop layout: Horizontal banner with flex layout
- Mobile layout: Vertical stacking on screens < 640px
- Dark theme support via media queries
- Container queries for adaptive styling

## Usage

### Basic Implementation

Add to your root layout or main page:

```svelte
<script>
  import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';
</script>

<InstallPrompt />
```

### With Custom Timing

```svelte
<InstallPrompt
  minTimeOnSite={10000}
  dismissalDurationDays={14}
  requireScroll={true}
/>
```

### Manual Control

```svelte
<script>
  import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';

  let promptRef;

  function triggerPrompt() {
    promptRef.show();
  }

  function dismissPrompt() {
    promptRef.hide();
  }
</script>

<InstallPrompt bind:this={promptRef} />

<button onclick={triggerPrompt}>Install App</button>
<button onclick={dismissPrompt}>Dismiss</button>
```

## API

### Props

```typescript
interface InstallPromptProps {
  // Delay before showing prompt (milliseconds)
  minTimeOnSite?: number;  // Default: 3000 (3 seconds)

  // Require user scroll before showing
  requireScroll?: boolean;  // Default: false

  // How long to respect dismissal (days)
  dismissalDurationDays?: number;  // Default: 7
}
```

### Exported Functions

#### `show(): void`

Manually show the install prompt, overriding any dismissal status.

```svelte
<script>
  let installPrompt;

  function handleShowPrompt() {
    installPrompt.show();
  }
</script>

<InstallPrompt bind:this={installPrompt} />
<button onclick={handleShowPrompt}>Show Install Prompt</button>
```

#### `hide(): void`

Manually hide the install prompt for 7 days.

```svelte
<script>
  let installPrompt;

  function handleDismissPrompt() {
    installPrompt.hide();
  }
</script>

<InstallPrompt bind:this={installPrompt} />
<button onclick={handleDismissPrompt}>Dismiss for 7 Days</button>
```

## Internal State

The component manages the following reactive state:

```typescript
deferredPrompt: BeforeInstallPromptEvent | null      // Captured install prompt
canInstall: boolean                                   // App is installable
isInstalled: boolean                                  // App is already installed
isDismissed: boolean                                  // User dismissed recently
shouldShow: boolean                                   // Prompt should display
hasScrolled: boolean                                  // User has scrolled
isIOSSafari: boolean                                  // Detected iOS Safari
```

## Event Listeners

### Global Events Captured

- `beforeinstallprompt`: Captures deferred install prompt from browser
- `appinstalled`: Detects successful app installation
- `(display-mode: standalone)`: Detects when app is running as installed

### Event Handlers

- `onclick={handleInstall}`: Triggers the install flow
- `onclick={handleDismiss}`: Dismisses prompt for 7 days
- `onclick={handleIOSInstall}`: Shows iOS manual install instructions

## Storage

### localStorage Keys

- `pwa-install-prompt-dismissed`: Stores timestamp of last dismissal
  - Value: Unix timestamp (milliseconds)
  - Expires: After `dismissalDurationDays` days
  - Cleared: After successful installation

## Styling

### Default Theme

- **Background**: Dark gradient (#030712 → #1a1822)
- **Text**: White
- **Button colors**: White primary, translucent secondary
- **Animations**: Smooth slide-up entry

### Responsive Breakpoints

- **Desktop** (>640px): Horizontal layout
- **Mobile** (<640px): Vertical stacked layout

### Media Query Support

- `prefers-color-scheme: dark`: Adjusted gradient
- `prefers-reduced-motion: reduce`: Disables animations
- `prefers-contrast: more`: Adds borders

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome/Edge 67+ | Full | Web API + deferred prompt |
| Firefox | Partial | No Web API, manual prompt only |
| Safari 15+ | Partial | No Web API, manual on desktop |
| Safari iOS | iOS App Clip | No Web API, manual instructions |
| Opera | Full | Web API support |
| Samsung Internet | Full | Web API support |

## Installation Requirements (Web API)

For the `beforeinstallprompt` event to fire:

1. HTTPS protocol (or localhost for development)
2. Valid Web App Manifest (manifest.json)
3. Service Worker installed and active
4. Icon assets (at least 192px and 512px)
5. `start_url` in manifest
6. Not already installed

## Examples

### With Scroll Requirement

Only show prompt after user scrolls:

```svelte
<InstallPrompt requireScroll={true} minTimeOnSite={5000} />
```

### Delayed Prompt

Wait 30 seconds before showing:

```svelte
<InstallPrompt minTimeOnSite={30000} />
```

### Longer Dismissal Period

Respect dismissal for 30 days instead of 7:

```svelte
<InstallPrompt dismissalDurationDays={30} />
```

### Programmatic Control

Show prompt on specific user action:

```svelte
<script>
  import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';

  let installPrompt;

  function showAfterUserAction() {
    // Show after user explores app
    setTimeout(() => {
      installPrompt.show();
    }, 5000);
  }
</script>

<InstallPrompt bind:this={installPrompt} />
<button onclick={showAfterUserAction}>Trigger Prompt</button>
```

## Analytics Events

The component automatically tracks:

### `pwa_install`
- **Fired**: When user accepts install prompt
- **Category**: engagement
- **Label**: PWA Installed

### `pwa_install_dismissed`
- **Fired**: When user dismisses prompt
- **Category**: engagement
- **Label**: PWA Install Prompt Dismissed

### `pwa_ios_manual_install`
- **Fired**: When iOS user clicks "How to Install"
- **Category**: engagement
- **Label**: iOS Manual Install Instructions

## Svelte 5 Runes

The component uses modern Svelte 5 rune syntax:

```svelte
let deferredPrompt = $state(null);        // Reactive state
let doubled = $derived(count * 2);        // Derived values
$effect(() => { /* ... */ });             // Side effects
export function show() { /* ... */ }      // Exported function
```

## Common Patterns

### Deferred Installation UX

Show prompt after user engages with content:

```svelte
<script>
  import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';

  let installPrompt;
  let userHasInteracted = false;

  function handleUserInteraction() {
    userHasInteracted = true;
    // Show after 3 seconds of engagement
    setTimeout(() => {
      installPrompt.show();
    }, 3000);
  }
</script>

<InstallPrompt bind:this={installPrompt} minTimeOnSite={0} />
```

### Contextual Installation

Show during specific user flows:

```svelte
<script>
  import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';

  let installPrompt;

  function handleStartFavorites() {
    // User started favoriting content
    installPrompt.show();
  }
</script>

<InstallPrompt bind:this={installPrompt} minTimeOnSite={0} />
```

## Accessibility Notes

### Focus Management
- Focus automatically moves to first button when prompt shows
- Focus is restored after dismissal
- Keyboard navigation works with Tab/Shift+Tab

### Screen Readers
- Proper heading hierarchy (h3)
- Descriptive ARIA labels on buttons
- Live region for alert announcement
- SVG icons marked as `aria-hidden`

### Color Contrast
- White text on dark background: 21:1 WCAG AAA
- High contrast mode adds additional borders
- Reduced motion respects user preferences

## Troubleshooting

### Prompt Not Showing

1. Check HTTPS is enabled (or using localhost)
2. Verify Web App Manifest is valid
3. Ensure Service Worker is registered
4. Check that app isn't already installed
5. Verify `beforeinstallprompt` event fires (DevTools)
6. Check localStorage for dismissal flag

### Prompt Shows on Reload

Dismissal flag hasn't been set yet. After user dismisses, it should persist.

### iOS Users See Nothing

Component detects iOS Safari and shows different UI. Tap "How to Install" for instructions. Ensure `share` button exists on iOS.

## Testing

Test in Chrome DevTools:

```javascript
// Manually trigger beforeinstallprompt
const event = new Event('beforeinstallprompt');
window.dispatchEvent(event);

// Check dismissal flag
localStorage.getItem('pwa-install-prompt-dismissed');

// Clear dismissal and force show
localStorage.removeItem('pwa-install-prompt-dismissed');
```

## Performance Considerations

- Uses `IntersectionObserver` for efficient scroll detection
- No layout thrashing with DOM queries
- Minimal animation cost with CSS transitions
- Lazy loads iOS detection only when needed
- Respects reduced motion preferences

## Browser DevTools

View PWA installation status in Chrome DevTools:

1. Application tab → Manifest: Shows manifest.json
2. Service Workers: Shows SW registration
3. Storage → Local Storage: Shows dismissal flag
4. Console: Shows `[PWA]` log messages
