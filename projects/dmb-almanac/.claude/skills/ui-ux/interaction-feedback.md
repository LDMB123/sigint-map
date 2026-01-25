---
name: interaction-feedback
description: Instant visual feedback, loading states, skeleton screens, and error handling
version: 1.0.0
author: Claude Code
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Details matter. It's worth waiting to get it right." - Steve Jobs
---

# Interaction Feedback: Every Action Has a Reaction

Users need constant reassurance. Every interaction must be acknowledged immediately. The interface must never feel unresponsive, broken, or confused.

## Core Principles

### 1. Instant Visual Feedback (<100ms)

Human perception expects response within 100 milliseconds. Anything slower feels broken.

**Immediate Touch/Click Feedback:**
```css
/* :active state fires instantly on click */
.button {
  position: relative;
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 12px 24px;
  cursor: pointer;

  /* Transform for physical feedback */
  transform: translate3d(0, 0, 0); /* GPU layer */
}

.button:active {
  /* Instant visual change on :active */
  background: #f5f5f5;
  border-color: #ccc;
  transform: translate3d(0, 2px, 0) scale(0.98);
  /* User feels immediate response */
}

.button:hover {
  background: #f9f9f9;
}

/* Disabled state shows immediately */
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

**Touch Feedback JavaScript:**
```javascript
class InteractionFeedback {
  static setupButton(element) {
    element.addEventListener('pointerdown', (e) => {
      // Immediate visual response
      element.classList.add('is-active');
      this.triggerHaptic('light');
    });

    element.addEventListener('pointerup', () => {
      element.classList.remove('is-active');
    });

    element.addEventListener('pointercancel', () => {
      element.classList.remove('is-active');
    });
  }

  static triggerHaptic(type) {
    if (!navigator.vibrate) return;
    const patterns = { light: [10], medium: [20], heavy: [30] };
    navigator.vibrate(patterns[type] || patterns.medium);
  }
}

// Apply to all buttons
document.querySelectorAll('.button').forEach(btn => {
  InteractionFeedback.setupButton(btn);
});
```

### 2. Loading States That Inform

Never show a blank loading state. Tell users what's loading and why it matters.

**Progress Indication Patterns:**
```html
<!-- Instead of spinner, show what's happening -->
<div class="loading-state">
  <div class="spinner"></div>
  <p class="loading-message">Saving your work...</p>
  <p class="loading-detail">3 of 5 files uploaded</p>
</div>
```

```css
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e5e5;
  border-top-color: #0071E3;
  border-radius: 50%;

  /* Smooth continuous rotation */
  animation: spin 1s linear infinite;
  animation-fill-mode: forwards;

  /* Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    border-width: 0;
    border-top-width: 3px;
    background: linear-gradient(90deg, #e5e5e5 50%, transparent 50%);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-message {
  font-size: 16px;
  color: #1a1a1a;
  margin: 0;
}

.loading-detail {
  font-size: 13px;
  color: #666;
  margin: 0;
}

/* Indeterminate progress bar */
.progress-indeterminate {
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  overflow: hidden;
}

.progress-indeterminate::after {
  content: '';
  display: block;
  width: 30%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    #0071E3,
    transparent
  );

  animation: slide 1.5s infinite;
}

@keyframes slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

/* Determinate progress bar */
.progress-determinate {
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  overflow: hidden;
}

.progress-determinate::after {
  content: '';
  display: block;
  height: 100%;
  background: #0071E3;
  border-radius: 2px;
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
  /* Width set by JavaScript: width: 45%; */
}
```

**Upload Progress with Feedback:**
```javascript
class LoadingState {
  constructor(options = {}) {
    this.element = options.element;
    this.message = options.message || 'Loading...';
    this.progress = 0;
    this.init();
  }

  init() {
    this.render();
  }

