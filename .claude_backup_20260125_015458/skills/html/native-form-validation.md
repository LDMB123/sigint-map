---
name: native-form-validation
description: Implement native HTML5 form validation without JavaScript
trigger: /form-validation
used_by: [full-stack-developer, senior-frontend-engineer, accessibility-specialist]
tags: [html5, forms, validation, ux, accessibility]
---

# Native HTML5 Form Validation

Implement client-side form validation using native HTML5 attributes and CSS pseudo-classes, without JavaScript.

## When to Use

- Contact forms
- Login/signup forms
- Checkout forms
- Profile edit forms
- Search inputs
- Survey forms
- Any user input requiring validation

**Use native validation for:**
- Required fields
- Email/URL/number format
- Min/max length or value
- Pattern matching (regex)
- Custom validation messages

## Browser Support

- Chrome/Edge: Full support
- Safari: Full support
- Firefox: Full support
- Mobile browsers: Full support

**All modern browsers support HTML5 validation** - no polyfills needed.

## Required Inputs

- Form fields with validation rules
- Validation constraints (required, pattern, min, max, etc.)
- Custom error messages (optional)
- Submit handler

## Core Validation Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `required` | Field must be filled | `<input required>` |
| `minlength` / `maxlength` | Text length constraints | `<input minlength="3" maxlength="20">` |
| `min` / `max` | Number/date range | `<input type="number" min="1" max="100">` |
| `pattern` | Regex validation | `<input pattern="[A-Z]{2}[0-9]{4}">` |
| `type` | Input type validation | `<input type="email">` |
| `step` | Number increment | `<input type="number" step="0.01">` |

## CSS Validation Pseudo-Classes

| Pseudo-class | When Applied |
|--------------|--------------|
| `:valid` | Input passes all validation |
| `:invalid` | Input fails validation |
| `:required` | Input has `required` attribute |
| `:optional` | Input does NOT have `required` |
| `:in-range` | Number is within min/max |
| `:out-of-range` | Number is outside min/max |
| `:user-valid` | Valid after user interaction (Chrome 119+) |
| `:user-invalid` | Invalid after user interaction (Chrome 119+) |

## Implementation

### Basic Form Validation (Vanilla HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Native Form Validation</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    label {
      font-weight: 600;
      font-size: 14px;
    }

    input, textarea, select {
      padding: 10px 12px;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      font-size: 16px;
      transition: border-color 0.2s;
    }

    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #3b82f6;
    }

    /* Show validation only after user interaction (Chrome 119+) */
    input:user-valid {
      border-color: #10b981;
    }

    input:user-invalid {
      border-color: #ef4444;
    }

    /* Fallback for older browsers: validate on blur */
    input:not(:placeholder-shown):valid {
      border-color: #10b981;
    }

    input:not(:placeholder-shown):invalid {
      border-color: #ef4444;
    }

    /* Error message styling */
    .error-message {
      color: #ef4444;
      font-size: 14px;
      display: none;
    }

    input:invalid + .error-message {
      display: block;
    }

    /* Required field indicator */
    label.required::after {
      content: ' *';
      color: #ef4444;
    }

    button {
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    button:hover {
      background: #2563eb;
    }

    button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .helper-text {
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <h1>Contact Form</h1>

  <form id="contact-form" novalidate>
    <!-- Name Field (Required, min/max length) -->
    <div class="form-field">
      <label for="name" class="required">Name</label>
      <input
        type="text"
        id="name"
        name="name"
        required
        minlength="2"
        maxlength="50"
        placeholder="Enter your name"
        aria-describedby="name-error"
      />
      <span id="name-error" class="error-message">
        Name must be between 2 and 50 characters.
      </span>
    </div>

    <!-- Email Field (Required, email format) -->
    <div class="form-field">
      <label for="email" class="required">Email</label>
      <input
        type="email"
        id="email"
        name="email"
        required
        placeholder="you@example.com"
        aria-describedby="email-error"
      />
      <span id="email-error" class="error-message">
        Please enter a valid email address.
      </span>
    </div>

    <!-- Phone Field (Optional, pattern validation) -->
    <div class="form-field">
      <label for="phone">Phone</label>
      <input
        type="tel"
        id="phone"
        name="phone"
        pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
        placeholder="123-456-7890"
        aria-describedby="phone-help phone-error"
      />
      <span id="phone-help" class="helper-text">
        Format: 123-456-7890
      </span>
      <span id="phone-error" class="error-message">
        Please match the format: 123-456-7890
      </span>
    </div>

    <!-- Age Field (Number with range) -->
    <div class="form-field">
      <label for="age" class="required">Age</label>
      <input
        type="number"
        id="age"
        name="age"
        required
        min="18"
        max="120"
        step="1"
        aria-describedby="age-error"
      />
      <span id="age-error" class="error-message">
        Age must be between 18 and 120.
      </span>
    </div>

    <!-- Website Field (URL validation) -->
    <div class="form-field">
      <label for="website">Website</label>
      <input
        type="url"
        id="website"
        name="website"
        placeholder="https://example.com"
        aria-describedby="website-error"
      />
      <span id="website-error" class="error-message">
        Please enter a valid URL starting with http:// or https://
      </span>
    </div>

    <!-- Message Field (Required, max length) -->
    <div class="form-field">
      <label for="message" class="required">Message</label>
      <textarea
        id="message"
        name="message"
        required
        minlength="10"
        maxlength="500"
        rows="5"
        placeholder="Enter your message"
        aria-describedby="message-error message-count"
      ></textarea>
      <span id="message-count" class="helper-text">
        Maximum 500 characters
      </span>
      <span id="message-error" class="error-message">
        Message must be at least 10 characters.
      </span>
    </div>

    <!-- Submit Button -->
    <button type="submit">Send Message</button>
  </form>

  <script>
    const form = document.getElementById('contact-form');

    // Custom validation messages
    form.addEventListener('invalid', (e) => {
      e.preventDefault(); // Prevent default browser validation UI
    }, true);

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (form.checkValidity()) {
        console.log('Form is valid!');
        const formData = new FormData(form);
        console.log(Object.fromEntries(formData));
        alert('Form submitted successfully!');
        form.reset();
      } else {
        console.log('Form has errors');
      }
    });

    // Show character count for textarea
    const messageField = document.getElementById('message');
    const messageCount = document.getElementById('message-count');

    messageField.addEventListener('input', () => {
      const remaining = 500 - messageField.value.length;
      messageCount.textContent = `${remaining} characters remaining`;
    });
  </script>
