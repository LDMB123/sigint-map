---
title: Screen Wake Lock API
category: Web APIs
tags: [screen, wake-lock, power, chromium143+]
description: Prevent device screen from dimming or locking
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# Screen Wake Lock API

Enables web applications to request that the device screen remain active and not dim or lock, useful for hands-free scenarios like video playback, navigation, or long-form reading.

## When to Use

- **Video playback** — Keep screen on during video
- **Navigation apps** — Prevent screen lock while navigating
- **Presentation mode** — Keep display active during presentations
- **Cooking apps** — Screen stays on while reading recipe
- **Reading apps** — Prevent sleep during extended reading
- **Fitness tracking** — Keep screen on during workouts
- **Real-time data display** — Dashboard monitoring

## Core Concepts

```typescript
interface WakeLockSentinel {
  release(): Promise<void>;
  readonly released: boolean;
  addEventListener(type: 'release', listener: EventListener): void;
}

interface WakeLock {
  request(type?: 'screen'): Promise<WakeLockSentinel>;
}

interface Navigator {
  wakeLock: WakeLock;
}
```

## Basic Usage

### Request Screen Wake Lock

```typescript
async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    const sentinel = await navigator.wakeLock.request('screen');
    console.log('Wake lock acquired');
    return sentinel;
  } catch (error) {
    console.error('Wake lock error:', error);
    return null;
  }
}

// Usage
const wakeLock = await requestWakeLock();
```

### Release Wake Lock

```typescript
async function releaseWakeLock(sentinel: WakeLockSentinel): Promise<void> {
  try {
    await sentinel.release();
    console.log('Wake lock released');
  } catch (error) {
    console.error('Release error:', error);
  }
}

// Usage
if (wakeLock) {
  await releaseWakeLock(wakeLock);
}
```

## Practical Patterns

### Video Player

```typescript
class VideoPlayer {
  private videoElement: HTMLVideoElement;
  private wakeLock: WakeLockSentinel | null = null;
  private isPlaying = false;

  constructor(videoSelector: string) {
    this.videoElement = document.querySelector(videoSelector) as HTMLVideoElement;

    this.videoElement.addEventListener('play', () => this.onPlay());
    this.videoElement.addEventListener('pause', () => this.onPause());
    this.videoElement.addEventListener('ended', () => this.onEnded());
  }

  private async onPlay(): Promise<void> {
    this.isPlaying = true;

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('Screen locked while playing');
    } catch (error) {
      console.error('Failed to acquire wake lock:', error);
    }
  }

  private async onPause(): Promise<void> {
    this.isPlaying = false;

    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('Screen lock released on pause');
      } catch (error) {
        console.error('Failed to release wake lock:', error);
      }
    }
  }

  private async onEnded(): Promise<void> {
    await this.onPause();
  }

  async destroy(): Promise<void> {
    if (this.wakeLock) {
      await this.wakeLock.release();
    }
  }
}

// Usage
const player = new VideoPlayer('video');
// Video plays, screen stays on
// Video pauses, screen can dim
```

### Navigation App

```typescript
class NavigationApp {
  private wakeLock: WakeLockSentinel | null = null;
  private isNavigating = false;

  async startNavigation(): Promise<void> {
    this.isNavigating = true;

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('Navigation started, screen locked');

      // Listen for app becoming visible/hidden
      document.addEventListener('visibilitychange', () => {
        this.handleVisibilityChange();
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }

  private async handleVisibilityChange(): Promise<void> {
    if (document.hidden) {
      // App is hidden, system will dim screen anyway
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
      }
    } else if (this.isNavigating) {
      // App is visible and still navigating, re-acquire lock
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (error) {
        console.error('Failed to re-acquire wake lock:', error);
      }
    }
  }

  async endNavigation(): Promise<void> {
    this.isNavigating = false;

    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('Navigation ended, screen can dim');
      } catch (error) {
        console.error('Release error:', error);
      }
    }

    document.removeEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
  }
}

// Usage
const nav = new NavigationApp();

document.querySelector('button.start-nav')?.addEventListener('click', () => {
  nav.startNavigation();
});

document.querySelector('button.end-nav')?.addEventListener('click', () => {
  nav.endNavigation();
});
```

### Cooking Recipe Display

```typescript
class RecipeDisplay {
  private recipePage: HTMLElement;
  private wakeLock: WakeLockSentinel | null = null;
  private touchTimeout: number | null = null;

  constructor(recipeSelector: string) {
    this.recipePage = document.querySelector(recipeSelector) as HTMLElement;

    // Request wake lock when page loads
    this.init();

    // Re-acquire wake lock on user activity
    this.recipePage.addEventListener('click', () => this.handleActivity());
    this.recipePage.addEventListener('touchstart', () => this.handleActivity());
  }

  private async init(): Promise<void> {
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('Recipe display: screen lock enabled');
    } catch (error) {
      console.error('Wake lock error:', error);
    }
  }

  private handleActivity(): void {
    // Clear existing timeout
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
    }

    // Re-acquire wake lock if released
    if (!this.wakeLock) {
      this.init();
    }

    // Schedule re-lock if no activity for 1 minute
    this.touchTimeout = window.setTimeout(() => {
      this.init();
    }, 60000);
  }

  async cleanup(): Promise<void> {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }

    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
    }
  }
}

// Usage
const recipe = new RecipeDisplay('div.recipe');

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  recipe.cleanup();
});
```

