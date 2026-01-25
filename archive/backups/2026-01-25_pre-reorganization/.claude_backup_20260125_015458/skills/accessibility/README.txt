# Accessibility Skills Library

Comprehensive skills for WCAG 2.1 AA compliance, accessibility auditing, and inclusive design practices.

## Skills Overview

### 1. WCAG 2.1 AA Compliance Audit
**File**: `wcag-aa-audit.md` | **Size**: 6.1 KB

Systematic approach to auditing web applications against WCAG 2.1 AA standards.

**When to use:**
- Evaluating full site or application for compliance
- Establishing baseline compliance before remediation
- Preparing accessibility audit reports
- Verifying fixes after implementation
- Legal/compliance documentation

**What you'll do:**
- Run automated tests (Lighthouse, axe DevTools, WAVE)
- Perform manual keyboard and screen reader testing
- Test color contrast ratios
- Map findings to specific WCAG criteria
- Generate comprehensive audit report

**Covers:**
- Phase 1: Automated testing (Lighthouse, axe, WAVE)
- Phase 2: Manual testing (keyboard, screen reader, visual)
- Phase 3: WCAG criteria mapping (11 criteria)
- Phase 4: Report generation with remediation roadmap

---

### 2. Focus Management for Interactive Components
**File**: `focus-management.md` | **Size**: 9.2 KB

Proper focus handling patterns for modals, dialogs, drawers, and dynamic content.

**When to use:**
- Building modal dialogs or overlay components
- Single Page Application (SPA) navigation
- Dynamic content (dropdowns, tooltips, menus)
- Custom interactive components (tabs, accordions)
- Preventing keyboard traps

**What you'll do:**
- Store trigger element reference
- Move focus on component open
- Implement focus trapping (if needed)
- Handle Escape key
- Return focus on close
- Add proper ARIA attributes

**Covers:**
- Step-by-step focus management implementation
- Focus trap implementation
- Native `<dialog>` pattern (recommended)
- Framework-specific examples (React, Svelte, Vanilla JS)
- Testing checklist (12 items)

**WCAG Criteria**: 2.4.3 Focus Order, 2.1.1 Keyboard

---

### 3. Screen Reader Testing
**File**: `screen-reader-testing.md` | **Size**: 11 KB

Testing with screen readers (VoiceOver, NVDA) and assistive technology.

**When to use:**
- Verifying form accessibility and labels
- Testing dynamic content announcements
- Checking alternative text for images
- Validating heading structure
- Testing table data associations
- Testing live regions and alerts
- Complex component verification

**What you'll do:**
- Setup and launch screen reader (VoiceOver or NVDA)
- Navigate page structure and headings
- Test links and button labels
- Verify form labels and error messages
- Check image alt text
- Test dynamic content updates
- Document findings with templates

**Covers:**
- VoiceOver setup and commands (7 commands)
- NVDA setup and commands (8 commands)
- Landmark navigation
- Form testing procedures
- Image and icon testing
- Live region announcements
- Modal/dialog testing
- Test documentation template

**WCAG Criteria**: 1.1.1, 1.3.1, 2.4.3, 2.4.4, 3.3.2, 4.1.2, 4.1.3

---

### 4. Color Contrast Audit and Remediation
**File**: `color-contrast-audit.md` | **Size**: 11 KB

Ensuring WCAG AA color contrast ratios for readable text and UI components.

**When to use:**
- Auditing entire design system for contrast
- Fixing specific contrast failures
- Testing light and dark modes
- Checking for color vision deficiency issues
- Planning color changes to meet standards
- Documenting contrast specifications

**What you'll do:**
- Extract design colors from CSS
- Identify all foreground/background pairs
- Test contrast ratios with WebAIM
- Handle large text exception (3:1 vs 4.5:1)
- Test light and dark modes separately
- Simulate color vision deficiencies
- Document results and remediate

**Covers:**
- Phase 1: Extract design colors
- Phase 2: Identify color pairs
- Phase 3: Test ratios (WebAIM, DevTools, axe-core)
- Phase 4: Test large text exception
- Phase 5-6: Light and dark mode testing
- Phase 7: Color blindness simulation
- Phase 8: Documentation template
- Phase 9: Remediation and regression testing

