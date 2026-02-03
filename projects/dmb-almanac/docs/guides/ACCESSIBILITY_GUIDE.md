# DMB Almanac Accessibility Guide

## WCAG 2.1 AA Compliance

### Verified
- ARIA labels across components
- Full keyboard navigation
- Screen reader support (semantic HTML + ARIA)
- Color contrast WCAG AA compliant (text 4.5:1, UI 3:1)
- Focus management with visible indicators

### Key Fix: ErrorFallback.svelte
```diff
- <a href="/" class="home-button" type="button">
+ <a href="/" class="home-button">
```
- Removed invalid `type="button"` from `<a>` tag
- Fixes WCAG 4.1.2 (Name, Role, Value) - screen readers now announce "Link, Go Home" instead of "Link, type button, Go Home"

## Semantic HTML Patterns

### Correct Patterns
```svelte
<!-- Navigation (href) -->
<a href="/path">Link text</a>

<!-- Action (onclick) -->
<button type="button" onclick={action}>Button text</button>

<!-- Navigation styled as button (CSS only) -->
<a href="/path" class="button-style">Go</a>
<style>
  .button-style {
    display: inline-flex;
    padding: 0.5rem 1rem;
    background: blue;
    color: white;
  }
</style>
```

### Anti-Patterns (never use)
```svelte
<a href="/path" type="button">NO</a>          <!-- type on links -->
<button onclick={() => goto('/path')}>NO</button> <!-- button for nav -->
<a onclick={action}>NO</a>                     <!-- link without href -->
```

## Screen Reader Testing

### Test Environment

| Platform | Browsers | Screen Reader |
|----------|----------|---------------|
| Windows 10/11 | Chrome/Edge/Firefox | NVDA (free), JAWS (licensed) |
| macOS 12+ | Safari/Chrome | VoiceOver (built-in) |
| Linux | Firefox/Chrome | Orca (`sudo apt-get install orca`) |

### NVDA (Windows)

#### Setup
- Download: https://www.nvaccess.org/download/
- Start: `CTRL + ALT + N` (hear beep after 2s)

#### Shortcuts
| Action | Keys |
|--------|------|
| Start/Stop | CTRL + ALT + N |
| Next heading | H |
| Previous heading | SHIFT + H |
| Next button | B |
| Next link | K |
| Read page | CTRL + Home then CTRL + A |
| Copy announcement | NVDA Key + C |
| Virtual cursor toggle | NVDA Key + Space |
| Event Log | NVDA Key + F12 |

- NVDA Key = Insert (or CapsLock if configured)

### VoiceOver (macOS)

#### Setup
- `CMD + F5` to enable (hear "VoiceOver on")

#### Shortcuts
| Action | Keys |
|--------|------|
| VO Key | Control + Option |
| Next/Prev item | VO + Right/Left Arrow |
| Click item | VO + Space |
| Open rotor | VO + U |
| Read all | VO + A |

#### Rotor Navigation
- `VO + U` to open rotor
- Left/Right arrows to change categories (Headings, Status)
- Enter to jump to item
- Settings: System Preferences > Accessibility > VoiceOver > Verbosity

### JAWS (Windows)

#### Setup
- JAWS 2024+, Windows 10/11, licensed
- Start: `Windows Key + Alt + Down`

#### Shortcuts
| Action | Keys |
|--------|------|
| Start/Stop | Windows Key + Alt + Down |
| Next heading | H |
| Next link | L |
| Next button | B |
| Next form field | F |
| Read line | Insert + Up |
| Read all | Insert + Down |
| Form mode | Numpad Plus |
| Browse mode | Numpad Minus |
| Event Log | Insert + F12 |

## Search Component Tests

### Test 1: Search Loading
- Navigate to `http://localhost:5173/search`
- Tab to search input, type "crash" (triggers after 300ms debounce)
- Should hear: "Searching for crash"
- After ~500ms: "Found 12 results: 1 song, 5 shows, 2 venues, 3 tours, 1 guest"

### Test 2: Empty Results
- Clear input (`CTRL+A`, Delete), type "xyzabc"
- Should hear: "No results found for 'xyzabc'" + "Try a different search term"

### Test 3: Keyboard Navigation
- Tab to first result after search
- Down arrow through results - each announced with title/metadata
- Enter to navigate to result page

### Test 4: Offline State
- DevTools (F12) > Network > check "Offline"
- Trigger search
- Should hear: "Error: You are offline and local data is not available..."

## Testing Checklist

### Pre-Testing
- [ ] Screen reader installed
- [ ] Browser cache cleared
- [ ] Extensions disabled
- [ ] Quiet environment / headphones

### Keyboard
- [ ] Full keyboard-only operation
- [ ] Logical tab order
- [ ] Visible focus indicator on all controls
- [ ] Results navigable with Tab/arrows
- [ ] No keyboard traps

### Screen Reader Announcements
- [ ] Page heading announced correctly
- [ ] Search input has label
- [ ] Loading announcement includes query
- [ ] Results announcement includes count + categories
- [ ] Empty results message with suggestion
- [ ] Error announced (assertive priority) when offline
- [ ] Results grouped with section headings
- [ ] No duplicate announcements
- [ ] Announcements timed correctly, no overlap

### Visual
- [ ] Focus outline visible
- [ ] Colors have sufficient contrast
- [ ] Visual feedback matches announcements

### DevTools Verification
- Elements tab: verify `role="status"`, `aria-live="polite"/"assertive"`, `aria-atomic="true"`
- Console tab: filter to errors
- Event Listeners tab: verify subscription cleanup

## Testing Tools
- **Color Contrast**: WebAIM Contrast Checker (text 4.5:1, UI 3:1)
- **ARIA Validation**: axe DevTools, WAVE, Lighthouse (all free)
- **Performance**: Chrome DevTools Lighthouse Accessibility tab

## Common Issues

### Not Announcing
- Check console for errors (F12)
- Verify announcement component in DOM
- Check `aria-live` attribute set correctly
- Try different screen reader

### Duplicate Announcements
- Check for multiple Announcement components
- Verify effects cleanup (return unsubscribe)
- Review announcement hook config

### Keyboard Navigation Broken
- Check no `tabindex="-1"` on interactive elements
- Verify not hidden with `display: none`
- Remove mouse-only JS handlers

## Testing Schedule
- **Pre-release**: NVDA + VoiceOver + keyboard nav + Lighthouse
- **Each release**: All screen readers + WCAG validation (axe)
- **Each PR**: axe scan + keyboard check + console error check

## Resources
- NVDA: https://www.nvaccess.org/download/
- JAWS: https://www.freedomscientific.com/
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- Status Messages: https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html
- ARIA Practices: https://www.w3.org/WAI/ARIA/apg/
- axe DevTools: https://www.deque.com/axe/devtools/
- WAVE: https://wave.webaim.org/
