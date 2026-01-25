---
name: input-types
description: Implement native HTML5 input types for better UX and mobile keyboards
trigger: /input-types
used_by: [full-stack-developer, senior-frontend-engineer, ux-engineer]
tags: [html5, forms, input, mobile, ux, accessibility]
---

# Native HTML5 Input Types

Implement specialized HTML5 input types for better user experience, mobile keyboard optimization, and built-in validation.

## When to Use

Use specialized input types instead of `type="text"` whenever possible:

- **Date/time inputs**: Calendars, scheduling, event registration
- **Email/URL/Tel**: Contact forms, profile fields
- **Number/Range**: Quantity selectors, ratings, sliders
- **Color**: Theme customizers, design tools
- **Search**: Search bars (mobile optimizations)
- **Datalist**: Autocomplete, suggestions

## Browser Support

All modern browsers support HTML5 input types:
- Chrome/Edge: Full support
- Safari: Full support (including iOS)
- Firefox: Full support

**Graceful degradation:** Unsupported types fall back to `type="text"`.

## Date and Time Inputs

### Date Input

```html
<label for="birthdate">Birthdate</label>
<input
  type="date"
  id="birthdate"
  name="birthdate"
  min="1900-01-01"
  max="2026-12-31"
  value="2000-01-01"
/>
```

**Mobile behavior:** Native date picker (iOS/Android)

### Time Input

```html
<label for="appointment">Appointment Time</label>
<input
  type="time"
  id="appointment"
  name="appointment"
  min="09:00"
  max="17:00"
  step="900"
/>
```

**Note:** `step="900"` = 15-minute increments (900 seconds)

### DateTime-Local Input

```html
<label for="meeting">Meeting Date & Time</label>
<input
  type="datetime-local"
  id="meeting"
  name="meeting"
  min="2026-01-01T09:00"
  max="2026-12-31T17:00"
/>
```

**Use case:** Event scheduling with specific time

### Week Input

```html
<label for="vacation-week">Vacation Week</label>
<input
  type="week"
  id="vacation-week"
  name="vacation"
  min="2026-W01"
  max="2026-W52"
/>
```

**Format:** `YYYY-Www` (e.g., 2026-W05 = 5th week of 2026)

### Month Input

```html
<label for="start-month">Start Month</label>
<input
  type="month"
  id="start-month"
  name="start-month"
  min="2026-01"
  max="2030-12"
/>
```

**Format:** `YYYY-MM`

## Email, URL, and Tel Inputs

### Email Input

```html
<label for="email">Email Address</label>
<input
  type="email"
  id="email"
  name="email"
  placeholder="you@example.com"
  required
  autocomplete="email"
/>

<!-- Multiple emails -->
<input
  type="email"
  name="recipients"
  multiple
  placeholder="email1@example.com, email2@example.com"
/>
```

**Benefits:**
- Email keyboard on mobile (includes @ key)
- Built-in format validation
- Autocomplete integration

### URL Input

```html
<label for="website">Website</label>
<input
  type="url"
  id="website"
  name="website"
  placeholder="https://example.com"
  pattern="https?://.*"
/>
```

**Benefits:**
- URL keyboard on mobile (.com key)
- Validates http:// or https://
- Better autocomplete

### Tel Input

```html
<label for="phone">Phone Number</label>
<input
  type="tel"
  id="phone"
  name="phone"
  placeholder="(555) 123-4567"
  pattern="[\(][0-9]{3}[\)] [0-9]{3}-[0-9]{4}"
  autocomplete="tel"
/>
```

**Benefits:**
- Numeric keyboard on mobile
- Pattern validation
- Country code support

## Number and Range Inputs

### Number Input

```html
<label for="quantity">Quantity</label>
<input
  type="number"
  id="quantity"
  name="quantity"
  min="1"
  max="99"
  step="1"
  value="1"
/>

<!-- Decimal numbers -->
<input
  type="number"
  name="price"
  min="0"
  step="0.01"
  placeholder="0.00"
/>
```

**Attributes:**
- `min`: Minimum value
- `max`: Maximum value
- `step`: Increment/decrement amount (0.01 for cents)

### Range Input (Slider)

```html
<label for="volume">Volume</label>
<input
  type="range"
  id="volume"
  name="volume"
  min="0"
  max="100"
  step="1"
  value="50"
  oninput="volumeOutput.value = this.value"
/>
<output id="volumeOutput">50</output>

<style>
  input[type="range"] {
    width: 100%;
  }
</style>
```

**Advanced Range with Labels:**

```html
<label for="rating">Rating</label>
<div class="range-container">
  <input
    type="range"
    id="rating"
    name="rating"
    min="1"
    max="5"
    step="1"
    value="3"
    list="rating-marks"
    oninput="ratingValue.textContent = this.value"
  />
  <datalist id="rating-marks">
    <option value="1" label="Poor"></option>
    <option value="2" label="Fair"></option>
    <option value="3" label="Good"></option>
    <option value="4" label="Great"></option>
    <option value="5" label="Excellent"></option>
  </datalist>
  <span>Selected: <strong id="ratingValue">3</strong></span>
</div>
```