**Standards:**
- WCAG AA: 4.5:1 (normal), 3:1 (large text)
- WCAG AAA: 7:1 (normal), 4.5:1 (large text)

**WCAG Criteria**: 1.4.3 Contrast (Minimum)

---

### 5. Keyboard Navigation Audit and Testing
**File**: `keyboard-nav-audit.md` | **Size**: 12 KB

Ensuring full keyboard accessibility and logical tab order for all users.

**When to use:**
- Testing with keyboard only (no mouse)
- Verifying all elements are reachable
- Checking logical tab order
- Identifying keyboard traps
- Fixing focus visibility issues
- Ensuring custom components work with keyboard
- Validating skip links

**What you'll do:**
- Disable mouse for testing
- Test linear tab order through page
- Verify focus indicator visibility
- Test interactive elements (buttons, links, forms)
- Detect and fix keyboard traps
- Test skip link functionality
- Verify keyboard shortcuts (if any)
- Document findings in test report

**Covers:**
- Phase 1: Setup keyboard-only testing
- Phase 2: Navigation tab order (logical order verification)
- Phase 3: Interactive elements (buttons, links, forms)
- Phase 4: Keyboard trap detection and testing
- Phase 5: Skip links
- Phase 6: Keyboard shortcuts
- Phase 7: Scrolling and page interaction
- Phase 8: Access keys
- Phase 9: Reporting

**Test Checklist**: 28 items covering navigation, forms, custom components

**WCAG Criteria**: 2.1.1 Keyboard, 2.1.2 No Keyboard Trap, 2.4.3 Focus Order, 2.4.7 Focus Visible

---

## Quick Reference

### By Task

**I need to audit my entire application:**
→ Use `wcag-aa-audit.md` for 4-phase systematic audit

**I need to fix a modal's focus issues:**
→ Use `focus-management.md` for 8-step implementation

**I need to test with a screen reader:**
→ Use `screen-reader-testing.md` for VoiceOver/NVDA procedures

**I need to fix color contrast:**
→ Use `color-contrast-audit.md` for 9-phase audit and remediation

**I need to ensure keyboard navigation:**
→ Use `keyboard-nav-audit.md` for 9-phase testing and verification

### By Framework

All skills include:
- Vanilla JavaScript examples
- React hook examples
- Svelte rune examples
- Framework-agnostic procedures

### By Disability Type

**Visual/Low Vision:**
→ Color contrast (skill 4), keyboard navigation (skill 5)

**Motor/Motor Control:**
→ Keyboard navigation (skill 5), focus management (skill 2)

**Deaf/Hard of Hearing:**
→ Screen reader testing (skill 3) for captions/transcripts

**Cognitive:**
→ WCAG AA audit (skill 1) for clear language and structure

**Multiple Disabilities:**
→ Use all skills together for comprehensive coverage

---

## Common WCAG Criteria Addressed

| Criterion | Skill(s) | Priority |
|-----------|----------|----------|
| 1.1.1 Non-text Content | Screen Reader Testing (3) | Critical |
| 1.3.1 Info and Relationships | All skills | Critical |
| 1.4.3 Contrast (Minimum) | Color Contrast (4) | AA |
| 2.1.1 Keyboard | Keyboard Nav (5), Focus Mgmt (2) | Critical |
| 2.1.2 No Keyboard Trap | Keyboard Nav (5) | Critical |
| 2.4.1 Bypass Blocks | Keyboard Nav (5) | Critical |
| 2.4.3 Focus Order | Keyboard Nav (5), Focus Mgmt (2) | Critical |
| 2.4.4 Link Purpose | Screen Reader Testing (3) | Critical |
| 2.4.7 Focus Visible | Keyboard Nav (5) | AA |
| 3.3.2 Labels or Instructions | Screen Reader Testing (3) | Critical |
| 4.1.2 Name, Role, Value | WCAG Audit (1), Focus Mgmt (2) | Critical |
| 4.1.3 Status Messages | Screen Reader Testing (3) | AAA |

