---
title: field-sizing CSS Property
description: Auto-sizing form fields to content without JavaScript
tags: [css, chromium-143, forms, inputs, auto-sizing]
min_chrome_version: 123
category: CSS Properties
complexity: beginner
last_updated: 2026-01
---

# field-sizing: content (Chrome 123+)

Form inputs and textareas grow/shrink with content automatically. No JavaScript resize listeners, no contenteditable fallbacks, no CSS tricks with visibility.

## When to Use

- **Textarea autogrow** - Text area expands as user types
- **Contentless inputs** - Input fields adjust to content
- **Auto-expanding fields** - Search bars, filter inputs
- **Form UX** - Natural, responsive form behavior
- **Any form element** - Works on input, textarea, select

## Syntax

```css
field-sizing: content;  /* Auto-size to content */
field-sizing: fixed;    /* Default - fixed size */
```

## Examples

### Basic Textarea Autogrow

```css
textarea {
  field-sizing: content;
  /* Grows taller as user types, shrinks when deleting */

  min-height: 60px;
  max-height: 400px;
  /* Constrain size limits */

  resize: none;
  /* Don't allow manual resize - auto only */
}

/* No JavaScript needed:
   - User types → height increases
   - User deletes → height decreases
   - All automatic
*/
```

### Comment Box

```css
.comment-box textarea {
  field-sizing: content;
  min-height: 80px;
  max-height: 300px;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  font-family: inherit;
  font-size: 1rem;
  resize: none;
  /* Auto-sizing - user can type indefinitely, bounded by max-height */
}
```

### Search Input

```css
.search-input input {
  field-sizing: content;
  min-width: 200px;
  max-width: 600px;
  padding: 0.5rem 1rem;
  border: 1px solid #999;
  /* Grows horizontally as user types longer search queries */
}
```

### Dynamic Filter

```css
.filter-controls input {
  field-sizing: content;
  min-width: 100px;
  padding: 0.5rem;
  /* Each filter grows to its content */
}
```

### Form Field with Label

```css
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.5rem;
}

.form-group label {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group textarea {
  field-sizing: content;
  min-height: 40px;
  max-height: 500px;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 0.375rem;
  font: inherit;
  /* All form inputs auto-size */
}
```

### Textarea with Placeholder

```css
textarea {
  field-sizing: content;
  min-height: 100px;
  /* Placeholder text counts toward content height */
}

textarea::placeholder {
  color: #999;
}

/* With placeholder, min-height ensures minimum size
   even when field is empty */
```

### Multi-line Input Alternative

```css
/* Use textarea instead of input for multi-line text */
.description-field {
  width: 100%;
}

.description-field textarea {
  field-sizing: content;
  min-height: 60px;
  max-height: 300px;
  resize: none;
  /* Replaces contenteditable hacks */
}
```

### Chat Message Input

```css
.chat-input-area {
  display: flex;
  gap: 0.5rem;
}

.chat-input-area textarea {
  flex: 1;
  field-sizing: content;
  min-height: 40px;
  max-height: 120px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  resize: none;
  font-family: inherit;
  /* Grows as user types message, but never exceeds max-height */
}

.chat-input-area button {
  align-self: flex-end;
  padding: 0.5rem 1rem;
  /* Button aligns with textarea bottom */
}
```

### Form Validation States

```css
textarea {
  field-sizing: content;
  min-height: 80px;
  max-height: 300px;
  padding: 0.75rem;
  border: 2px solid #ccc;
  border-radius: 0.375rem;
  transition: border-color 0.2s, background-color 0.2s;
}

textarea:valid {
  border-color: #22863a;
  background-color: #f0fdf4;
}

textarea:invalid {
  border-color: #d32f2f;
  background-color: #ffebee;
}

textarea:focus {
  border-color: #0066cc;
  outline: none;
}
```

### Rich Text Editor

```css
.editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.editor-toolbar {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 0.375rem;
}

.editor-toolbar button {
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.editor-content textarea {
  field-sizing: content;
  min-height: 200px;
  max-height: 800px;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  font-family: 'Monaco', monospace;
  font-size: 0.95rem;
  resize: none;
  /* Textarea grows with content */
}

.editor-preview {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  background: #fafafa;
  min-height: 200px;
  /* Preview area below editor */
}
```

