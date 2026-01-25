# Accessibility Audit - Actionable Recommendations
**Date**: January 23, 2026 | **Target**: All WCAG 2.1 AA (100% Compliant)

---

## Overview

The DMB Almanac project is **already WCAG 2.1 AA compliant**. These recommendations will help maintain and enhance accessibility as the project grows.

**Current Status**: ✓ PASS (18/18 criteria)
**Effort Required**: Low to Medium
**Timeline**: Distribute across sprints

---

## Priority 1: Maintain Excellence (Required)

These are non-negotiable practices that must continue with every new feature.

### 1.1 Semantic HTML First
**Effort**: Low | **Impact**: High

**Action**: When building new components, always ask: "Can I use a native HTML element?"

**Implementation**:
```svelte
<!-- Good: Use native button -->
<button>Click me</button>

<!-- Good: Use native link -->
<a href="/page">Go to page</a>

<!-- Good: Use native dialog -->
<dialog>
  <!-- modal content -->
</dialog>

<!-- Avoid: DIV as button -->
<div onclick={handleClick} role="button">Don't do this</div>

<!-- Avoid: Link with onclick -->
<a href="#" onclick={handleClick}>Don't do this</a>
```

**Checklist for PRs**:
- [ ] No divs used as buttons (use `<button>`)
- [ ] No divs used as links (use `<a>`)
- [ ] No divs used as tables (use `<table>`)
- [ ] Native elements used before ARIA

---

### 1.2 Keyboard Navigation Always
**Effort**: Medium | **Impact**: High

**Action**: Every interactive component must work with keyboard alone.

**Implementation Checklist**:
```javascript
// Before merging, test with keyboard only:
- [ ] Can reach element with Tab key
- [ ] Can activate with Enter or Space
- [ ] Can navigate with Arrow keys (if complex)
- [ ] Can dismiss with Escape (if modal/menu)
- [ ] Focus order is logical
- [ ] No keyboard traps (can always escape)
```

**Example Pattern**:
```svelte
<script>
  function handleKeydown(event) {
    switch(event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleActivate();
        break;
      case 'Escape':
        event.preventDefault();
        handleClose();
        break;
      case 'ArrowDown':
        event.preventDefault();
        selectNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectPrevious();
        break;
    }
  }
</script>

<div role="menu" onkeydown={handleKeydown}>
  {#each items as item}
    <button role="menuitem">
      {item.label}
    </button>
  {/each}
</div>
```

---

### 1.3 Focus Indicators Always Visible
**Effort**: Low | **Impact**: High

**Action**: Every interactive element must have visible focus indicator.

**CSS Standard**:
```css
.interactive-element {
  /* Focus style */
  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    &:focus-visible {
      outline: 2px solid Highlight;
    }
  }

  /* Dark mode if needed */
  @media (prefers-color-scheme: dark) {
    &:focus-visible {
      outline-color: var(--color-primary-400);
    }
  }
}
```

**Never Do**:
```css
/* Bad - removes focus indicator */
button:focus {
  outline: none;
}

/* Bad - focus only on hover */
button:focus-visible:not(:hover) {
  outline: none;
}
```

---

### 1.4 Screen Reader Testing
**Effort**: Medium | **Impact**: High

**Action**: New components must be tested with screen reader simulation.

**Testing Process**:
1. Identify what you expect screen reader to announce
2. Test with browser DevTools (Accessibility tab)
3. Or use NVDA/VoiceOver on actual device
4. Document expected announcements

**ARIA Patterns to Check**:
```svelte
<!-- Buttons must have accessible name -->
<button>Save</button>
<button aria-label="Close dialog">×</button>

<!-- Links must be clear -->
<a href="/page">Go to page</a>  <!-- Good -->
<a href="/page">Click here</a>  <!-- Bad: not descriptive -->

<!-- Forms must have labels -->
<label for="email">Email address</label>
<input id="email" type="email" />

<!-- Menus must have roles -->
<button aria-haspopup="menu" aria-expanded={isOpen}>Menu</button>
<div role="menu">
  <button role="menuitem">Item</button>
</div>

<!-- Status updates must be announced -->
<div role="alert">Error: Invalid email</div>
<div role="status" aria-live="polite">Saving...</div>
```