## Wake Lock Lifecycle

```typescript
class WakeLockManager {
  private sentinel: WakeLockSentinel | null = null;

  async acquire(): Promise<void> {
    if (this.sentinel && !this.sentinel.released) {
      console.log('Wake lock already active');
      return;
    }

    try {
      this.sentinel = await navigator.wakeLock.request('screen');

      // Listen for release events
      this.sentinel.addEventListener('release', () => {
        console.log('Wake lock was released');
        this.onReleased();
      });

      console.log('Wake lock acquired');
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          console.log('Wake lock not allowed (document not visible)');
        } else if (error.name === 'NotSupportedError') {
          console.log('Wake lock not supported');
        }
      }
    }
  }

  async release(): Promise<void> {
    if (this.sentinel && !this.sentinel.released) {
      await this.sentinel.release();
      this.sentinel = null;
    }
  }

  isActive(): boolean {
    return this.sentinel?.released === false;
  }

  private onReleased(): void {
    console.log('Wake lock manager: lock released');
    this.sentinel = null;

    // Handle logic when lock is released
  }
}

// Usage
const wakeLockManager = new WakeLockManager();

await wakeLockManager.acquire();
console.log('Is active?', wakeLockManager.isActive());

// ... later ...
await wakeLockManager.release();
```

## Visibility and State Management

```typescript
class ResponsiveWakeLock {
  private sentinel: WakeLockSentinel | null = null;
  private shouldMaintain = true;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    window.addEventListener('beforeunload', () => {
      this.release();
    });
  }

  private async handleVisibilityChange(): Promise<void> {
    if (document.hidden) {
      // Page hidden: release wake lock
      await this.release();
    } else if (this.shouldMaintain) {
      // Page visible and should maintain: re-acquire
      await this.acquire();
    }
  }

  async acquire(): Promise<void> {
    if (this.sentinel && !this.sentinel.released) {
      return;  // Already active
    }

    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      console.log('Wake lock acquired');
    } catch (error) {
      console.error('Failed to acquire wake lock:', error);
    }
  }

  async release(): Promise<void> {
    if (this.sentinel) {
      await this.sentinel.release();
      this.sentinel = null;
      console.log('Wake lock released');
    }
  }

  setMaintain(maintain: boolean): void {
    this.shouldMaintain = maintain;

    if (maintain && !document.hidden) {
      this.acquire();
    } else {
      this.release();
    }
  }
}

// Usage
const wakeLock = new ResponsiveWakeLock();

// Start navigation
await wakeLock.acquire();

// User switches to another app
// Wake lock automatically released

// User returns to app
// Wake lock automatically re-acquired
```

## Feature Detection and Fallback

```typescript
function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

async function requestWakeLockSafe(): Promise<boolean> {
  if (!isWakeLockSupported()) {
    console.log('Wake Lock API not supported');
    return false;
  }

  try {
    await navigator.wakeLock.request('screen');
    return true;
  } catch (error) {
    console.error('Wake lock error:', error);
    return false;
  }
}

// Fallback for unsupported browsers
async function preventScreenLockFallback(): Promise<void> {
  if (!isWakeLockSupported()) {
    // Fallback: play silent video loop to keep screen on
    const video = document.createElement('video');
    video.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc2F2YzEAAAAA...';
    video.loop = true;
    video.play();

    document.body.appendChild(video);
    video.style.display = 'none';
  }
}
```

## Error Handling

```typescript
async function robustWakeLock(): Promise<void> {
  try {
    if (!('wakeLock' in navigator)) {
      console.log('Wake Lock API not available');
      return;
    }

    const sentinel = await navigator.wakeLock.request('screen');

    sentinel.addEventListener('release', () => {
      console.log('Wake lock released by system');
    });

    console.log('Wake lock acquired successfully');
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          console.log('Document must be visible to acquire wake lock');
          break;
        case 'NotSupportedError':
          console.log('Wake Lock API not supported on this device');
          break;
        case 'InvalidStateError':
          console.log('Document not in appropriate state');
          break;
        default:
          console.error('Wake Lock error:', error.message);
      }
    }
  }
}
```

## Browser Support

**Chromium 143+ baseline** — Screen Wake Lock API is fully supported on all major platforms including macOS, Windows, ChromeOS, Android, and iOS.

**Note:**
- Requires secure context (HTTPS or localhost)
- Document must be visible to acquire lock
- Screen wake lock may be released if user enables battery saver
- Some platforms may override with device settings

## Platform-Specific Behavior

```typescript
class PlatformAwareWakeLock {
  private sentinel: WakeLockSentinel | null = null;
  private isLowPowerMode = false;

  async acquire(): Promise<void> {
    // Check battery status
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      this.isLowPowerMode = battery.level < 0.2;

      if (this.isLowPowerMode) {
        console.log('Low power mode: wake lock may be limited');
      }
    }

    try {
      this.sentinel = await navigator.wakeLock.request('screen');
    } catch (error) {
      console.error('Wake lock error:', error);
    }
  }

  async release(): Promise<void> {
    if (this.sentinel) {
      await this.sentinel.release();
      this.sentinel = null;
    }
  }
}
```

## Related APIs

- **Permissions API** — Request wake lock permissions
- **Battery Status API** — Check device battery level
- **Screen API** — Screen orientation and brightness
- **User Activation API** — Detect user interaction
