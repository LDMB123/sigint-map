---
name: safari-devtools
description: >
  Expert in Safari 26.0-26.2 Web Inspector, developer tools, debugging workflows,
  SafariDriver automation, LCP/Event Timing timelines, Service Worker inspection,
  worker profiling, Shadow DOM badges, async debugging, and WebDriver enhancements.
  Use for debugging Safari-specific issues, profiling performance, automating
  Safari testing, or leveraging Web Inspector features.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - WebSearch
disable-model-invocation: false
---

# Safari 26.0-26.2 DevTools & Debugging Skill

Expert knowledge of Web Inspector, debugging, and automation features in Safari 26.0 and 26.2.

## LCP in Web Inspector (26.2)

Largest Contentful Paint entries now appear in Timelines:

### Viewing LCP Data
1. Open Web Inspector (Cmd+Option+I)
2. Go to **Timelines** tab
3. Enable **Layout & Rendering** timeline
4. Reload the page
5. LCP entries appear as markers in the timeline
6. Events list shows LCP correlated with rendering work

### Programmatic LCP + Web Inspector
```js
// Monitor LCP in console alongside timeline
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`LCP: ${entry.startTime.toFixed(1)}ms`, {
      element: entry.element?.tagName,
      size: entry.size,
      url: entry.url || '(text)',
      loadTime: entry.loadTime,
      renderTime: entry.renderTime
    });
  }
});
observer.observe({ type: 'largest-contentful-paint', buffered: true });
```

## Event Timing in Web Inspector (26.2)

Track interaction responsiveness:

```js
// Measure INP (Interaction to Next Paint)
let worstINP = 0;
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > worstINP) {
      worstINP = entry.duration;
      console.warn(`New worst interaction: ${entry.name} (${entry.duration}ms)`, {
        inputDelay: entry.processingStart - entry.startTime,
        processingTime: entry.processingEnd - entry.processingStart,
        presentationDelay: entry.startTime + entry.duration - entry.processingEnd,
        target: entry.target
      });
    }
  }
});
observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
```

## Service Worker Debugging (26.0)

### Automatic Inspection
1. Open **Develop** menu > **Inspect Apps and Devices**
2. Service Workers are listed automatically
3. Click to attach debugger
4. Workers pause on registration for breakpoint setup

### Per-Worker Features
- **Breakpoints**: Set breakpoints in individual worker scripts
- **Profiling**: CPU profiling scoped to specific workers
- **Timeline Attribution**: Network/rendering events tagged by worker
- **Console Isolation**: Filter console output per worker

### Debugging Fetch Handlers
```js
// In Service Worker - add strategic breakpoints here
self.addEventListener('fetch', (event) => {
  debugger; // Breakpoint: inspect event.request

  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          debugger; // Breakpoint: cache hit
          return cached;
        }
        debugger; // Breakpoint: cache miss, going to network
        return fetch(event.request);
      })
    );
  }
});
```

## Async Debugging (26.0)

### Step Over Await
Web Inspector now lets you step over `await` expressions synchronously:

```js
async function loadData() {
  const response = await fetch('/api/data');  // Step over lands on next line
  const data = await response.json();         // Not inside the promise
  processData(data);                          // Arrives here directly
}
```

### Async Stack Traces
Full async call stacks displayed in the debugger, connecting:
- Promise chains
- async/await sequences
- setTimeout/setInterval callbacks
- Event listener async flows

## Shadow DOM Inspection (26.0)

### Badges in Elements Panel
- **"Slotted"** badge: Elements distributed into Shadow DOM slots
- **"Assigned"** badge: Elements assigned to specific slots
- Visual hierarchy shows slot distribution clearly

### Inspecting Shadow DOM
```js
// In Console panel
$0.shadowRoot                    // Access shadow root of selected element
$0.shadowRoot.querySelector('slot')  // Find slots
$0.assignedSlot                  // Which slot an element is assigned to
```

## @scope Styles in Web Inspector (26.0)

Web Inspector now displays `@scope` rules with their boundaries:
- Scoping root shown in Rules sidebar
- Scope limits visible
- Cascading behavior represented correctly

## Worker Timeline Data (26.0)

