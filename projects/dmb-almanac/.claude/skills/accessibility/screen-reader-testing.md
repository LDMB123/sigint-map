---
title: Screen Reader Compatibility Testing
category: accessibility
description: Testing with VoiceOver, NVDA, and other screen readers
tags: [screen-reader, testing, nvda, voiceover, assistive-tech, wcag]
---

# Screen Reader Testing Skill

## When to Use

- Verifying form accessibility (labels, error messages)
- Testing dynamic content announcements
- Checking alternative text for images
- Validating heading structure and page navigation
- Testing table accessibility and data associations
- Ensuring live regions announce updates
- Complex component testing (tabs, modals, dropdowns)

## Required Inputs

- **Application or page URL**: What you're testing
- **Screen reader available**: VoiceOver (macOS/iOS), NVDA (Windows), or JAWS
- **Testing scope**: Specific flows or entire page
- **Expected behavior**: What should be announced
- **Known issues**: Prior findings to investigate

## Steps

### Phase 1: Setup and Launch

#### macOS VoiceOver Setup

1. **Enable VoiceOver**
   ```
   System Settings → Accessibility → VoiceOver → On
   OR Cmd + F5
   ```

2. **Open Chrome Browser**
   - VoiceOver works with Chrome, Safari, Firefox
   - Use Chrome for development testing

3. **Start Reading**
   - Open page in Chrome
   - VO + U opens Web Rotor (navigation menu)
   - VO = Control + Option (hold these keys)

#### Windows NVDA Setup

1. **Download NVDA**
   - Free from https://www.nvaccess.org/
   - Install on Windows machine

2. **Launch NVDA**
   - Start NVDA application
   - Open Chrome or Firefox
   - NVDA key = Insert or Caps Lock

#### iOS/Android Testing

- **iOS**: Built-in VoiceOver (Settings → Accessibility → VoiceOver)
- **Android**: TalkBack (Google Play Store)

### Phase 2: Navigation Testing

#### Test Page Structure

```
Task: Navigate page and verify heading structure

1. Open VoiceOver/NVDA Web Rotor
   - macOS: VO + U
   - Windows: NVDA + F7

2. Check headings list
   - Verify H1 appears first (page title)
   - Verify H2/H3 create logical structure
   - No skipped heading levels (H1 → H3 is wrong)

3. Navigate by heading
   - Use up/down arrows in rotor
   - Verify each heading makes sense
   - Check all major sections covered
```

#### Test Landmarks

```
Task: Navigate page landmarks

macOS VoiceOver:
- VO + U → click "Landmarks" tab
- Navigate between nav, main, footer, regions

Windows NVDA:
- NVDA + F7 → Landmarks
- Use R key to jump to next landmark

Verify:
- Navigation landmark present and labeled
- Main content landmark present
- All major page sections have landmarks
```

### Phase 3: Link and Button Testing

#### Link Text Testing

```
Task: Verify link purpose is clear

Navigate all links:

Expected:
- Link says "See all shows" (clear purpose)
- Link says "Learn more about setlists" (clear purpose)

Bad examples:
- Link says "Click here" (vague)
- Link says "More" (vague)
- Link says "→" (no text)

Test:
1. Navigate to each link (Tab key or Link rotor)
2. Listen to announcement
3. Note if purpose is clear from text alone
```

#### Button Label Testing

```
Task: Verify button purpose is announced

For each interactive button:

Verify announcement includes:
- Button name (from text content or aria-label)
- Button state if applicable (pressed, expanded)
- Keyboard action (press Enter or Space)

Example good announcements:
- "Add to favorites button, toggle button, not pressed"
- "Search button"
- "Close modal button"

Example bad announcements:
- "Button" (no name)
- "Icon" (no label)
```

### Phase 4: Form Testing

#### Form Label Association

