---
name: safari-web-apis
description: >
  Expert in Safari 26.0-26.2 Web APIs including Navigation API, Event Timing,
  Largest Contentful Paint, Digital Credentials, URL Pattern, Cookie Store,
  Trusted Types, scrollend events, View Transitions, WebAuthn Signal, CHIPS,
  and File System WritableStream. Use for Safari-compatible web app development,
  performance measurement, or progressive enhancement with new platform APIs.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - WebSearch
disable-model-invocation: false
---

# Safari 26.0-26.2 Web APIs Skill

Expert knowledge of Web Platform APIs shipping in Safari 26.0 and 26.2.

## Navigation API (26.2)

Modern replacement for `popstate`/`hashchange`:

```js
// Intercept all navigations
navigation.addEventListener('navigate', (event) => {
  if (!event.canIntercept) return;

  const url = new URL(event.destination.url);

  if (url.pathname.startsWith('/app/')) {
    event.intercept({
      async handler() {
        const content = await fetchPage(url.pathname);
        document.getElementById('main').innerHTML = content;
      }
    });
  }
});

// Programmatic navigation with state
await navigation.navigate('/app/dashboard', {
  state: { tab: 'overview' },
  history: 'push'
});

// Access current entry state
const currentState = navigation.currentEntry.getState();

// Navigate back/forward
navigation.back();
navigation.forward();
navigation.traverseTo(entry.key);
```

## Event Timing API (26.2)

Measure interaction responsiveness (INP):

```js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`Event: ${entry.name}`);
    console.log(`  Processing start: ${entry.processingStart}ms`);
    console.log(`  Processing end: ${entry.processingEnd}ms`);
    console.log(`  Duration: ${entry.duration}ms`);
    console.log(`  Input delay: ${entry.processingStart - entry.startTime}ms`);
    console.log(`  Presentation delay: ${entry.startTime + entry.duration - entry.processingEnd}ms`);
  }
});

observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
```

## Largest Contentful Paint (26.2)

```js
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];

  console.log('LCP element:', lastEntry.element);
  console.log('LCP time:', lastEntry.startTime);
  console.log('LCP size:', lastEntry.size);
  console.log('LCP URL:', lastEntry.url); // for images
});

observer.observe({ type: 'largest-contentful-paint', buffered: true });
```

## Digital Credentials API (26.0)

Identity document verification:

```js
// Request identity credential
const credential = await navigator.credentials.get({
  digital: {
    providers: [{
      protocol: "openid4vp",
      request: {
        // OpenID4VP request parameters
        client_id: "https://example.com",
        response_type: "vp_token",
        presentation_definition: {
          input_descriptors: [{
            id: "age_verification",
            constraints: { /* ... */ }
          }]
        }
      }
    }]
  }
});

// Check protocol support
const supported = await DigitalCredential.userAgentAllowsProtocol("openid4vp");
```

## URL Pattern API (26.0)

```js
// Create patterns
const pattern = new URLPattern({
  pathname: '/users/:id/posts/:postId'
});

// Test against URLs
pattern.test('https://example.com/users/42/posts/101'); // true

// Extract groups
const result = pattern.exec('https://example.com/users/42/posts/101');
console.log(result.pathname.groups); // { id: '42', postId: '101' }

// Wildcard patterns
const apiPattern = new URLPattern({
  pathname: '/api/v:version/*'
});

// Protocol-specific
const securePattern = new URLPattern({
  protocol: 'https',
  hostname: '*.example.com'
});
```

## Cookie Store API (26.2 enhancements)

```js
// Get a cookie
const cookie = await cookieStore.get('session');
console.log(cookie?.value);

// Set a cookie (26.2: empty path support)
await cookieStore.set({
  name: 'preference',
  value: 'dark-mode',
  path: '',           // empty string path now supported
  expires: Date.now() + 86400000,
  sameSite: 'lax'
});

// 26.2: Stricter prefix validation
// __Host- cookies must have path="/" and secure=true
await cookieStore.set({
  name: '__Host-session',
  value: 'abc123',
  path: '/',
  secure: true  // required for __Host- prefix
});

// Delete
await cookieStore.delete('preference');

// Listen for changes
cookieStore.addEventListener('change', (event) => {
  for (const cookie of event.changed) {
    console.log(`Cookie changed: ${cookie.name}=${cookie.value}`);
  }
});
```

## CHIPS - Partitioned Cookies (26.2)

Third-party cookies partitioned per top-level site:

```http
Set-Cookie: widget_session=abc123; SameSite=None; Secure; Partitioned
```

```js
// Set partitioned cookie via Cookie Store API
await cookieStore.set({
  name: 'widget_session',
  value: 'abc123',
  sameSite: 'none',
  secure: true,
  partitioned: true
});
```

Key rules:
- Requires `SameSite=None` and `Secure`
- Partitioned by top-level site (eTLD+1), not origin
- Each top-level site gets its own cookie jar for the third party
- Preserves privacy while enabling embedded widget state

## Trusted Types API (26.0)

XSS prevention:

```js
// Define a policy
const escapePolicy = trustedTypes.createPolicy('escape', {
  createHTML: (input) => DOMPurify.sanitize(input),
  createScriptURL: (input) => {
    const url = new URL(input, location.origin);
    if (url.origin === location.origin) return url.href;
    throw new TypeError('Untrusted URL');
  }
});

// Use the policy
element.innerHTML = escapePolicy.createHTML(userInput);

// Enforce via CSP header
// Content-Security-Policy: require-trusted-types-for 'script'
```

## scrollend Event (26.2)