---

### 1.5 Test New Features With Automated Tools
**Effort**: Low | **Impact**: Medium

**Process**:
1. Install axe DevTools browser extension
2. Run on your new component
3. Fix any violations before PR
4. Document any false positives

**Tools to Use**:
- **axe DevTools** (browser extension)
- **Lighthouse** (Chrome DevTools)
- **WAVE** (WebAIM)
- **HTML Validator** (W3C)

---

## Priority 2: Quick Wins (Easy Improvements)

These are easy to implement now and will improve consistency.

### 2.1 Fix InstallPrompt Focus Return
**Effort**: LOW (5 min) | **Impact**: Low

**File**: `src/lib/components/pwa/InstallPrompt.svelte`
**Lines**: 226-244

**Current Code**:
```typescript
function handleDismiss() {
  isDismissed = true;
  shouldShow = false;
  localStorage.setItem(DISMISS_KEY, Date.now().toString());

  // This line just blurs - should return focus
  const previousFocusElement = document.activeElement as HTMLElement;
  if (previousFocusElement) {
    previousFocusElement.blur();  // <- Problem: doesn't return focus
  }
}
```

**Fix**:
```typescript
function handleDismiss() {
  isDismissed = true;
  shouldShow = false;
  localStorage.setItem(DISMISS_KEY, Date.now().toString());

  // Return focus to a logical location
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.focus();
  } else {
    // Fallback: focus body
    document.body.focus();
  }
}
```

**Why**: After dismissing the banner, keyboard user should be able to continue from a logical location.

---

### 2.2 Add ARIA Live Regions to Forms
**Effort**: LOW (10 min) | **Impact**: Medium

**Pattern for Form Validation**:
```svelte
<script>
  let validationError = '';

  function validateEmail(event) {
    const value = event.target.value;
    if (!value.includes('@')) {
      validationError = 'Please enter a valid email address';
    } else {
      validationError = '';
    }
  }
</script>

<div>
  <label for="email">Email address</label>
  <input
    id="email"
    type="email"
    on:change={validateEmail}
    aria-invalid={!!validationError}
    aria-describedby={validationError ? 'email-error' : undefined}
  />
  {#if validationError}
    <div
      id="email-error"
      role="alert"
      class="error-message"
    >
      {validationError}
    </div>
  {/if}
</div>

<style>
  input[aria-invalid='true'] {
    border-color: var(--color-error);
  }

  .error-message {
    color: var(--color-error);
    font-size: var(--text-sm);
    margin-top: var(--space-1);
  }
</style>
```

**Why**: Screen reader users immediately know about validation errors.

---

### 2.3 Create Accessibility Guidelines Document
**Effort**: LOW (15 min) | **Impact**: High (team knowledge)

**File**: `ACCESSIBILITY_GUIDELINES.md`

**Contents**:
```markdown
# Accessibility Guidelines for Developers

## Before Building a Component

- [ ] Is this interactive? If yes, use proper element (button/link/input)
- [ ] Does it need keyboard support? If yes, add keyboard handlers
- [ ] Does it need focus indicator? If yes, add :focus-visible style
- [ ] Does it communicate state? If yes, add ARIA attributes
- [ ] Is it visible at high zoom? If no, review responsive design

## Required Patterns

### Button
```svelte
<button onclick={handleClick}>
  Button Text
</button>
```

### Link
```svelte
<a href="/path">Link text</a>
```

### Form Input
```svelte
<label for="email">Label</label>
<input id="email" type="email" />
```

### Menu
```svelte
<button aria-haspopup="menu" aria-expanded={isOpen}>
  Menu