```
Task: Verify form inputs have associated labels

For each form field:

1. Tab to input
2. Listen: Should hear label text + input type
3. Document what's announced

Expected announcements:
- "Search shows, edit text" (label + type)
- "Email address, edit text" (label + type)
- "Subscribe, checkbox, not checked" (label + type)

Issues:
- If you only hear "edit text" → label missing
- If you only hear "Search shows" → missing input type
- If placeholder is read as label → use <label> element instead
```

#### Error Message Association

```
Task: Verify error messages are linked to fields

1. Submit form with missing field
2. Tab back to field
3. Listen: Should hear error message

Expected announcement:
- "Email address, edit text, required, this field is required"

Bad announcement:
- "Email address, edit text" (error not announced)
- Error appears on page but not announced to field
```

### Phase 5: Image and Icon Testing

#### Image Alt Text

```
Task: Verify images have appropriate alt text

For each image:

1. Tab to or arrow to image
2. Listen to announcement

Expected:
- Informative image: "Photo of Dave Matthews Band performing at Red Rocks"
- Decorative image: Announces nothing (aria-hidden="true")
- Logo: "DMB Almanac home"

Issues:
- If only says "image" → missing alt text
- If alt is too long → provide concise alternative
- If decorative image is announced → needs aria-hidden
```

#### Icon Testing (SVG, Emoji)

```
Task: Verify decorative icons don't clutter

For decorative icons/emojis:

Expected: Should not be announced separately
- Icon next to "Liberation List" → only hears "Liberation List"
- Emoji in heading → only hears heading text

Bad behavior:
- Hears "Guitar emoji Liberation List" (emoji announced)
- Hears "Music note Liberation List" (icon announced separately)

Fix needed: Add aria-hidden="true" to decorative SVG/emoji
```

### Phase 6: Dynamic Content Testing

#### Live Region Announcements

```
Task: Verify updates are announced to screen readers

Actions that should trigger announcements:

1. Search results loading
   - Action: Type in search box, wait for results
   - Listen: Should hear "3 results found" or similar
   - Test with: aria-live="polite" or role="status"

2. Form submission success
   - Action: Submit form with valid data
   - Listen: Should hear success message
   - Document exact announcement

3. Error notifications
   - Action: Trigger error state
   - Listen: Should hear alert announcement
   - Verify uses role="alert" or aria-live="assertive"

4. Page updates without reload
   - Action: Click "Load more" or pagination
   - Listen: Should hear announcement
   - Verify using screen reader
```

#### Modal/Dialog Announcements

```
Task: Verify modal opening is announced

1. Focus on button that opens modal
2. Press Enter/Space
3. Listen for announcement

Expected:
- "Dialog opened"
- Heading of modal is announced
- Focus moved to first element in modal

Issues:
- No announcement that modal opened
- Focus went to background instead of modal
- Modal not labeled (no aria-labelledby)
```

### Phase 7: Table Testing

#### Table Header Association

```
Task: Verify table headers are associated with cells

For data tables:

1. Tab to table
2. Navigate with arrow keys (if supported)
3. Listen to announcements

Expected:
- When on data cell: "Column header, row header, value"
- Example: "Show Date, Q1 2024, Friday May 3, 2024"

Issues:
- Only hears value, not headers: Missing scope="col"
- Only hears one header: scope attribute missing
- Headers not announced in logical order: Structure issue
```

### Phase 8: Specific Test Cases

#### Test Case: Search Form

```
Steps:
1. Tab to search input
2. Listen: Should hear "Search shows songs venues edit text"
3. Type search term
4. Listen: Results should be announced
5. Tab through results
6. Listen: Each result should have descriptive link text

Expected Result:
- Form labels clear
- Input purpose understood
- Results announced
- Each result can be navigated
```

#### Test Case: Form with Validation

```
Steps:
1. Tab through form fields
2. Listen: Each field should have label
3. Leave required field empty
4. Tab to next field or submit
5. Listen: Error message should be announced
6. Check that error is associated with field

Expected Result:
- Labels present and clear
- Errors announced to screen reader
- Errors linked to specific fields
- User can correct and resubmit
```