</body>
</html>
```

### React Form Validation

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  as?: 'input' | 'textarea';
  rows?: number;
}

export function FormField({
  label,
  name,
  type = 'text',
  required = false,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  placeholder,
  helperText,
  errorMessage,
  as = 'input',
  rows = 4
}: FormFieldProps) {
  const [touched, setTouched] = React.useState(false);
  const [validity, setValidity] = React.useState<ValidityState | null>(null);
  const fieldRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const handleBlur = () => {
    setTouched(true);
    if (fieldRef.current) {
      setValidity(fieldRef.current.validity);
    }
  };

  const handleInput = () => {
    if (touched && fieldRef.current) {
      setValidity(fieldRef.current.validity);
    }
  };

  const showError = touched && validity && !validity.valid;

  const commonProps = {
    ref: fieldRef as any,
    id: name,
    name,
    required,
    minLength,
    maxLength,
    min,
    max,
    pattern,
    placeholder,
    onBlur: handleBlur,
    onInput: handleInput,
    'aria-describedby': `${name}-help ${name}-error`,
    'aria-invalid': showError || undefined,
    className: cn(
      "w-full px-3 py-2 border-2 rounded-md transition-colors",
      "focus:outline-none focus:border-blue-500",
      !touched && "border-gray-300",
      touched && validity?.valid && "border-green-500",
      touched && !validity?.valid && "border-red-500"
    )
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="font-semibold text-sm">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {as === 'textarea' ? (
        <textarea {...commonProps} rows={rows} />
      ) : (
        <input {...commonProps} type={type} />
      )}

      {helperText && (
        <span id={`${name}-help`} className="text-sm text-gray-600">
          {helperText}
        </span>
      )}

      {showError && (
        <span id={`${name}-error`} className="text-sm text-red-500" role="alert">
          {errorMessage || fieldRef.current?.validationMessage}
        </span>
      )}
    </div>
  );
}

export function ContactForm() {
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formRef.current?.checkValidity()) {
      const formData = new FormData(formRef.current);
      console.log('Form data:', Object.fromEntries(formData));
      alert('Form submitted successfully!');
      formRef.current.reset();
    } else {
      console.log('Form has validation errors');
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="max-w-2xl mx-auto p-6 space-y-6"
    >
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>

      <FormField
        label="Name"
        name="name"
        required
        minLength={2}
        maxLength={50}
        placeholder="Enter your name"
        errorMessage="Name must be between 2 and 50 characters"
      />

      <FormField
        label="Email"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        errorMessage="Please enter a valid email address"
      />

      <FormField
        label="Phone"
        name="phone"
        type="tel"
        pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
        placeholder="123-456-7890"
        helperText="Format: 123-456-7890"
        errorMessage="Please match the format: 123-456-7890"
      />

      <FormField
        label="Age"
        name="age"
        type="number"
        required
        min={18}
        max={120}
        errorMessage="Age must be between 18 and 120"
      />

      <FormField
        label="Website"
        name="website"
        type="url"
        placeholder="https://example.com"
        errorMessage="Please enter a valid URL"
      />

      <FormField
        label="Message"
        name="message"
        as="textarea"
        required
        minLength={10}
        maxLength={500}
        placeholder="Enter your message"
        helperText="Maximum 500 characters"
        errorMessage="Message must be at least 10 characters"
        rows={5}
      />

      <button
        type="submit"
        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
      >
        Send Message
      </button>
    </form>
  );
}
```