## Color Input

```html
<label for="brand-color">Brand Color</label>
<input
  type="color"
  id="brand-color"
  name="brand-color"
  value="#3b82f6"
/>

<script>
  const colorInput = document.getElementById('brand-color');
  colorInput.addEventListener('input', (e) => {
    console.log('Selected color:', e.target.value); // #rrggbb format
    document.body.style.setProperty('--primary-color', e.target.value);
  });
</script>
```

**Returns:** Hex color value (e.g., `#3b82f6`)

## Search Input

```html
<label for="search">Search</label>
<input
  type="search"
  id="search"
  name="q"
  placeholder="Search..."
  autocomplete="off"
  autofocus
/>
```

**Benefits:**
- Search icon on mobile keyboards
- Clear button (X) in most browsers
- Better autocomplete behavior
- Can trigger search on Enter

## Datalist (Autocomplete)

```html
<label for="country">Country</label>
<input
  type="text"
  id="country"
  name="country"
  list="countries"
  placeholder="Start typing..."
  autocomplete="country-name"
/>
<datalist id="countries">
  <option value="United States">
  <option value="Canada">
  <option value="United Kingdom">
  <option value="Australia">
  <option value="Germany">
  <option value="France">
  <option value="Japan">
</datalist>
```

**Benefits:**
- Native autocomplete dropdown
- User can still type custom value
- Works with any input type

**With Descriptions:**

```html
<datalist id="browsers">
  <option value="Chrome">Google Chrome</option>
  <option value="Firefox">Mozilla Firefox</option>
  <option value="Safari">Apple Safari</option>
  <option value="Edge">Microsoft Edge</option>
</datalist>
```

## Complete Form Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML5 Input Types Demo</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
    }

    input, select {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      font-size: 16px;
    }

    input:focus {
      outline: none;
      border-color: #3b82f6;
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
    }

    .range-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    output {
      font-weight: 600;
      color: #3b82f6;
    }
  </style>
</head>
<body>
  <h1>Event Registration</h1>

  <form id="registration-form">
    <!-- Email -->
    <div class="form-group">
      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        name="email"
        required
        autocomplete="email"
        placeholder="you@example.com"
      />
    </div>

    <!-- Phone -->
    <div class="form-group">
      <label for="phone">Phone</label>
      <input
        type="tel"
        id="phone"
        name="phone"
        autocomplete="tel"
        placeholder="(555) 123-4567"
      />
    </div>

    <!-- Website -->
    <div class="form-group">
      <label for="website">Website (optional)</label>
      <input
        type="url"
        id="website"
        name="website"
        placeholder="https://example.com"
      />
    </div>

    <!-- Event Date -->
    <div class="form-group">
      <label for="event-date">Event Date</label>
      <input
        type="date"
        id="event-date"
        name="event-date"
        required
        min="2026-01-01"
        max="2026-12-31"
      />
    </div>

    <!-- Event Time -->
    <div class="form-group">
      <label for="event-time">Event Time</label>
      <input
        type="time"
        id="event-time"
        name="event-time"
        required
        min="09:00"
        max="18:00"
      />
    </div>

    <!-- Number of Attendees -->
    <div class="form-group">
      <label for="attendees">Number of Attendees</label>
      <input
        type="number"
        id="attendees"
        name="attendees"
        required
        min="1"
        max="10"
        value="1"
      />
    </div>

    <!-- Satisfaction Rating -->
    <div class="form-group">
      <label for="rating">Expected Satisfaction (1-5)</label>
      <div class="range-group">
        <input
          type="range"
          id="rating"
          name="rating"
          min="1"
          max="5"
          step="1"
          value="3"
          oninput="ratingOutput.value = this.value"
        />
        <output id="ratingOutput">3</output>
      </div>
    </div>

    <!-- City (with autocomplete) -->
    <div class="form-group">
      <label for="city">City</label>
      <input
        type="text"
        id="city"
        name="city"
        list="cities"
        placeholder="Start typing..."
      />
      <datalist id="cities">
        <option value="New York">
        <option value="Los Angeles">
        <option value="Chicago">
        <option value="Houston">
        <option value="Phoenix">
      </datalist>
    </div>

    <!-- Theme Color -->
    <div class="form-group">
      <label for="theme-color">Preferred Theme Color</label>
      <input
        type="color"
        id="theme-color"
        name="theme-color"
        value="#3b82f6"
      />
    </div>

    <!-- Search for Session -->
    <div class="form-group">
      <label for="session">Search Sessions</label>
      <input
        type="search"
        id="session"
        name="session"
        placeholder="Search sessions..."
      />
    </div>

    <button type="submit">Register</button>
  </form>

  <script>
    document.getElementById('registration-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      console.log('Form data:', Object.fromEntries(formData));
      alert('Registration submitted!');
    });
  </script>