```js
// Fires when scrolling definitively stops
element.addEventListener('scrollend', (event) => {
  console.log('Scroll ended at:', element.scrollTop);
  // Safe to measure final scroll position
  updateVisibleItems();
});

// Works with CSS scroll-snap
const carousel = document.querySelector('.carousel');
carousel.addEventListener('scrollend', () => {
  const snapIndex = Math.round(carousel.scrollLeft / carousel.offsetWidth);
  updateIndicator(snapIndex);
});
```

## View Transitions (26.2 enhancement)

```js
// 26.2: Access active transition
const transition = document.activeViewTransition;

// Start a view transition
document.startViewTransition(async () => {
  await updateDOM();
});
```

## caretPositionFromPoint (26.2)

```js
// Convert screen coordinates to text position
document.addEventListener('click', (e) => {
  const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
  if (pos) {
    console.log('Clicked in node:', pos.offsetNode);
    console.log('At offset:', pos.offset);
  }
});
```

## Fractional Pointer/Touch Coordinates (26.2)

```js
// Sub-pixel precision for high-DPI displays
element.addEventListener('pointermove', (e) => {
  // Now returns fractional values like 142.5, 300.75
  console.log(`Precise position: ${e.clientX}, ${e.clientY}`);
  console.log(`Page: ${e.pageX}, ${e.pageY}`);
  console.log(`Offset: ${e.offsetX}, ${e.offsetY}`);
});
```

## Web Animations: overallProgress (26.2)

```js
const animation = element.animate(
  [{ opacity: 0 }, { opacity: 1 }],
  { duration: 1000, iterations: 3 }
);

// 0-1 range across all iterations
requestAnimationFrame(function check() {
  console.log('Progress:', animation.overallProgress); // 0.0 to 1.0
  if (animation.playState === 'running') {
    requestAnimationFrame(check);
  }
});

// commitStyles works on completed animations (26.2)
animation.onfinish = () => {
  animation.commitStyles(); // now works even after completion
};
```

## Button Commands (26.2 HTML)

Declarative button-to-element control:

```html
<!-- Popover control -->
<button commandfor="my-popover" command="toggle-popover">Menu</button>
<div id="my-popover" popover>Popover content</div>

<!-- Dialog control -->
<button commandfor="my-dialog" command="show-modal">Open</button>
<dialog id="my-dialog">
  <p>Dialog content</p>
  <button commandfor="my-dialog" command="close">Close</button>
</dialog>

<!-- Custom commands -->
<button commandfor="my-widget" command="--refresh">Refresh</button>
<script>
  document.getElementById('my-widget').addEventListener('command', (e) => {
    if (e.command === '--refresh') {
      refreshWidget();
    }
  });
</script>
```

Predefined commands: `show-modal`, `close`, `request-close`, `show-popover`, `hide-popover`, `toggle-popover`.

## hidden="until-found" (26.2)

```html
<!-- Content hidden until find-in-page or fragment navigation -->
<div hidden="until-found" id="section3">
  <p>This content is discoverable by find-in-page</p>
</div>

<script>
  // Fires before content is revealed
  document.querySelector('[hidden="until-found"]')
    .addEventListener('beforematch', (e) => {
      console.log('Content about to be revealed');
    });
</script>

<!-- Also auto-expands <details> during search -->
<details>
  <summary>FAQ</summary>
  <p>Answer that can be found via Cmd+F</p>
</details>
```

## IntersectionObserver scrollMargin (26.0)

```js
const observer = new IntersectionObserver(callback, {
  scrollMargin: '100px',  // trigger 100px before entering viewport
  threshold: 0
});
```

## WebAuthn Signal API (26.0)

```js
// Signal credential state changes to authenticators
await PublicKeyCredential.signalUnknownCredential({
  rpId: 'example.com',
  credentialId: credId
});

await PublicKeyCredential.signalCurrentUserDetails({
  rpId: 'example.com',
  userId: userId,
  name: 'newUsername',
  displayName: 'New Display Name'
});
```

## File System WritableStream (26.0)

```js
// Direct file writing
const handle = await window.showSaveFilePicker();
const writable = await handle.createWritable();
await writable.write('Hello, World!');
await writable.close();
```

## Feature Detection

```js
// Navigation API
if ('navigation' in window) { /* supported */ }

// Event Timing
if (PerformanceObserver.supportedEntryTypes.includes('event')) { /* supported */ }

// LCP
if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) { /* supported */ }

// URL Pattern
if ('URLPattern' in window) { /* supported */ }

// Cookie Store
if ('cookieStore' in window) { /* supported */ }

// Trusted Types
if ('trustedTypes' in window) { /* supported */ }

// scrollend
if ('onscrollend' in window) { /* supported */ }

// Button commands
if ('command' in HTMLButtonElement.prototype) { /* supported */ }

// hidden=until-found
if ('onbeforematch' in document.body) { /* supported */ }
```

## Cross-Browser Status

| API | Safari 26.2 | Chrome 131+ | Firefox 135+ |
|-----|------------|-------------|--------------|
| Navigation API | Yes | Yes (102+) | No |
| Event Timing | Yes | Yes (76+) | No |
| LCP | Yes | Yes (77+) | No |
| URL Pattern | Yes | Yes (95+) | No |
| Cookie Store | Yes | Yes (87+) | No |
| CHIPS | Yes | Yes (114+) | No |
| Trusted Types | Yes | Yes (83+) | No |
| scrollend | Yes | Yes (114+) | Yes (109+) |
| Button commands | Yes | Yes (131+) | No |
| hidden=until-found | Yes | Yes (102+) | No |
| View Transitions | Partial | Yes (111+) | No |
| caretPositionFromPoint | Yes | Via caretRangeFromPoint | Yes |