### Svelte 5 Form Validation

```svelte
<script lang="ts">
  interface FormField {
    value: string;
    touched: boolean;
    validity: ValidityState | null;
  }

  let formData = $state({
    name: { value: '', touched: false, validity: null } as FormField,
    email: { value: '', touched: false, validity: null } as FormField,
    phone: { value: '', touched: false, validity: null } as FormField,
    age: { value: '', touched: false, validity: null } as FormField,
    message: { value: '', touched: false, validity: null } as FormField,
  });

  let formRef: HTMLFormElement | null = $state(null);

  function handleBlur(field: keyof typeof formData, event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    formData[field].touched = true;
    formData[field].validity = target.validity;
  }

  function handleInput(field: keyof typeof formData, event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    formData[field].value = target.value;
    if (formData[field].touched) {
      formData[field].validity = target.validity;
    }
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (formRef?.checkValidity()) {
      const data = new FormData(formRef);
      console.log('Form submitted:', Object.fromEntries(data));
      alert('Form submitted successfully!');
      formRef.reset();

      // Reset validation state
      Object.keys(formData).forEach(key => {
        formData[key as keyof typeof formData] = { value: '', touched: false, validity: null };
      });
    } else {
      console.log('Form has errors');
    }
  }

  function getFieldClass(field: FormField) {
    if (!field.touched) return 'border-gray-300';
    return field.validity?.valid ? 'border-green-500' : 'border-red-500';
  }

  function showError(field: FormField) {
    return field.touched && field.validity && !field.validity.valid;
  }
</script>

<form
  bind:this={formRef}
  onsubmit={handleSubmit}
  novalidate
  class="form"
>
  <h1>Contact Us</h1>

  <!-- Name Field -->
  <div class="form-field">
    <label for="name" class="required">Name</label>
    <input
      type="text"
      id="name"
      name="name"
      required
      minlength={2}
      maxlength={50}
      placeholder="Enter your name"
      class={getFieldClass(formData.name)}
      onblur={(e) => handleBlur('name', e)}
      oninput={(e) => handleInput('name', e)}
      aria-describedby="name-error"
    />
    {#if showError(formData.name)}
      <span id="name-error" class="error-message" role="alert">
        Name must be between 2 and 50 characters.
      </span>
    {/if}
  </div>

  <!-- Email Field -->
  <div class="form-field">
    <label for="email" class="required">Email</label>
    <input
      type="email"
      id="email"
      name="email"
      required
      placeholder="you@example.com"
      class={getFieldClass(formData.email)}
      onblur={(e) => handleBlur('email', e)}
      oninput={(e) => handleInput('email', e)}
      aria-describedby="email-error"
    />
    {#if showError(formData.email)}
      <span id="email-error" class="error-message" role="alert">
        Please enter a valid email address.
      </span>
    {/if}
  </div>

  <!-- Phone Field -->
  <div class="form-field">
    <label for="phone">Phone</label>
    <input
      type="tel"
      id="phone"
      name="phone"
      pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
      placeholder="123-456-7890"
      class={getFieldClass(formData.phone)}
      onblur={(e) => handleBlur('phone', e)}
      oninput={(e) => handleInput('phone', e)}
      aria-describedby="phone-help phone-error"
    />
    <span id="phone-help" class="helper-text">Format: 123-456-7890</span>
    {#if showError(formData.phone)}
      <span id="phone-error" class="error-message" role="alert">
        Please match the format: 123-456-7890
      </span>
    {/if}
  </div>

  <!-- Age Field -->
  <div class="form-field">
    <label for="age" class="required">Age</label>
    <input
      type="number"
      id="age"
      name="age"
      required
      min={18}
      max={120}
      step={1}
      class={getFieldClass(formData.age)}
      onblur={(e) => handleBlur('age', e)}
      oninput={(e) => handleInput('age', e)}
      aria-describedby="age-error"
    />
    {#if showError(formData.age)}
      <span id="age-error" class="error-message" role="alert">
        Age must be between 18 and 120.
      </span>
    {/if}
  </div>

  <!-- Message Field -->
  <div class="form-field">
    <label for="message" class="required">Message</label>
    <textarea
      id="message"
      name="message"
      required
      minlength={10}
      maxlength={500}
      rows={5}
      placeholder="Enter your message"
      class={getFieldClass(formData.message)}
      onblur={(e) => handleBlur('message', e)}
      oninput={(e) => handleInput('message', e)}
      aria-describedby="message-help message-error"
    ></textarea>
    <span id="message-help" class="helper-text">Maximum 500 characters</span>
    {#if showError(formData.message)}
      <span id="message-error" class="error-message" role="alert">
        Message must be at least 10 characters.
      </span>
    {/if}
  </div>

  <button type="submit">Send Message</button>
</form>

<style>
  .form {
    max-width: 600px;
    margin: 40px auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-weight: 600;
    font-size: 14px;
  }

  label.required::after {
    content: ' *';
    color: #ef4444;
  }

  input, textarea {
    padding: 10px 12px;
    border: 2px solid;
    border-radius: 6px;
    font-size: 16px;
    transition: border-color 0.2s;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .border-gray-300 {
    border-color: #d1d5db;
  }

  .border-green-500 {
    border-color: #10b981;
  }

  .border-red-500 {
    border-color: #ef4444;
  }

  .helper-text {
    font-size: 14px;
    color: #6b7280;
  }

  .error-message {
    color: #ef4444;
    font-size: 14px;
  }

  button {
    padding: 12px 24px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover {
    background: #2563eb;
  }
</style>
```