---

## Tools Referenced

### Automated Testing
- **axe DevTools**: Browser extension for accessibility testing
- **Lighthouse**: Built into Chrome DevTools
- **WAVE**: Browser extension for visual feedback
- **Pa11y**: Command-line accessibility testing

### Manual Testing
- **VoiceOver**: macOS/iOS built-in screen reader
- **NVDA**: Free Windows screen reader
- **JAWS**: Commercial Windows screen reader
- **TalkBack**: Android screen reader

### Color Testing
- **WebAIM Contrast Checker**: Online contrast ratio tester
- **Color Oracle**: Full-screen color blindness simulator
- **Stark Plugin**: Figma/Sketch/Adobe integration
- **axe DevTools**: Built-in contrast checking

### Keyboard Testing
- Browser DevTools (Firefox/Chrome)
- Manual keyboard-only navigation
- Console helpers for element highlighting

---

## Success Criteria

When you complete a skill exercise:

1. **WCAG AA Audit**: 0 violations on axe DevTools, Lighthouse 90+
2. **Focus Management**: Modal focus traps correctly, Escape closes, focus returns
3. **Screen Reader Testing**: Page makes sense when read linearly
4. **Color Contrast**: All text 4.5:1 (normal) or 3:1 (large)
5. **Keyboard Navigation**: 100% functional with Tab key only, focus always visible

---

## Learning Path

### For Beginners
1. Start with WCAG AA Audit (understand what needs to be tested)
2. Move to Color Contrast Audit (quick wins, easy to verify)
3. Learn Keyboard Navigation Audit (understand input methods)
4. Study Focus Management (most practical for development)
5. Master Screen Reader Testing (most complex, most valuable)

### For Experienced Developers
1. Use WCAG AA Audit as comprehensive reference
2. Deep dive into Focus Management for complex components
3. Master Screen Reader Testing for assistive tech compatibility
4. Reference Color Contrast for design system work
5. Use Keyboard Navigation for regression testing

### For QA/Testing Specialists
1. Start with Screen Reader Testing (comprehensive user validation)
2. Master Keyboard Navigation Audit (systematic testing)
3. Use WCAG AA Audit as test plan template
4. Reference Color Contrast for accessibility checklist
5. Study Focus Management for edge case testing

---

## Implementation Notes

### Before You Start
- Disable mouse or use keyboard-only mode
- Test in multiple browsers (Chrome, Firefox, Safari, Edge)
- Test with real assistive technology (VoiceOver, NVDA)
- Document findings systematically

### During Implementation
- Fix semantic HTML first (don't use ARIA to fix bad HTML)
- Test after each fix
- Document why changes were made
- Get feedback from users with disabilities if possible

### After Remediation
- Verify all fixes with same tools that found issues
- Run full WCAG audit to catch regressions
- Update design system documentation
- Train team on best practices

---

## Integration with Development

### In Code Review
- Reference skill when commenting on accessibility issues
- Use checklists from skills as review criteria
- Share relevant sections with developers

### In Testing
- Use skills to create test cases and acceptance criteria
- Reference tools and procedures in test plans
- Document findings using skill templates

### In Design Systems
- Build components using focus management patterns
- Document color contrast decisions
- Include keyboard interaction guidelines
- Provide screen reader testing results

### In CI/CD Pipeline
- Add axe-core automated testing
- Include Lighthouse accessibility audit
- Add keyboard navigation regression tests
- Report contrast compliance

---

## Questions or Issues?

Each skill includes:
- Success criteria for validation
- Common issues and fixes
- WCAG criteria references
- Tool recommendations
- Framework-specific examples

Refer to the specific skill section that addresses your question.

---

**Created**: January 21, 2026
**Source**: Generalized from DMB Almanac Svelte project accessibility audit
**Target**: WCAG 2.1 AA compliance for all web projects
**Scope**: Comprehensive accessibility skills for developers, designers, QA, and teams
