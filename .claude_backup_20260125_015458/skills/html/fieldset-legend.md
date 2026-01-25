---
title: Fieldset and Legend for Form Grouping
category: html
description: Using <fieldset> and <legend> to group related form controls with proper accessibility
tags: [html5, forms, fieldset, legend, accessibility, aria, form-grouping]
---

# Fieldset and Legend Skill

## When to Use

- Grouping related form controls (radio buttons, checkboxes)
- Creating logical sections in long forms
- Grouping personal information, address fields, payment details
- Improving form accessibility for screen readers
- Disabling multiple form controls simultaneously
- Creating visually distinct form sections

## Required Inputs

- **Group purpose**: What the fields have in common (e.g., "Shipping Address")
- **Form controls**: Radio buttons, checkboxes, inputs to group
- **Legend text**: Descriptive label for the group
- **Disabled state**: Whether entire group should be disabled
- **Styling needs**: Border, padding, custom appearance

## Steps

### Step 1: Understand `<fieldset>` and `<legend>` Basics

The `<fieldset>` element groups related form controls, and `<legend>` provides a caption:

```html
<fieldset>
  <legend>Personal Information</legend>

  <label for="first-name">First Name:</label>
  <input type="text" id="first-name" name="first-name">

  <label for="last-name">Last Name:</label>
  <input type="text" id="last-name" name="last-name">
</fieldset>
```

**Key points**:
- `<legend>` must be the first child of `<fieldset>`
- Only one `<legend>` per `<fieldset>`
- Screen readers announce legend when entering the group
- Provides semantic structure for forms

### Step 2: Group Radio Buttons (Most Common Use Case)

Radio buttons should always be grouped with `<fieldset>`:

```html
<fieldset>
  <legend>Choose your shipping method:</legend>

  <label>
    <input type="radio" name="shipping" value="standard" checked>
    Standard Shipping (5-7 days) - Free
  </label>

  <label>
    <input type="radio" name="shipping" value="express">
    Express Shipping (2-3 days) - $9.99
  </label>

  <label>
    <input type="radio" name="shipping" value="overnight">
    Overnight Shipping (1 day) - $24.99
  </label>
</fieldset>
```

**Why this matters**:
- Screen readers announce: "Choose your shipping method, group"
- Then: "Standard Shipping, radio button, checked, 1 of 3"
- Without `<fieldset>`, users don't know the context

### Step 3: Group Checkboxes

Group related checkboxes for better context:

```html
<fieldset>
  <legend>Select your interests:</legend>

  <label>
    <input type="checkbox" name="interests" value="sports">
    Sports
  </label>

  <label>
    <input type="checkbox" name="interests" value="music">
    Music
  </label>

  <label>
    <input type="checkbox" name="interests" value="technology">
    Technology
  </label>

  <label>
    <input type="checkbox" name="interests" value="travel">
    Travel
  </label>
</fieldset>
```

### Step 4: Create Multi-Section Forms

Use multiple fieldsets to organize complex forms:

```html
<form>
  <fieldset>
    <legend>Account Information</legend>

    <label for="username">Username:</label>
    <input type="text" id="username" name="username" required>

    <label for="email">Email:</label>
    <input type="email" id="email" name="email" required>

    <label for="password">Password:</label>
    <input type="password" id="password" name="password" required>
  </fieldset>

  <fieldset>
    <legend>Shipping Address</legend>

    <label for="address1">Street Address:</label>
    <input type="text" id="address1" name="address1" required>

    <label for="city">City:</label>
    <input type="text" id="city" name="city" required>

    <label for="state">State:</label>
    <select id="state" name="state" required>
      <option value="">Select state...</option>
      <option value="CA">California</option>
      <option value="NY">New York</option>
      <option value="TX">Texas</option>
    </select>

    <label for="zip">ZIP Code:</label>
    <input type="text" id="zip" name="zip" pattern="[0-9]{5}" required>
  </fieldset>

  <fieldset>
    <legend>Payment Method</legend>

    <label>
      <input type="radio" name="payment" value="credit" checked>
      Credit Card
    </label>

    <label>
      <input type="radio" name="payment" value="debit">
      Debit Card
    </label>

    <label>
      <input type="radio" name="payment" value="paypal">
      PayPal
    </label>
  </fieldset>

  <button type="submit">Submit Order</button>
</form>
```

### Step 5: Use `disabled` Attribute to Disable Entire Group

Disable all controls within a fieldset:

```html
<form>
  <fieldset>
    <legend>
      <label>
        <input type="checkbox" id="enable-billing">
        Use different billing address
      </label>
    </legend>
  </fieldset>

  <!-- Disabled by default -->
  <fieldset id="billing-address" disabled>
    <legend>Billing Address</legend>

    <label for="billing-street">Street:</label>
    <input type="text" id="billing-street" name="billing-street">

    <label for="billing-city">City:</label>
    <input type="text" id="billing-city" name="billing-city">

    <label for="billing-zip">ZIP:</label>
    <input type="text" id="billing-zip" name="billing-zip">
  </fieldset>
</form>

<script>
  const enableCheckbox = document.getElementById('enable-billing');
  const billingFieldset = document.getElementById('billing-address');

  enableCheckbox.addEventListener('change', () => {
    billingFieldset.disabled = !enableCheckbox.checked;
  });
</script>
```