## Custom Validation Messages

### Using `setCustomValidity()`

```javascript
const input = document.getElementById('username');

input.addEventListener('input', () => {
  if (input.validity.patternMismatch) {
    input.setCustomValidity('Username must contain only letters and numbers');
  } else {
    input.setCustomValidity(''); // Clear custom message
  }
});
```

### Pattern Examples

```html
<!-- Postal code (US ZIP) -->
<input
  type="text"
  pattern="[0-9]{5}"
  title="5-digit ZIP code"
/>

<!-- Phone (US format) -->
<input
  type="tel"
  pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
  title="Format: 123-456-7890"
/>

<!-- Credit card -->
<input
  type="text"
  pattern="[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}"
  title="Format: 1234 5678 9012 3456"
/>

<!-- Password (8+ chars, 1 uppercase, 1 number) -->
<input
  type="password"
  pattern="(?=.*\d)(?=.*[A-Z]).{8,}"
  title="At least 8 characters with 1 uppercase letter and 1 number"
/>

<!-- Username (alphanumeric, 3-20 chars) -->
<input
  type="text"
  pattern="[a-zA-Z0-9]{3,20}"
  title="3-20 alphanumeric characters"
/>
```

## Accessibility Considerations

- Always use `<label>` with `for` attribute
- Use `aria-describedby` to associate error messages
- Use `aria-invalid` on invalid fields
- Ensure error messages have `role="alert"` for screen readers
- Required fields should be clearly marked (visually and semantically)
- Don't disable submit button (let validation run on submit)

## Progressive Enhancement

Start with native validation, enhance with JavaScript:

```html
<form novalidate> <!-- Disable browser UI, use custom -->
  <input type="email" required />
  <span class="error-message"></span>
</form>

<script>
  // Use Constraint Validation API
  input.addEventListener('blur', () => {
    if (!input.validity.valid) {
      errorSpan.textContent = input.validationMessage;
    }
  });
</script>
```

## Success Criteria

- [ ] All required fields validated
- [ ] Email/URL/number formats enforced
- [ ] Min/max length/value constraints work
- [ ] Pattern matching for custom formats
- [ ] Error messages clear and helpful
- [ ] Validation triggers on blur (not on every keystroke)
- [ ] Success state visually indicated
- [ ] Keyboard accessible
- [ ] Screen reader announces errors
- [ ] Form submits only when valid

## References

- [MDN: Form Validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation)
- [MDN: Constraint Validation API](https://developer.mozilla.org/en-US/docs/Web/API/Constraint_validation)
- [HTML5 Input Types](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types)
- [W3C: Pattern Attribute](https://html.spec.whatwg.org/multipage/input.html#attr-input-pattern)