  render() {
    this.element.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p class="loading-message">${this.message}</p>
        <p class="loading-detail">${this.progress}%</p>
        <div class="progress-determinate">
          <div class="progress-bar" style="width: ${this.progress}%"></div>
        </div>
      </div>
    `;
  }

  setProgress(percent) {
    this.progress = Math.min(percent, 100);
    this.element.querySelector('.loading-detail').textContent = `${this.progress}%`;
    this.element.querySelector('.progress-bar').style.width = `${this.progress}%`;
  }

  setMessage(message) {
    this.message = message;
    this.element.querySelector('.loading-message').textContent = message;
  }

  complete() {
    this.element.innerHTML = `
      <div class="success-state">
        <div class="success-icon">✓</div>
        <p class="success-message">Done!</p>
      </div>
    `;
  }
}
```

### 3. Skeleton Screens Over Spinners

Show the shape of content before it loads. Users feel faster UX.

**Skeleton Screen Pattern:**
```html
<!-- Before content loads -->
<div class="skeleton-card">
  <div class="skeleton skeleton-image"></div>
  <div class="skeleton skeleton-text"></div>
  <div class="skeleton skeleton-text"></div>
  <div class="skeleton skeleton-button"></div>
</div>

<!-- After content loads -->
<div class="card">
  <img src="image.jpg" alt="">
  <h3>Title</h3>
  <p>Description</p>
  <button>Action</button>
</div>
```

```css
/* Skeleton loading animation */
.skeleton {
  background: linear-gradient(
    90deg,
    #f5f5f5 25%,
    #e5e5e5 50%,
    #f5f5f5 75%
  );
  background-size: 200% 100%;

  animation: loading 1.5s infinite;
  border-radius: 4px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background: #f0f0f0;
  }
}

.skeleton-card {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
}

.skeleton-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  margin-bottom: 16px;
}

.skeleton-text {
  height: 12px;
  margin-bottom: 8px;

  /* Vary widths for realism */
  &:nth-child(2) { width: 100%; }
  &:nth-child(3) { width: 85%; }
}

.skeleton-button {
  height: 44px;
  margin-top: 16px;
  width: 100%;
}

/* Dark mode skeleton */
@media (prefers-color-scheme: dark) {
  .skeleton {
    background: linear-gradient(
      90deg,
      #2d2d2d 25%,
      #3a3a3a 50%,
      #2d2d2d 75%
    );
  }
}
```

**Swap Skeleton for Content:**
```javascript
class SkeletonLoader {
  constructor(skeletonSelector, contentSelector) {
    this.skeleton = document.querySelector(skeletonSelector);
    this.content = document.querySelector(contentSelector);
    this.content.style.display = 'none';
  }

  async load(fetchFn) {
    try {
      // Fetch data
      const data = await fetchFn();

      // Prepare content
      this.updateContent(data);

      // Fade transition
      await this.fade();

    } catch (error) {
      this.showError(error);
    }
  }

  async fade() {
    return new Promise(resolve => {
      // Fade out skeleton
      this.skeleton.style.opacity = '0';
      this.skeleton.style.pointerEvents = 'none';

      // Fade in content
      this.content.style.display = 'block';
      this.content.style.opacity = '0';

      setTimeout(() => {
        this.content.style.transition = 'opacity 300ms';
        this.content.style.opacity = '1';

        setTimeout(() => {
          this.skeleton.remove();
          resolve();
        }, 300);
      }, 0);
    });
  }

  updateContent(data) {
    // Update with actual data
    this.content.innerHTML = `<h3>${data.title}</h3>...`;
  }

  showError(error) {
    this.skeleton.innerHTML = `
      <div class="error-state">
        <p>Failed to load. <button>Retry</button></p>
      </div>
    `;
  }
}
```

### 4. Optimistic UI Updates

Assume success. Show changes immediately, roll back if needed.

**Optimistic Update Pattern:**
```javascript
class OptimisticUI {
  static async updateItem(item, field, newValue) {
    // Store original state for rollback
    const originalValue = item[field];

    // Update UI immediately
    this.updateUI(item, field, newValue);

    try {
      // Request to server
      await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue })
      });

      // Server confirmed, keep UI as-is
      console.log('Update successful');

    } catch (error) {
      // Server failed, rollback UI
      console.error('Update failed, rolling back...');
      this.updateUI(item, field, originalValue);

      // Show error notification
      this.showError(`Failed to update ${field}`);
    }
  }

  static updateUI(item, field, value) {
    item[field] = value;
    // Update DOM element
    const element = document.querySelector(`[data-item-id="${item.id}"]`);
    if (element) {
      element.querySelector(`[data-field="${field}"]`).textContent = value;
    }
  }

  static showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification notification-error';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }
}

// Usage
const todoItem = document.querySelector('.todo-item');
todoItem.addEventListener('click', async (e) => {
  const isComplete = e.target.checked;
  await OptimisticUI.updateItem(
    { id: todoItem.dataset.id, completed: isComplete },
    'completed',
    isComplete
  );
});
```

### 5. Error States That Guide

Errors should explain what happened and how to fix it.

**Error Message Pattern:**
```html
<!-- Bad: Cryptic error -->
<div class="error">Error 422: Invalid request</div>

<!-- Good: Clear guidance -->
<div class="error-state">
  <div class="error-icon">⚠</div>
  <h3 class="error-title">Email already registered</h3>
  <p class="error-message">This email is already associated with an account.</p>
  <div class="error-actions">
    <a href="/login">Sign in instead</a>
    <a href="/forgot-password">Forgot password?</a>
  </div>
</div>
```

```css
.error-state {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-icon {
  font-size: 24px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #991b1b;
}

.error-message {
  margin: 0;
  font-size: 14px;
  color: #7f1d1d;
}

.error-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.error-actions a {
  padding: 8px 16px;
  background: #f87171;
  color: white;
  border-radius: 4px;
  text-decoration: none;
  font-size: 14px;

  transition: background 150ms;
}

.error-actions a:hover {
  background: #dc2626;
}

/* Form field error */
.form-field.has-error input {
  border-color: #dc2626;
  background: #fef2f2;
}

.form-field.has-error .field-error {
  color: #991b1b;
  font-size: 12px;
  margin-top: 4px;
}

/* Dark mode errors */
@media (prefers-color-scheme: dark) {
  .error-state {
    background: #3f0f0f;
    border-color: #7f1d1d;
  }

  .error-title { color: #fca5a5; }
  .error-message { color: #dcfce7; }
}
```

**Form Validation with Feedback:**
```javascript
class FormValidator {
  constructor(formElement) {
    this.form = formElement;
    this.fields = this.form.querySelectorAll('input, textarea');
    this.init();
  }

  init() {
    this.fields.forEach(field => {
      field.addEventListener('blur', (e) => this.validateField(e.target));
      field.addEventListener('change', (e) => this.validateField(e.target));
    });

    this.form.addEventListener('submit', (e) => this.onSubmit(e));
  }

  validateField(field) {
    const error = this.getFieldError(field);

    if (error) {
      this.showFieldError(field, error);
    } else {
      this.clearFieldError(field);
    }
  }

  getFieldError(field) {
    if (field.type === 'email') {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
      if (!isValid) return 'Please enter a valid email address';
    }

    if (field.required && !field.value.trim()) {
      return `${field.placeholder || field.name} is required`;
    }

    if (field.minLength && field.value.length < field.minLength) {
      return `Must be at least ${field.minLength} characters`;
    }

    return null;
  }

  showFieldError(field, error) {
    const container = field.closest('.form-field');
    container.classList.add('has-error');

    let errorEl = container.querySelector('.field-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'field-error';
      container.appendChild(errorEl);
    }

    errorEl.textContent = error;
  }

  clearFieldError(field) {
    const container = field.closest('.form-field');
    container.classList.remove('has-error');

    const errorEl = container.querySelector('.field-error');
    if (errorEl) errorEl.remove();
  }

  async onSubmit(e) {
    e.preventDefault();

    // Validate all fields
    let hasErrors = false;
    this.fields.forEach(field => {
      if (this.getFieldError(field)) {
        this.showFieldError(field, this.getFieldError(field));
        hasErrors = true;
      }
    });

    if (hasErrors) return;

    // Submit form
    const button = this.form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Saving...';

    try {
      await fetch(this.form.action, {
        method: this.form.method,
        body: new FormData(this.form)
      });

      this.showSuccess('Form submitted successfully!');

    } catch (error) {
      this.showError('Failed to submit form');

    } finally {
      button.disabled = false;
      button.textContent = 'Submit';
    }
  }

  showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification notification-success';
    notification.innerHTML = `
      <div class="notification-icon">✓</div>
      <p>${message}</p>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }

  showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification notification-error';
    notification.innerHTML = `
      <div class="notification-icon">⚠</div>
      <p>${message}</p>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 5000);
  }
}
```

### 6. Success Confirmations That Delight

Success should feel good. Brief, celebratory, clear.

**Success Notification:**
```css
.notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 16px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;

  animation: slideInUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.notification-success {
  background: #f0fdf4;
  border: 1px solid #86efac;
  color: #166534;
}

.notification-error {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

.notification-icon {
  font-size: 20px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notification p {
  margin: 0;
  font-size: 14px;
}

@keyframes slideInUp {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .notification-success {
    background: #064e3b;
    border-color: #10b981;
    color: #d1fae5;
  }

  .notification-error {
    background: #3f0f0f;
    border-color: #7f1d1d;
    color: #fca5a5;
  }
}

@media (max-width: 640px) {
  .notification {
    bottom: 16px;
    right: 16px;
    left: 16px;
  }
}
```

### 7. :active State for Immediate Response

The :active pseudo-class is your friend. Use it liberally.

**Comprehensive :active Handling:**
```css
.interactive-element {
  position: relative;
  transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  -webkit-user-select: none;
}

.interactive-element:active {
  /* Immediate visual response on press */
  transform: translate3d(0, 1px, 0) scale(0.97);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* Button :active states */
.button:active {
  background: #e5e5e5;
  transform: scale(0.98);
  transition: none; /* Disable transition for immediate response */
}

/* Link :active states */
a:active {
  opacity: 0.7;
}

/* Checkbox :active state */
input[type="checkbox"]:active + label {
  transform: scale(1.05);
}

/* Custom interactive */
.custom-button:active {
  --brightness: 0.9;
  filter: brightness(var(--brightness));
}
```

## Interaction Feedback Checklist

- [ ] All interactive elements have :active states
- [ ] Feedback occurs within 100ms of interaction
- [ ] Loading states are informative, not blank spinners
- [ ] Skeleton screens used for content loading
- [ ] Optimistic UI updates used for immediate feedback
- [ ] Error messages are specific and actionable
- [ ] Success confirmations are brief and delightful
- [ ] Visual feedback uses transforms (not layout changes)
- [ ] Disabled states are clear and prevent interaction
- [ ] Haptic feedback works on capable devices

## Anti-Patterns to Avoid

```css
/* ❌ DO NOT: Slow or absent feedback */
.avoid {
  /* No visual change on click */
  transition: none;
}

/* ✓ DO: Immediate, smooth feedback */
.correct {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.correct:active {
  transform: scale(0.98);
}

/* ❌ DO NOT: Generic error messages */
.avoid {
  /* "Error: 500" - meaningless to user */
}

/* ✓ DO: Specific, actionable errors */
.correct {
  /* "Password must be at least 8 characters" */
}

/* ❌ DO NOT: Show spinner for everything */
.avoid {
  /* Plain spinning circle, no context */
}

/* ✓ DO: Context-specific loading states */
.correct {
  /* "Uploading 3 of 5 files..." */
}
```

---

**Remember:** Users crave feedback. Silence is the enemy of interface. Respond to every action, guide through every error, celebrate every success. Make the invisible visible.