**Benefits**:
- Single attribute disables all nested controls
- Grayed out appearance (browser default)
- Screen readers announce "unavailable" or "disabled"

### Step 6: Nest Fieldsets for Complex Grouping

Fieldsets can be nested for hierarchical organization:

```html
<form>
  <fieldset>
    <legend>Contact Preferences</legend>

    <!-- Nested fieldset for email preferences -->
    <fieldset>
      <legend>Email Notifications</legend>

      <label>
        <input type="checkbox" name="email-news">
        Newsletter
      </label>

      <label>
        <input type="checkbox" name="email-promo">
        Promotional offers
      </label>

      <label>
        <input type="checkbox" name="email-updates">
        Product updates
      </label>
    </fieldset>

    <!-- Nested fieldset for SMS preferences -->
    <fieldset>
      <legend>SMS Notifications</legend>

      <label>
        <input type="checkbox" name="sms-alerts">
        Order alerts
      </label>

      <label>
        <input type="checkbox" name="sms-promo">
        Promotional offers
      </label>
    </fieldset>
  </fieldset>
</form>
```

### Step 7: Style Fieldsets with CSS

Customize appearance while preserving semantics:

```css
/* Reset browser defaults */
fieldset {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

legend {
  padding: 0 0.5rem;
  font-weight: 600;
  color: #333;
}

/* Modern card-like style */
fieldset.card {
  border: none;
  background: #f9f9f9;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

fieldset.card legend {
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Remove default styling */
fieldset.minimal {
  border: none;
  padding: 0;
  margin: 0;
}

fieldset.minimal legend {
  padding: 0;
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

/* Disabled state */
fieldset:disabled {
  opacity: 0.6;
  pointer-events: none;
}

/* Stack form controls vertically */
fieldset label {
  display: block;
  margin-bottom: 0.75rem;
}

fieldset input[type="text"],
fieldset input[type="email"],
fieldset input[type="password"],
fieldset select {
  display: block;
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.25rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/* Radio/checkbox styling */
fieldset input[type="radio"],
fieldset input[type="checkbox"] {
  margin-right: 0.5rem;
}

/* Nested fieldset styling */
fieldset fieldset {
  margin-top: 1rem;
  background: white;
}

/* Focus styling */
fieldset:focus-within {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}
```

### Step 8: Add ARIA Attributes for Enhanced Accessibility

Enhance with ARIA when needed:

```html
<!-- Required group -->
<fieldset aria-required="true">
  <legend>Contact Information <span aria-hidden="true">*</span></legend>

  <label for="email">Email:</label>
  <input type="email" id="email" name="email" required>

  <label for="phone">Phone:</label>
  <input type="tel" id="phone" name="phone" required>
</fieldset>

<!-- Error state -->
<fieldset aria-invalid="true" aria-describedby="shipping-error">
  <legend>Shipping Method</legend>

  <label>
    <input type="radio" name="shipping" value="standard">
    Standard
  </label>

  <label>
    <input type="radio" name="shipping" value="express">
    Express
  </label>

  <p id="shipping-error" role="alert">
    Please select a shipping method
  </p>
</fieldset>

<!-- Descriptive text -->
<fieldset aria-describedby="password-requirements">
  <legend>Set Password</legend>

  <label for="new-password">Password:</label>
  <input type="password" id="new-password" name="password">

  <label for="confirm-password">Confirm Password:</label>
  <input type="password" id="confirm-password" name="confirm-password">

  <p id="password-requirements">
    Password must be at least 8 characters and include a number.
  </p>
</fieldset>
```

## Expected Output

- Form controls are visually and semantically grouped
- Screen readers announce legend when entering fieldset
- Radio buttons/checkboxes are contextually related
- Disabled attribute affects all nested controls
- Browser applies default border and styling (customizable with CSS)
- Improved form navigation for keyboard and screen reader users

## Code Examples by Framework

### React

```jsx
function ShippingForm() {
  const [billingEnabled, setBillingEnabled] = useState(false);

  return (
    <form>
      <fieldset>
        <legend>Shipping Address</legend>

        <label htmlFor="ship-street">Street:</label>
        <input type="text" id="ship-street" name="ship-street" />

        <label htmlFor="ship-city">City:</label>
        <input type="text" id="ship-city" name="ship-city" />

        <label htmlFor="ship-zip">ZIP:</label>
        <input type="text" id="ship-zip" name="ship-zip" />
      </fieldset>

      <fieldset>
        <legend>
          <label>
            <input
              type="checkbox"
              checked={billingEnabled}
              onChange={(e) => setBillingEnabled(e.target.checked)}
            />
            Use different billing address
          </label>
        </legend>
      </fieldset>

      <fieldset disabled={!billingEnabled}>
        <legend>Billing Address</legend>

        <label htmlFor="bill-street">Street:</label>
        <input type="text" id="bill-street" name="bill-street" />

        <label htmlFor="bill-city">City:</label>
        <input type="text" id="bill-city" name="bill-city" />

        <label htmlFor="bill-zip">ZIP:</label>
        <input type="text" id="bill-zip" name="bill-zip" />
      </fieldset>
    </form>
  );
}
```