### Code Input

```css
.code-editor textarea {
  field-sizing: content;
  min-height: 150px;
  max-height: 800px;
  width: 100%;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 0.375rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  tab-size: 2;
  white-space: pre;
  overflow-wrap: normal;
  resize: none;
  /* Code grows with input */
}
```

### Nested Form Sections

```css
.form-section {
  padding: 1.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.form-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.form-group textarea {
  width: 100%;
  field-sizing: content;
  min-height: 80px;
  max-height: 400px;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 0.375rem;
  resize: none;
}
```

### Responsive Form

```css
@media (max-width: 768px) {
  textarea {
    field-sizing: content;
    min-height: 60px;
    max-height: 250px;
    /* Tighter constraints on mobile */
  }
}

@media (min-width: 769px) {
  textarea {
    field-sizing: content;
    min-height: 100px;
    max-height: 500px;
    /* More space on desktop */
  }
}
```

### Combined with Other Properties

```css
textarea {
  /* All properties work together */
  field-sizing: content;
  width: 100%;
  min-height: 80px;
  max-height: 400px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 2px solid #ddd;
  border-radius: 0.375rem;
  font: inherit;
  line-height: 1.5;
  resize: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

textarea:focus {
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  outline: none;
}
```

## JavaScript Integration (Optional)

```typescript
// No JavaScript needed for basic auto-sizing!
// But you can enhance with validation, submit handlers, etc.

interface AutoSizingTextarea extends HTMLTextAreaElement {
  minHeight: number;
  maxHeight: number;
}

// Optional: Listen for height changes
function setupAutoSizingTextarea(selector: string): void {
  const textareas = document.querySelectorAll(selector) as NodeListOf<HTMLTextAreaElement>;

  textareas.forEach((textarea) => {
    // field-sizing: content handles sizing automatically
    // Optional: Add validation or submission handlers

    textarea.addEventListener('input', () => {
      // Height automatically adjusts via CSS
      // But you can do other things here (character count, validation, etc.)
      updateCharacterCount(textarea);
    });
  });
}

function updateCharacterCount(textarea: HTMLTextAreaElement): void {
  const count = textarea.value.length;
  const counter = textarea.nextElementSibling as HTMLElement;
  if (counter) {
    counter.textContent = `${count} characters`;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupAutoSizingTextarea('textarea[data-auto-size]');
});
```

## Browser Behavior

```
field-sizing: content
├─ Initial height = content height + padding
├─ As user types:
│  └─ Text wraps → height increases
├─ As user deletes:
│  └─ Text unwraps → height decreases
└─ Bounded by min-height and max-height
```

## Comparison with Old Methods

| Method | Code | Auto-size | Smooth |
|--------|------|-----------|--------|
| Fixed height | CSS only | No | N/A |
| contenteditable | CSS + HTML | Yes | Varies |
| JavaScript resize | CSS + JS | Yes | Good |
| field-sizing | CSS only | Yes | Native |

## Form with Multiple Auto-Sizing Fields

```css
.contact-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 600px;
  margin: 0 auto;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.form-group input,
.form-group textarea {
  field-sizing: content;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 0.375rem;
  font: inherit;
  font-size: 1rem;
}

.form-group input {
  min-height: 40px;
  /* Inputs are typically single-line */
}

.form-group textarea {
  min-height: 120px;
  max-height: 400px;
  resize: none;
  /* Textareas grow with content */
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-group .error {
  color: #d32f2f;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.form-group .hint {
  color: #666;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.form-actions button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.form-actions .submit {
  background: #0066cc;
  color: white;
  flex: 1;
}

.form-actions .reset {
  background: #f0f0f0;
  color: #333;
}
```

## Performance

- **Zero JavaScript** - CSS handles all sizing
- **Native performance** - Browser optimization
- **No layout thrashing** - Height calculated during render
- **Smooth animations** - CSS transitions work naturally

## Real-World Use Cases

**1. Support ticket form** - Description field grows with issue details
**2. Feedback survey** - Comments field expands with feedback
**3. Chat interface** - Message input grows as user types
**4. Blog editor** - Content textarea auto-expands
**5. Code playground** - Code input grows with program size
**6. Newsletter signup** - Message field for custom notes
