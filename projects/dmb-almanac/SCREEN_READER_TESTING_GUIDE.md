# Screen Reader Testing Guide - DMB Almanac Search Announcements

## Overview

This guide provides step-by-step instructions for testing the new screen reader announcements in DMB Almanac with real assistive technology.

## Test Environment Setup

### Windows
- **OS**: Windows 10/11
- **Browsers**: Chrome, Edge, Firefox
- **Screen Readers**: NVDA (free), JAWS (licensed)

### macOS
- **OS**: macOS 12+
- **Browsers**: Safari, Chrome
- **Screen Reader**: VoiceOver (built-in)

### Linux
- **Browsers**: Firefox, Chrome
- **Screen Reader**: Orca (included in most distributions)

---

## 1. Testing with NVDA (Windows - Free)

### Installation
1. Download from https://www.nvaccess.org/download/
2. Run installer, follow defaults
3. Restart computer (recommended but not required)

### Launch Search Page
1. Press `CTRL + ALT + N` to start NVDA
2. Wait 2 seconds for startup (you'll hear beep)
3. Navigate to `http://localhost:5173/search`
4. Press `CTRL + L` to focus address bar if needed

### Test 1: Search Loading Announcement
```
Expected: NVDA announces "Searching for [query]"

Steps:
1. Press Tab to focus search input
2. Type "crash" (this triggers search after 300ms debounce)
3. LISTEN: Should hear "Searching for 'crash'"
4. Wait 500ms for results
5. LISTEN: Should hear "Found X results: Y song, Z shows..."
```

**What You Should Hear**:
- "Search input, edit text"
- (type "crash")
- "Searching for crash" (after 300ms)
- "Found 12 results: 1 song, 5 shows, 2 venues, 3 tours, 1 guest"

### Test 2: Empty Results Announcement
```
Expected: NVDA announces "No results found" with suggestion

Steps:
1. Clear current search (CTRL + A, Delete)
2. Type something that returns no results: "xyzabc"
3. LISTEN: Should hear "No results found for 'xyzabc'"
```

**What You Should Hear**:
- "No results found for 'xyzabc'"
- "Try a different search term"

### Test 3: Keyboard Navigation
```
Expected: Results are navigable with Tab and arrow keys

Steps:
1. Complete a search that returns results
2. Press Tab to focus first result
3. Press Down arrow to move through results
4. Verify each result is announced with title and metadata
5. Press Enter to navigate to result page
```

**What You Should Hear**:
- Result title and description
- Link heading
- Page content when navigating

### Test 4: Offline State Announcement
```
Expected: Error announcement when offline

Steps:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Trigger a search
5. LISTEN: Should hear error message
```

**What You Should Hear**:
- "Error: You are offline and local data is not available..."

### NVDA Keyboard Shortcuts
| Action | Keys |
|--------|------|
| Start NVDA | CTRL + ALT + N |
| Stop NVDA | CTRL + ALT + N |
| Next heading | H |
| Previous heading | SHIFT + H |
| Next button | B |
| Next link | K |
| Read entire page | CTRL + Home then CTRL + A |
| Copy announcement text* | NVDA Key + C |
| Virtual cursor on/off | NVDA Key + Space |

*NVDA Key = Insert key (or CapsLock if configured)

### NVDA Event Log
To review announcements you missed:
1. Press `NVDA Key + F12` to open Event Log
2. Scroll through recent events
3. Look for "Status" role announcements
4. Close with Alt+F4

---

## 2. Testing with VoiceOver (macOS - Built-in)

### Launch VoiceOver
1. Press `CMD + F5` to enable VoiceOver
2. Wait for startup (you'll hear "VoiceOver on")
3. Open browser to `http://localhost:5173/search`

### Navigation Keys
| Action | Keys |
|--------|------|
| VoiceOver Key (VO) | Control + Option |
| Next item | VO + Right Arrow |
| Previous item | VO + Left Arrow |
| Click item | VO + Space |
| Open rotor | VO + U |
| Read all | VO + A |

### Test 1: Search Loading Announcement
```
Expected: VoiceOver announces "Searching for [query]"

Steps:
1. Press VO + Right Arrow until you reach search input
2. Type "crash"
3. LISTEN: Should hear "Searching for 'crash'"
4. Wait for results
5. LISTEN: Should hear "Found X results..."
```

**What You Should Hear**:
- "Search DMB database, search field"
- (type "crash")
- "Searching for crash"
- "Found 12 results..."

### Test 2: Rotor Navigation
To see all announcements and headings:
1. Press `VO + U` to open rotor
2. Use Left/Right arrows to change categories
3. Select "Headings" to see page structure
4. Select "Status" to see announcements
5. Press Enter to jump to item

### Test 3: VoiceOver Settings
To adjust speech rate (if announcements feel too fast):
1. Open System Preferences
2. Go to Accessibility > VoiceOver > Verbosity
3. Adjust "Speaking Rate"
4. Test again

---

## 3. Testing with JAWS (Windows - Paid)

### Requirements
- JAWS 2024 or newer
- Windows 10/11
- Licensed version (academic/trial available)

### Launch JAWS
1. Press `Windows Key + Alt + Down` to enable JAWS
2. Wait for startup
3. Open Chrome/Edge to `http://localhost:5173/search`

### Key Combinations
| Action | Keys |
|--------|------|
| Start/Stop JAWS | Windows Key + Alt + Down |
| Next heading | H |
| Next link | L |
| Next button | B |
| Next form field | F |
| Read line | Insert + Up |
| Read all | Insert + Down |
| Form mode | Numpad Plus |
| Browse mode | Numpad Minus |
| Event Log | Insert + F12 |

### Test 1: Search Announcement
```
Steps:
1. Press Tab to focus search input (should say "Search input, edit")
2. Type "crash"
3. LISTEN: Should hear "Searching for crash"
4. Wait for results
5. LISTEN: Should hear "Found X results..."
```

### Test 2: Event Log
To review announcements:
1. Press `Insert + F12` to open Event Log
2. Look for "Status" events
3. Review announcement text
4. Close dialog

---

## 4. Testing with Orca (Linux)

### Installation
```bash
# Ubuntu/Debian
sudo apt-get install orca

# Fedora
sudo dnf install orca

# Arch
sudo pacman -S orca
```

### Launch
1. Open Settings > Universal Access > Accessibility
2. Toggle "Accessibility" ON
3. Click "Screen Reader" toggle
4. Open Firefox to test page

### Test Procedure
Same as NVDA (Orca is similar)
- Tab through controls
- Listen for status announcements
- Use H for headings, K for links

---

## Complete Testing Checklist

### Pre-Testing
- [ ] Install screen reader
- [ ] Clear browser cache
- [ ] Disable other browser extensions
- [ ] Close unnecessary apps (reduce noise)
- [ ] Use headphones or quiet environment

### Search Announcements
- [ ] Loading announcement heard when search starts
- [ ] Loading message includes search query
- [ ] Results announcement heard after search completes
- [ ] Results message includes count and categories
- [ ] Empty results message heard when no matches
- [ ] Empty message suggests trying different term

### Error Announcements
- [ ] Error announced when offline
- [ ] Error announced when network fails
- [ ] Error message is clear and actionable
- [ ] Error uses assertive priority (interrupts)

### Keyboard Navigation
- [ ] Can search with keyboard only (no mouse)
- [ ] Tab order is logical (left to right, top to bottom)
- [ ] Focus indicator visible on all controls
- [ ] Can navigate results with Tab/arrow keys
- [ ] Can select results with Enter/Space
- [ ] No keyboard traps (can always escape)

### Screen Reader Integration
- [ ] Page heading announced correctly
- [ ] Search input has label
- [ ] Results grouped with section headings
- [ ] No duplicate announcements
- [ ] Announcements are concise and clear
- [ ] Announcements appear at right time

### Timing
- [ ] Loading announcement appears immediately
- [ ] Results announcement appears after results load
- [ ] Announcement stays visible long enough to read
- [ ] No announcements compete/overlap

### Performance
- [ ] No console errors (F12)
- [ ] Page responds quickly to input
- [ ] Search completes within 2 seconds
- [ ] No lag when announcing

### Appearance
- [ ] Visual feedback matches announcements
- [ ] Results grid displays correctly
- [ ] All content is readable
- [ ] Focus outline is visible
- [ ] Colors have sufficient contrast

---

## Accessibility Testing Tools

### Color Contrast
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Check: Text 4.5:1, UI components 3:1

### ARIA Validation
- axe DevTools (Chrome/Edge extension): Free
- WAVE (Firefox/Chrome extension): Free
- Lighthouse (Chrome DevTools): Built-in

### Performance
- Chrome DevTools Lighthouse (Accessibility tab)
- WebPageTest with accessibility metrics

---

## Common Issues & Solutions

### Screen Reader Doesn't Announce
**Problem**: "Searching..." announcement not heard

**Solutions**:
1. Check browser console for errors (F12)
2. Verify announcement component is in DOM
3. Wait slightly longer (screen readers have processing delay)
4. Try different screen reader
5. Check aria-live attribute is set correctly

### Duplicate Announcements
**Problem**: Same message announced multiple times

**Solutions**:
1. Check for multiple Announcement components
2. Verify effects cleanup properly (return unsubscribe)
3. Check no multiple effect triggers
4. Review announcement hook configuration

### Announcement Too Fast/Slow
**Problem**: Can't read announcement in time

**Solutions**:
1. Adjust screen reader speech rate (settings)
2. Increase announcement timeout in Announcement.svelte (line ~34)
3. Use screen reader rotor to review announcements

### Keyboard Navigation Broken
**Problem**: Can't access search input with Tab

**Solutions**:
1. Check input has no `tabindex="-1"`
2. Verify input not hidden with `display: none`
3. Check focus order in tabindex attributes
4. Remove any mouse-only JavaScript handlers

---

## Reporting Issues

When filing accessibility bugs, include:

1. **Environment**
   - Screen reader: NVDA, VoiceOver, JAWS, etc.
   - Version: (e.g., NVDA 2024.1)
   - OS: Windows/macOS/Linux
   - Browser: Chrome, Safari, Firefox

2. **Steps to Reproduce**
   - Exact actions taken
   - What was expected to happen
   - What actually happened

3. **Audio Evidence**
   - What you heard (exact words)
   - When it happened (during search, loading, etc.)
   - Any error messages in console (F12)

4. **Example**
   ```
   Screen Reader: NVDA 2024.1 on Windows 11
   Browser: Chrome 122

   Steps:
   1. Navigate to /search
   2. Type "crash" in search input
   3. Wait 300ms for debounce

   Expected: Hear "Searching for crash"
   Actual: Heard "Searching for... [long pause]"

   Error: None visible in console
   ```

---

## Browser DevTools Tips

### Check ARIA Attributes
1. Open DevTools (F12)
2. Go to Elements tab
3. Find Announcement component
4. Check:
   - `role="status"` present
   - `aria-live="polite"` or `aria-live="assertive"`
   - `aria-atomic="true"`
   - Message text in DOM

### Check JavaScript Errors
1. Open DevTools (F12)
2. Go to Console tab
3. Filter to errors (red icon)
4. Expand any messages
5. Check network requests (Network tab)

### Check Event Listeners
1. Right-click on Announcement element
2. Select "Inspect"
3. Go to Event Listeners tab
4. Expand "change" listeners
5. Verify subscription cleanup

---

## Testing Schedule

### Initial Testing (Before Release)
- [ ] Test with NVDA (Windows)
- [ ] Test with VoiceOver (macOS)
- [ ] Keyboard navigation walkthrough
- [ ] Performance check (Lighthouse)

### Regression Testing (Before Each Release)
- [ ] Re-test all three screen readers
- [ ] Keyboard navigation
- [ ] WCAG validation (axe DevTools)

### Continuous Testing (Each PR)
- [ ] Run axe DevTools scan
- [ ] Manual keyboard check
- [ ] Console error check

---

## Resources

### Screen Reader Download
- **NVDA**: https://www.nvaccess.org/download/ (Free)
- **JAWS**: https://www.freedomscientific.com/ (Licensed)
- **VoiceOver**: Included with macOS
- **Orca**: Included in Linux GNOME

### WCAG Standards
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- Status Messages: https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html

### Testing Guides
- WebAIM Screen Reader Testing: https://webaim.org/articles/screenreader_testing/
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/

### Tools
- axe DevTools: https://www.deque.com/axe/devtools/
- WAVE: https://wave.webaim.org/
- Lighthouse: Built into Chrome DevTools

---

## Support

For questions about accessibility testing:
1. Check ACCESSIBILITY_GUIDE.md in components directory
2. Review AnnouncementExample.svelte component
3. Test with the working search page implementation

For WCAG compliance questions:
- Reference WCAG 2.1 at w3.org
- Check WebAIM resources
- File issues with detailed test results
