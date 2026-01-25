---
title: WCAG 2.1 AA Compliance Audit
category: accessibility
description: Systematic audit against WCAG 2.1 AA accessibility standards
tags: [wcag, audit, compliance, accessibility, standards]
---

# WCAG 2.1 AA Compliance Audit Skill

## When to Use

- Evaluating full site or application for WCAG 2.1 AA compliance
- Preparing for accessibility audit report
- Establishing baseline compliance level before remediation
- Verifying fixes after implementing accessibility changes
- Legal/compliance documentation requirements

## Required Inputs

- **Target URL or local dev server**: Application or page to audit
- **Scope**: Specific pages, user flows, or entire application
- **Tools available**: Browser with DevTools, axe DevTools, Lighthouse
- **Previous audit** (optional): Baseline or prior findings to compare
- **Team context**: Target users, known accessibility challenges

## Steps

### Phase 1: Automated Testing (20-30 minutes)

1. **Run Lighthouse Audit**
   - Open Chrome DevTools → Lighthouse tab
   - Select "Accessibility" category
   - Run audit on critical pages (homepage, forms, tables)
   - Document scores and violations

2. **Run axe DevTools**
   - Install axe DevTools browser extension
   - Scan each page systematically
   - Export results to JSON
   - Record critical, serious, moderate issues

3. **Run WAVE Browser Extension**
   - Navigate each page
   - Document errors (red), contrast errors, alerts
   - Compare findings across pages

4. **Color Contrast Check**
   - Use WebAIM Contrast Checker
   - Extract colors from CSS (light/dark modes)
   - Test each foreground/background combination
   - Verify 4.5:1 (normal) or 3:1 (large text) ratios

### Phase 2: Manual Testing (30-45 minutes)

1. **Keyboard Navigation Walkthrough**
   - Tab through entire page - is order logical?
   - All interactive elements focusable?
   - Can you operate all controls without mouse?
   - Are there any keyboard traps?
   - Focus indicator clearly visible?

2. **Screen Reader Testing**
   - Open VoiceOver (macOS) or NVDA (Windows)
   - Does page make sense when read linearly?
   - Heading structure logical (h1 → h2 → h3)?
   - Form labels clearly associated?
   - Images have alt text or aria-hidden?
   - Dynamic content announced appropriately?

3. **Visual Accessibility Check**
   - Works at 200% zoom without horizontal scroll?
   - No information conveyed by color alone?
   - Animations respect prefers-reduced-motion?
   - Works in Windows High Contrast Mode?

4. **Semantic HTML Review**
   - Proper use of landmark elements (nav, main, footer)
   - Headings create logical outline
   - Form inputs have associated labels
   - Tables have scope attributes
   - Lists use semantic markup

### Phase 3: Specific WCAG Criteria Mapping (15-20 minutes)

Document findings against specific criteria:

- **1.1.1 Non-text Content** - Images, icons, decorative elements
- **1.3.1 Info and Relationships** - Labels, table structure, lists
- **1.4.3 Contrast (Minimum)** - Text color contrast ratios
- **2.1.1 Keyboard** - All functionality via keyboard
- **2.4.1 Bypass Blocks** - Skip links present
- **2.4.3 Focus Order** - Tab order is logical
- **2.4.4 Link Purpose** - Link text is descriptive
- **2.4.7 Focus Visible** - Focus indicators clearly visible
- **3.3.2 Labels or Instructions** - Form labeling adequate
- **4.1.2 Name, Role, Value** - ARIA attributes correct

### Phase 4: Report Generation (15-20 minutes)

Create structured audit report with:

```markdown
## WCAG 2.1 AA Audit Report

### Summary
- Current Compliance Level: [A/AA/AAA/Non-compliant]
- Critical Issues: X (blocking user access)
- Serious Issues: X (major barriers)
- Moderate Issues: X (enhancement opportunities)
- Estimated Effort to AA: X hours

### Critical Issues (WCAG AA Violations)
#### [Issue Title]
- WCAG Criterion: [Number and name]
- Impact: [Who is affected and how]
- Location: [Component/file/line]
- Current Code: [Code snippet]
- Recommended Fix: [Code snippet]
- Priority: CRITICAL

### Serious Issues
[Same format]

### Moderate Issues
[Same format]

### Positive Findings
- ✓ [What's working well]
- ✓ [ARIA implementation quality]
- ✓ [Keyboard navigation]

### Implementation Roadmap
- Phase 1: Critical Fixes (X hours)
- Phase 2: Serious Fixes (X hours)
- Phase 3: Verification (X hours)
```

## Expected Output

1. **Audit Report Document**
   - Executive summary with compliance level
   - Critical/serious/moderate issues with WCAG mapping
   - Code examples (current vs. recommended)
   - Implementation roadmap with estimated effort

2. **Testing Evidence**
   - Screenshots from axe, Lighthouse
   - Screen reader testing notes
   - Keyboard navigation path verification
   - Color contrast matrix

3. **Compliance Checklist**
   - All WCAG AA criteria assessed
   - Status for each criterion (Pass/Fail/N/A)
   - Findings supporting status

4. **Recommendations**
   - Priority-ordered fixes
   - Effort estimates
   - Prevention strategies for future compliance
   - Tools to add to CI/CD pipeline

## Key WCAG Principles (POUR)

- **Perceivable**: Text alternatives, captions, sufficient contrast, readable text
- **Operable**: Keyboard accessible, enough time, seizure prevention, skip links
- **Understandable**: Clear language, predictable navigation, input assistance
- **Robust**: Valid HTML, correct ARIA, works with assistive tech

## Common Issues Found

- Missing skip links for keyboard users
- Insufficient color contrast ratios
- Decorative images/icons missing aria-hidden
- Form inputs without associated labels
- Table headers missing scope attributes
- Modal dialogs without focus management
- Missing keyboard handlers on custom components

## Tools Reference

- **Automated**: axe DevTools, Lighthouse, WAVE, Pa11y
- **Manual**: Screen reader (NVDA/VoiceOver), keyboard testing
- **Contrast**: WebAIM Contrast Checker
- **HTML Validation**: W3C HTML Validator

## Success Criteria

- All automated tools show 0 violations
- Manual keyboard testing: 100% navigable, logical order
- Screen reader testing: Page makes sense when read linearly
- Color contrast: All text meets 4.5:1 (normal) or 3:1 (large)
- No keyboard traps or focus loss
- Forms fully usable without mouse