### Svelte

```svelte
<script>
  let billingEnabled = $state(false);
</script>

<form>
  <fieldset>
    <legend>Shipping Address</legend>

    <label for="ship-street">Street:</label>
    <input type="text" id="ship-street" name="ship-street" />

    <label for="ship-city">City:</label>
    <input type="text" id="ship-city" name="ship-city" />

    <label for="ship-zip">ZIP:</label>
    <input type="text" id="ship-zip" name="ship-zip" />
  </fieldset>

  <fieldset>
    <legend>
      <label>
        <input type="checkbox" bind:checked={billingEnabled} />
        Use different billing address
      </label>
    </legend>
  </fieldset>

  <fieldset disabled={!billingEnabled}>
    <legend>Billing Address</legend>

    <label for="bill-street">Street:</label>
    <input type="text" id="bill-street" name="bill-street" />

    <label for="bill-city">City:</label>
    <input type="text" id="bill-city" name="bill-city" />

    <label for="bill-zip">ZIP:</label>
    <input type="text" id="bill-zip" name="bill-zip" />
  </fieldset>
</form>
```

### Vue

```vue
<template>
  <form>
    <fieldset>
      <legend>Shipping Address</legend>

      <label for="ship-street">Street:</label>
      <input type="text" id="ship-street" name="ship-street" />

      <label for="ship-city">City:</label>
      <input type="text" id="ship-city" name="ship-city" />

      <label for="ship-zip">ZIP:</label>
      <input type="text" id="ship-zip" name="ship-zip" />
    </fieldset>

    <fieldset>
      <legend>
        <label>
          <input type="checkbox" v-model="billingEnabled" />
          Use different billing address
        </label>
      </legend>
    </fieldset>

    <fieldset :disabled="!billingEnabled">
      <legend>Billing Address</legend>

      <label for="bill-street">Street:</label>
      <input type="text" id="bill-street" name="bill-street" />

      <label for="bill-city">City:</label>
      <input type="text" id="bill-city" name="bill-city" />

      <label for="bill-zip">ZIP:</label>
      <input type="text" id="bill-zip" name="bill-zip" />
    </fieldset>
  </form>
</template>

<script setup>
import { ref } from 'vue';

const billingEnabled = ref(false);
</script>
```

## Common Mistakes to Avoid

- **Not using `<fieldset>` for radio buttons**: Screen readers can't determine context
- **Multiple `<legend>` elements**: Only one legend per fieldset allowed
- **`<legend>` not as first child**: Must be the first element inside `<fieldset>`
- **Using `<div>` instead of `<fieldset>`**: Loses semantic meaning and accessibility
- **Not providing legend text**: Screen readers need descriptive label
- **Over-nesting fieldsets**: Can become confusing; limit depth to 2-3 levels
- **Removing all styling**: Some visual grouping helps all users

## When NOT to Use Fieldset

Avoid `<fieldset>` when:
- Grouping non-form elements (use `<section>` or `<div>`)
- Single form control (no grouping needed)
- Purely visual grouping without semantic relationship
- Layout purposes only (use CSS Grid/Flexbox instead)

## Browser Support

| Browser | `<fieldset>` | `<legend>` | `disabled` |
|---------|--------------|------------|------------|
| Chrome | ✅ All | ✅ All | ✅ All |
| Edge | ✅ All | ✅ All | ✅ All |
| Safari | ✅ All | ✅ All | ✅ All |
| Firefox | ✅ All | ✅ All | ✅ All |

Universal support across all browsers!

## Testing Checklist

- [ ] `<legend>` is first child of `<fieldset>`
- [ ] Screen reader announces legend when entering fieldset
- [ ] Radio button groups have descriptive legend
- [ ] Disabled fieldset grays out all nested controls
- [ ] Visual grouping is clear and helpful
- [ ] Nested fieldsets maintain hierarchy
- [ ] Legend text is descriptive and concise
- [ ] Keyboard navigation works through grouped controls
- [ ] ARIA attributes enhance (not replace) native semantics
- [ ] Forms are still usable without JavaScript

## Success Criteria

- Related form controls are properly grouped
- Screen readers announce group context (legend)
- Radio buttons are always in fieldsets
- Disabled state applies to all nested controls
- Visual design supports semantic structure
- WCAG 2.1 AA: 1.3.1 Info and Relationships (semantic grouping)
- WCAG 2.1 AA: 3.3.2 Labels or Instructions (clear legends)
- WCAG 2.1 AA: 4.1.2 Name, Role, Value (proper semantics)