</body>
</html>
```

## Mobile Keyboard Optimizations

| Input Type | Mobile Keyboard |
|------------|-----------------|
| `type="text"` | Standard QWERTY |
| `type="email"` | QWERTY + @ and .com |
| `type="url"` | QWERTY + .com and / |
| `type="tel"` | Numeric dial pad |
| `type="number"` | Numeric with +/- |
| `type="search"` | Search icon instead of Enter |
| `type="date"` | Native date picker |
| `type="time"` | Native time picker |

**Example: Mobile-optimized contact form**

```html
<form>
  <!-- Email keyboard (@ key) -->
  <input type="email" name="email" />

  <!-- Numeric keyboard -->
  <input type="tel" name="phone" />

  <!-- URL keyboard (.com key) -->
  <input type="url" name="website" />
</form>
```

## Autocomplete Tokens

Use `autocomplete` attribute for better UX:

```html
<!-- Personal Info -->
<input type="text" name="fname" autocomplete="given-name" />
<input type="text" name="lname" autocomplete="family-name" />
<input type="email" name="email" autocomplete="email" />
<input type="tel" name="phone" autocomplete="tel" />

<!-- Address -->
<input type="text" name="street" autocomplete="street-address" />
<input type="text" name="city" autocomplete="address-level2" />
<input type="text" name="state" autocomplete="address-level1" />
<input type="text" name="zip" autocomplete="postal-code" />
<input type="text" name="country" autocomplete="country-name" />

<!-- Payment -->
<input type="text" name="cc-name" autocomplete="cc-name" />
<input type="text" name="cc-number" autocomplete="cc-number" />
<input type="text" name="cc-exp" autocomplete="cc-exp" />
<input type="text" name="cc-csc" autocomplete="cc-csc" />

<!-- Credentials -->
<input type="text" name="username" autocomplete="username" />
<input type="password" name="password" autocomplete="current-password" />
<input type="password" name="new-password" autocomplete="new-password" />
```

## React Component Example

```tsx
import * as React from "react";

interface InputFieldProps {
  label: string;
  type: string;
  name: string;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  placeholder?: string;
  autocomplete?: string;
  list?: string;
  value?: string | number;
  onChange?: (value: string) => void;
}

export function InputField({
  label,
  type,
  name,
  required,
  min,
  max,
  step,
  placeholder,
  autocomplete,
  list,
  value,
  onChange
}: InputFieldProps) {
  return (
    <div className="form-group">
      <label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        required={required}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        autoComplete={autocomplete}
        list={list}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-3 py-2 border-2 rounded-md focus:border-blue-500"
      />
    </div>
  );
}

// Usage
<InputField
  label="Email"
  type="email"
  name="email"
  required
  autocomplete="email"
  placeholder="you@example.com"
/>

<InputField
  label="Event Date"
  type="date"
  name="event-date"
  required
  min="2026-01-01"
  max="2026-12-31"
/>

<InputField
  label="Quantity"
  type="number"
  name="quantity"
  required
  min={1}
  max={99}
  step={1}
  value={1}
/>
```

## Accessibility Considerations

- Always use `<label>` with `for` attribute
- Use `aria-describedby` for helper text
- Use `autocomplete` for better autofill
- Ensure color inputs have text alternatives
- Provide `min`, `max`, `step` hints for screen readers
- Date pickers should announce current date

## Browser Compatibility Notes

### Fallback Strategy

```html
<!-- Browsers that don't support type="date" will show type="text" -->
<input type="date" name="date" placeholder="YYYY-MM-DD" />

<!-- Detect support with JavaScript -->
<script>
  const input = document.createElement('input');
  input.type = 'date';

  if (input.type === 'text') {
    // Browser doesn't support type="date"
    // Load polyfill or use text input with validation
    console.log('Date input not supported, using fallback');
  }
</script>
```

## Performance Considerations

- Use `autocomplete` to reduce typing and errors
- Use native pickers (date/time) instead of JS libraries
- Lazy-load datalist options if large dataset
- Debounce search input for better performance

## Success Criteria

- [ ] Appropriate input types used (not just `type="text"`)
- [ ] Mobile keyboards optimized (email, tel, url, number)
- [ ] Date/time inputs use native pickers
- [ ] Autocomplete tokens provided
- [ ] Datalist used for suggestions
- [ ] Range inputs have visible value output
- [ ] Color inputs have default values
- [ ] All inputs have labels
- [ ] Required fields marked clearly
- [ ] Min/max/step constraints specified

## References

- [MDN: Input Types](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types)
- [HTML5 Input Types](https://html.spec.whatwg.org/multipage/input.html#states-of-the-type-attribute)
- [Autocomplete Tokens](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete)
- [Datalist Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
- [Mobile Input Types](https://css-tricks.com/better-form-inputs-for-better-mobile-user-experiences/)