</button>
{#if isOpen}
  <div role="menu">
    <button role="menuitem" onclick={handleItem}>Item</button>
  </div>
{/if}
```

### Dialog
```svelte
<dialog aria-labelledby="title" aria-describedby="desc">
  <h2 id="title">Title</h2>
  <p id="desc">Description</p>
  <button onclick={handleClose}>Close</button>
</dialog>
```

## Testing Checklist

- [ ] Tab through component - does it work?
- [ ] Click elements - do they respond?
- [ ] Press Escape on modals - do they close?
- [ ] Zoom to 200% - does it still work?
- [ ] Run axe DevTools - any violations?
- [ ] Check color contrast - 4.5:1 minimum?
- [ ] Test with screen reader - announcements clear?

## Common Mistakes to Avoid

- [ ] Using div as button (use <button>)
- [ ] Using link as button (use <button>)
- [ ] Removing focus outline (always keep it)
- [ ] Placeholder as label (use actual label)
- [ ] Color only to convey info (use text too)
- [ ] Auto-playing media (let user control)
- [ ] Unexpected context changes on focus
- [ ] Keyboard traps (can't escape)

## Resources

- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA Patterns: https://www.w3.org/WAI/ARIA/apg/patterns/
- WebAIM: https://webaim.org/
- axe DevTools: https://www.deque.com/axe/devtools/
```

---

### 2.4 Add PR Template Accessibility Checklist
**Effort**: LOW (5 min) | **Impact**: Medium

**File**: `.github/pull_request_template.md`

**Addition**:
```markdown
## Accessibility Checklist

- [ ] New interactive elements tested with keyboard only
- [ ] All buttons/links have accessible names
- [ ] All form inputs have associated labels
- [ ] Focus indicators visible on all interactive elements
- [ ] No keyboard traps (can escape all menus/dialogs)
- [ ] Tested with axe DevTools (no violations)
- [ ] Color contrast verified (4.5:1 minimum)
- [ ] Works at 200% zoom without loss of function
- [ ] Screen reader announcements verified
- [ ] Respects prefers-reduced-motion preference

### If accessibility concerns exist:
- [ ] Senior dev reviewed
- [ ] Accessibility specialist consulted
- [ ] Issues documented for future fix
```

---

## Priority 3: Medium-Effort Enhancements

These improve accessibility further and take more time.

### 3.1 Add Automated Accessibility Tests
**Effort**: MEDIUM (2 hours) | **Impact**: High

**Setup axe-core in Tests**:

```bash
npm install --save-dev @axe-core/react axe-core
```

**Example Test** (`src/lib/components/__tests__/Button.test.ts`):
```typescript
import { render } from '@testing-library/svelte';
import { axe } from '@axe-core/react';
import Button from '../Button.svelte';

describe('Button Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(Button, {
      props: { children: 'Click me' }
    });

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('should have visible focus indicator', () => {
    const { container } = render(Button);
    const button = container.querySelector('button');

    // Verify focus styles exist
    const styles = window.getComputedStyle(button, ':focus-visible');
    expect(styles.outline).toBeTruthy();
  });
});
```

**Add to CI/CD** (`.github/workflows/test.yml`):
```yaml
- name: Run accessibility tests
  run: npm run test:a11y

- name: Run axe scan
  run: npm run test:axe
```

**Update `package.json`**:
```json
{
  "scripts": {
    "test:a11y": "vitest run --include='**/*.a11y.test.ts'",
    "test:axe": "axe ."
  }
}
```

---

### 3.2 Voice Input Support (Future Enhancement)
**Effort**: MEDIUM (4 hours) | **Impact**: Medium

**Chrome 143+ Feature**: Web Speech API with contextual biasing

**Implementation Pattern**:
```svelte
<script>
  import { createVoiceInput } from '$lib/utils/voiceInput';

  let searchText = '';
  const { startListening, isListening, transcript } = createVoiceInput({
    contextPhrases: [
      'Crash Into Me',
      'Two Step',
      'Ants Marching',
      'Red Rocks',
      'Alpine Valley'
    ]
  });
</script>

<form>
  <label for="search">Search</label>
  <input
    id="search"
    bind:value={searchText}
    placeholder="Type or speak"
  />

  <button
    type="button"
    onclick={startListening}
    aria-pressed={isListening}
    aria-label="Search by voice"
  >
    {isListening ? 'Listening...' : 'Voice Search'}
  </button>

  {#if transcript}
    <p role="status" aria-live="polite">
      You said: {transcript}
    </p>
  {/if}
</form>
```

**Implementation File** (`src/lib/utils/voiceInput.ts`):
```typescript
import { writable } from 'svelte/store';

interface VoiceInputConfig {
  contextPhrases?: string[];
  language?: string;
}

export function createVoiceInput(config: VoiceInputConfig) {
  const isListening = writable(false);
  const transcript = writable('');
  const isSupported = 'webkitSpeechRecognition' in window;

  if (!isSupported) {
    console.warn('Web Speech API not supported');
    return { startListening: () => {}, isListening, transcript, isSupported };
  }

  const recognition = new (window as any).webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.language = config.language || 'en-US';

  // Chrome 143+: Contextual biasing
  if ('grammars' in recognition && config.contextPhrases) {
    const grammarList = new (window as any).SpeechGrammarList();
    config.contextPhrases.forEach(phrase => {
      grammarList.addFromString(phrase, 2.0); // Boost importance
    });
    recognition.grammars = grammarList;
  }

  recognition.onstart = () => {
    isListening.set(true);
    console.log('[Voice] Listening...');
  };

  recognition.onresult = (event: any) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcriptSegment = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        transcript.set(transcriptSegment);
      } else {
        interimTranscript += transcriptSegment;
      }
    }

    console.log('[Voice] Result:', interimTranscript || transcript);
  };

  recognition.onerror = (event: any) => {
    console.error('[Voice] Error:', event.error);
  };

  recognition.onend = () => {
    isListening.set(false);
  };

  return {
    startListening: () => recognition.start(),
    stopListening: () => recognition.abort(),
    isListening,
    transcript,
    isSupported
  };
}
```

**Why**: Helps users with motor disabilities control app via voice.

---

### 3.3 High Contrast Theme Option
**Effort**: MEDIUM (3 hours) | **Impact**: Medium

**Add Theme Toggle**:
```svelte
<!-- In Header.svelte -->
<button
  onclick={() => toggleContrast()}
  aria-label="Toggle high contrast mode"
  aria-pressed={contrastMode === 'high'}
>
  ⚙️ Contrast
</button>
```

**CSS Implementation**:
```css
/* Default colors */
:root {
  --text-color: #030712;
  --background: #ffffff;
  --border: #d1d5db;
}

/* High contrast mode */
html[data-contrast='high'] {
  --text-color: #000000;
  --background: #ffffff;
  --border: #000000;
}

html[data-contrast='high'] {
  --color-primary-500: #0000ff;
  --color-error: #ff0000;
}

body {
  color: var(--text-color);
  background-color: var(--background);
}

.border-element {
  border-color: var(--border);
  border-width: 2px; /* Thicker in high contrast */
}
```

**Persistence**:
```typescript
// src/lib/stores/theme.ts
import { writable } from 'svelte/store';

function createThemeStore() {
  const storedTheme = localStorage.getItem('contrast-mode') || 'normal';
  const { subscribe, set } = writable(storedTheme);

  return {
    subscribe,
    setContrast: (mode: 'normal' | 'high') => {
      localStorage.setItem('contrast-mode', mode);
      document.documentElement.dataset.contrast = mode;
      set(mode);
    }
  };
}

export const contrastMode = createThemeStore();
```

---

### 3.4 Customizable Text Size
**Effort**: MEDIUM (2 hours) | **Impact**: Medium

**Implementation**:
```svelte
<!-- Font Size Controls -->
<div class="text-size-controls">
  <button
    onclick={() => fontSize = 'small'}
    aria-pressed={fontSize === 'small'}
  >
    A
  </button>
  <button
    onclick={() => fontSize = 'normal'}
    aria-pressed={fontSize === 'normal'}
  >
    A
  </button>
  <button
    onclick={() => fontSize = 'large'}
    aria-pressed={fontSize === 'large'}
  >
    A
  </button>
</div>
```

**CSS**:
```css
:root {
  --text-multiplier: 1;
}

html[data-text-size='small'] {
  --text-multiplier: 0.9;
}

html[data-text-size='normal'] {
  --text-multiplier: 1;
}

html[data-text-size='large'] {
  --text-multiplier: 1.15;
}

body {
  font-size: calc(16px * var(--text-multiplier));
}

h1 {
  font-size: calc(2rem * var(--text-multiplier));
}

h2 {
  font-size: calc(1.5rem * var(--text-multiplier));
}
```

---

## Priority 4: Team Development

### 4.1 Accessibility Training Session
**Effort**: LOW (30 min meeting) | **Impact**: High

**Session Outline**:

**Introduction (5 min)**
- Why accessibility matters
- Legal (ADA/Section 508)
- User impact (disabilities are common)

**WCAG 2.1 AA Overview (5 min)**
- 4 principles: Perceivable, Operable, Understandable, Robust
- What WCAG AA means for this project

**Common Issues & Fixes (10 min)**
- Demo: keyboard-only navigation
- Demo: screen reader with button example
- Demo: focus indicators

**Tools Demo (5 min)**
- axe DevTools
- Keyboard-only testing
- Zoom testing

**Action Items (5 min)**
- Add accessibility to PR checklist
- Schedule training follow-up
- Assign accessibility champion

**Resources to Share**:
- WCAG 2.1 Quick Reference: https://www.w3.org/WAI/WCAG21/quickref/
- WebAIM Blog: https://webaim.org/
- axe University: https://www.deque.com/
- Project docs: See ACCESSIBILITY_GUIDELINES.md

---

### 4.2 Assign Accessibility Champion
**Effort**: LOW (ongoing) | **Impact**: Medium

**Responsibilities**:
- Review accessibility aspects of PRs
- Run automated testing
- Escalate issues to team
- Keep team trained

**Not Required To Be**:
- An expert (can learn)
- A full-time role (10-20% of time)
- Sole person responsible

---

### 4.3 Quarterly Accessibility Reviews
**Effort**: MEDIUM (3 hours quarterly) | **Impact**: High

**Process**:
1. Audit current compliance
2. Review new components
3. Test with keyboard/screen reader
4. Update documentation
5. Plan next quarter improvements

**Schedule**: Q1, Q2, Q3, Q4

---

## Implementation Timeline

### Sprint 1 (This Sprint)
- [ ] Fix InstallPrompt focus return (2.1)
- [ ] Add PR template checklist (2.4)
- [ ] Create ACCESSIBILITY_GUIDELINES.md (2.3)

### Sprint 2
- [ ] Add ARIA live regions to forms (2.2)
- [ ] Schedule accessibility training (4.1)
- [ ] Setup automated a11y testing (3.1)

### Sprint 3
- [ ] Team training session (4.1)
- [ ] Review and update documentation
- [ ] Assign accessibility champion (4.2)

### Sprint 4+
- [ ] Voice input support (3.2)
- [ ] High contrast theme (3.3)
- [ ] Custom text sizing (3.4)
- [ ] Quarterly reviews (4.3)

---

## Success Metrics

### Maintain Current Excellence
- [ ] 100% keyboard accessible on new features
- [ ] No axe violations in new components
- [ ] Focus indicators on all interactive elements

### Improve Over Time
- [ ] Team a11y knowledge increases
- [ ] Components get more accessible
- [ ] Users report better experience
- [ ] 0 accessibility-related bugs

### Team Development
- [ ] All developers trained
- [ ] Accessibility in PR workflow
- [ ] Accessibility champion assigned
- [ ] Quarterly audits completed

---

## Tools & Resources

### Browser Tools (Free)
- axe DevTools: https://www.deque.com/axe/devtools/
- Lighthouse: Built into Chrome DevTools
- WAVE: https://wave.webaim.org/

### Screen Readers (Free)
- NVDA (Windows): https://www.nvaccess.org/
- VoiceOver (Mac): Built into macOS
- JAWS (Commercial): https://www.freedomscientific.com/

### Standards & Guidelines
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA Patterns: https://www.w3.org/WAI/ARIA/apg/
- WebAIM: https://webaim.org/
- Section 508: https://www.section508.gov/

### Learning Resources
- A11y Project: https://www.a11yproject.com/
- Smashing Magazine a11y: https://www.smashingmagazine.com/accessibility/
- Dev.to a11y tag: https://dev.to/t/accessibility

---

## Conclusion

DMB Almanac is **already WCAG 2.1 AA compliant**. These recommendations will:

1. **Maintain** current excellence
2. **Improve** consistency across team
3. **Enhance** user experience further
4. **Develop** team accessibility skills

**Next Step**: Start with Priority 1 (maintain practices) and Priority 2 (quick wins).

---

**Document Created**: January 23, 2026
**Status**: Ready to implement
**Questions?** Contact Senior Accessibility Specialist