### Import/Export
- Export worker timeline data for offline analysis
- Import previously captured timelines
- Data persists across Inspector sessions

### Timeline Attribution
- Network requests attributed to originating worker
- CPU time per worker tracked
- Memory allocation per worker scope

## SafariDriver Automation (26.0 + 26.2)

### Basic Automation
```python
from selenium import webdriver
from selenium.webdriver.safari.options import Options

options = Options()
driver = webdriver.Safari(options=options)
driver.get("https://example.com")

# Standard WebDriver commands
element = driver.find_element("css selector", ".button")
element.click()
```

### Extension Testing (26.0)
```python
# Custom commands for extension automation
driver.execute_script("safari:extensionCommand", {
    "extensionId": "com.example.extension",
    "command": "activate"
})
```

### Storage Access Testing (26.2)
```python
# Test requestStorageAccess() scenarios
driver.execute_cdp_cmd("setStorageAccess", {
    "key": "storage-access",
    "value": "granted"
})

# Set Permissions extended with storage-access key
driver.execute_cdp_cmd("setPermissions", {
    "descriptor": {
        "name": "storage-access"
    },
    "state": "granted"
})
```

## Web Extensions Debugging

### Extension State Check (26.2)
```swift
// Check if extension is enabled programmatically
let state = try await SFSafariExtensionManager.stateOfExtension(
    withIdentifier: "com.example.extension"
)
if state.isEnabled {
    print("Extension is active")
}
```

### Deep Link to Settings (26.2)
```swift
// Open Safari extension preferences
SFSafariSettings.openExtensionsSettings()
```

### Extension Version (26.2)
```js
// Simplified synchronous version check
const version = browser.runtime.getVersion();
console.log(`Extension v${version}`);
```

## Console Debugging Patterns

### Performance Budgets
```js
// Monitor LCP budget
const LCP_BUDGET = 2500; // ms
new PerformanceObserver((list) => {
  const entry = list.getEntries().pop();
  if (entry.startTime > LCP_BUDGET) {
    console.error(`LCP BUDGET EXCEEDED: ${entry.startTime.toFixed(0)}ms (budget: ${LCP_BUDGET}ms)`);
    console.log('Offending element:', entry.element);
  }
}).observe({ type: 'largest-contentful-paint', buffered: true });

// Monitor INP budget
const INP_BUDGET = 200; // ms
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > INP_BUDGET) {
      console.warn(`Slow interaction: ${entry.name} took ${entry.duration}ms`);
    }
  }
}).observe({ type: 'event', durationThreshold: 16 });
```

### Anchor Position Debugging
```js
// Debug anchor positioning in console
function debugAnchors() {
  document.querySelectorAll('[style*="anchor-name"], [style*="position-anchor"]')
    .forEach(el => {
      const cs = getComputedStyle(el);
      console.log(el, {
        anchorName: cs.getPropertyValue('anchor-name'),
        positionAnchor: cs.getPropertyValue('position-anchor'),
        positionArea: cs.getPropertyValue('position-area'),
        rect: el.getBoundingClientRect()
      });
    });
}
```

### Service Worker State
```js
// Quick SW diagnostics
async function swDiag() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return console.log('No SW registered');
  console.table({
    scope: reg.scope,
    installing: reg.installing?.state,
    waiting: reg.waiting?.state,
    active: reg.active?.state,
    updateViaCache: reg.updateViaCache
  });
}
```

## Debugging Checklist

### CSS Issues
1. Elements panel > Computed tab for resolved values
2. Check `@scope` boundaries in Rules sidebar
3. Verify anchor positioning with element overlays
4. Test `field-sizing` with live DOM editing

### Performance Issues
1. Timelines tab > Layout & Rendering for LCP
2. Event Timing observer for INP measurement
3. Per-worker profiling for SW overhead
4. Memory tab for heap snapshots

### PWA Issues
1. Application tab for manifest parsing
2. SW inspection via Develop > Inspect Apps and Devices
3. Console filtering per worker context
4. Network tab for caching verification

### WebGPU Issues
1. Console for GPU adapter/device errors
2. Check `navigator.gpu.getPreferredCanvasFormat()`
3. Verify shader compilation errors in console
4. Timeline for GPU frame timing