#### Test Case: Navigation Menu

```
Steps:
1. Open navigation menu
2. Listen: Should hear menu structure
3. Tab through menu items
4. Listen: Item names clear
5. Verify submenu navigation works
6. Press Escape to close

Expected Result:
- Menu structure clear
- Items navigable by keyboard
- Submenu logic understandable
- Can escape to main content
```

## Testing Documentation Template

```markdown
## Screen Reader Testing Report

### Test Environment
- Browser: Chrome Version X
- Screen Reader: VoiceOver / NVDA
- Platform: macOS / Windows
- Date: YYYY-MM-DD
- Tester: [Name]

### Page/Feature: [Page Name]

### Navigation Testing
- [ ] Heading structure correct (H1 → H2/H3)
- [ ] All landmarks present (nav, main, footer)
- [ ] Tab order logical
- Notes: [Findings]

### Form Testing
- [ ] Input labels associated
- [ ] Field types announced (text, email, etc.)
- [ ] Error messages linked to fields
- [ ] Error messages announced on validation
- Notes: [Findings]

### Content Testing
- [ ] Images have appropriate alt text
- [ ] Decorative images use aria-hidden
- [ ] Links have descriptive text
- [ ] Buttons have clear labels
- Notes: [Findings]

### Dynamic Content Testing
- [ ] Loading states announced
- [ ] Search results announced
- [ ] Form submission feedback announced
- [ ] Modal opening announced with focus moved
- Notes: [Findings]

### Issues Found
1. [Issue]: [Description] [WCAG Criterion]
2. [Issue]: [Description] [WCAG Criterion]

### Recommendations
1. [Fix needed]
2. [Enhancement]
```

## Screen Reader Commands Quick Reference

### macOS VoiceOver

| Command | Action |
|---------|--------|
| VO + U | Open Web Rotor |
| VO + Right Arrow | Read next item |
| VO + Left Arrow | Read previous item |
| VO + Down Arrow | Read current item deeply |
| Control | Stop speaking |
| Tab | Next focusable element |
| Shift + Tab | Previous focusable element |
| VO + Home | Go to top of page |
| VO + End | Go to end of page |
| VO + F | Find dialog |

### Windows NVDA

| Command | Action |
|---------|--------|
| NVDA + F7 | Elements list (headings, links, buttons) |
| NVDA + F | Find mode |
| Arrow Keys | Navigate page content |
| Tab | Next focusable element |
| Shift + Tab | Previous focusable element |
| H | Next heading |
| Shift + H | Previous heading |
| L | Next list |
| D | Next landmark |
| B | Next button |
| Insert + H | Toggle heading mode |

## Common Issues and Fixes

| Issue | Screen Reader Announcement | Fix |
|-------|---------------------------|-----|
| Missing label | "Edit text" (no context) | Add `<label for="">` element |
| Decorative image announced | "Image, photo of..." | Add `aria-hidden="true"` |
| Error not announced | Field reads normally | Link error to field with `aria-describedby` |
| Modal opens silently | No announcement | Add `aria-modal="true"` and label |
| Icon button unclear | "Button" (no purpose) | Add `aria-label="button purpose"` |
| Live region ignored | Results don't announce | Add `aria-live="polite"` to container |

## Success Criteria

- All page content can be understood without seeing it
- Forms are fully operable with screen reader
- Dynamic updates are announced appropriately
- Links and buttons have clear, descriptive labels
- Images have meaningful alt text or are hidden
- Tables have proper header associations
- Modal interactions work correctly
- Page navigation is logical and complete

## WCAG Criteria Tested

- 1.1.1 Non-text Content (alt text, aria-hidden)
- 1.3.1 Info and Relationships (labels, table scope)
- 2.4.3 Focus Order (logical navigation)
- 2.4.4 Link Purpose (descriptive link text)
- 3.3.2 Labels or Instructions (form labels)
- 4.1.2 Name, Role, Value (ARIA attributes)
- 4.1.3 Status Messages (live regions)
