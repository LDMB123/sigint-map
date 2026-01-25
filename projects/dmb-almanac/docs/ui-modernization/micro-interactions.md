---
name: Micro-Interactions
description: CSS-only micro-interactions and feedback animations for Chromium 143+ without JavaScript
trigger: /micro-interactions
---

# Micro-Interactions with CSS-Only Animations

Chromium 143+ on Apple Silicon enables beautiful, responsive micro-interactions through pure CSS, eliminating the need for JavaScript animation libraries. These subtle feedback animations enhance user experience and perceive performance through GPU-accelerated effects.

## Hover State Animations

Create smooth hover feedback with GPU-accelerated transforms:

```css
/* Simple scale and lift effect */
.button-primary {
  padding: 12px 24px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.button-primary:hover {
  transform: translateY(-4px) scale(1.02);
}

.button-primary:active {
  transform: translateY(-2px) scale(0.98);
}

/* Card lift with shadow enhancement */
.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
}

/* Icon animation on hover */
.icon-button {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 300ms ease;
  background: rgba(0, 0, 0, 0.05);
}

.icon-button:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(1.1);
}

.icon-button svg {
  transition: transform 300ms ease;
}

.icon-button:hover svg {
  transform: rotate(180deg);
}
```

## Focus States for Accessibility

```css
/* Visible focus ring for keyboard navigation */
.interactive:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px #0066cc, 0 0 0 6px rgba(0, 102, 204, 0.2);
  transition: box-shadow 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.button:focus-visible {
  outline-offset: 4px;
  outline: 2px solid #0066cc;
}

/* Input focus animation */
input:focus-visible {
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

/* Link focus underline animation */
a:focus-visible {
  outline: none;
  text-decoration-thickness: 3px;
  text-underline-offset: 4px;
}
```

## Active Press Feedback

```css
/* Press animation for tactile feedback */
.button-press {
  padding: 12px 24px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.button-press:active {
  transform: scale(0.96);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Checkbox press feedback */
input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #0066cc;
}

/* Custom checkbox with animation */
.custom-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.custom-checkbox input {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  background: white;
}

.custom-checkbox input:hover {
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.custom-checkbox input:active {
  transform: scale(0.95);
}

.custom-checkbox input:checked {
  background: #0066cc;
  border-color: #0066cc;
  animation: checkmarkAppear 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes checkmarkAppear {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

## Loading Spinners with GPU

```css
/* Rotating spinner - GPU accelerated */
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotateZ(360deg); }
}

/* Pulsing spinner */
.spinner-pulse {
  width: 32px;
  height: 32px;
  border: 2px solid #0066cc;
  border-radius: 50%;
  animation: spinnerPulse 1.5s ease-in-out infinite;
}

@keyframes spinnerPulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.5;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Dots loading animation */
.dots-loader {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0066cc;
  animation: dotBounce 1.4s infinite ease-in-out;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
.dot:nth-child(3) { animation-delay: 0s; }

@keyframes dotBounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Gradient spinner */
.gradient-spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid;
  border-image: linear-gradient(45deg, #0066cc, #00d9ff, #0066cc) 1;
  animation: gradientSpin 2s linear infinite;
}

@keyframes gradientSpin {
  to { transform: rotateZ(360deg); }
}

/* Shimmer skeleton loader */
.skeleton {
  background: linear-gradient(
    90deg,
    #e0e0e0 0%,
    #f0f0f0 50%,
    #e0e0e0 100%
  );
  background-size: 200% 100%;
  animation: shimmerLoading 1.5s infinite;
}

@keyframes shimmerLoading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

## Checkbox and Toggle Animations

```css
/* Smooth toggle switch */
.toggle-switch {
  width: 48px;
  height: 28px;
  border-radius: 14px;
  background: #ccc;
  cursor: pointer;
  transition: background 300ms ease;
  position: relative;
  border: none;
  padding: 0;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: white;
  top: 2px;
  left: 2px;
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-switch:checked {
  background: #0066cc;
}

.toggle-switch:checked::after {
  left: 22px;
}

/* Radio button animation */
.radio-group {
  display: flex;
  gap: 20px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #ccc;
  border-radius: 50%;
  cursor: pointer;
  transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.radio-option input[type="radio"]:hover {
  border-color: #0066cc;
  box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.1);
}

.radio-option input[type="radio"]:checked {
  border-color: #0066cc;
  background: #0066cc;
  animation: radioPulse 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes radioPulse {
  0% {
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
```

## Button Ripple Effect (CSS Only)

```css
/* Ripple effect on button press */
.button-ripple {
  position: relative;
  overflow: hidden;
  padding: 12px 24px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.button-ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  opacity: 0;
  animation: ripple 600ms ease-out;
  pointer-events: none;
}

@keyframes ripple {
  to {
    width: 300px;
    height: 300px;
    opacity: 0;
  }
}

/* Multi-ripple effect */
.button-multi-ripple {
  position: relative;
  overflow: hidden;
  padding: 12px 24px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.button-multi-ripple:active::before,
.button-multi-ripple:active::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  animation: rippleWave 600ms ease-out;
}

.button-multi-ripple:active::before {
  width: 20px;
  height: 20px;
  animation-delay: 0;
}

.button-multi-ripple:active::after {
  width: 40px;
  height: 40px;
  animation-delay: 100ms;
}

@keyframes rippleWave {
  to {
    width: 300px;
    height: 300px;
    opacity: 0;
  }
}
```

## Form Input Animations

```css
/* Animated label that floats on focus */
.form-group {
  position: relative;
  margin-bottom: 24px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #ccc;
  border-radius: 6px;
  font-size: 16px;
  transition: all 300ms ease;
}

.form-input:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-label {
  position: absolute;
  top: 12px;
  left: 12px;
  font-size: 16px;
  color: #999;
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

.form-input:focus ~ .form-label,
.form-input:not(:placeholder-shown) ~ .form-label {
  top: -8px;
  left: 0;
  font-size: 12px;
  color: #0066cc;
  background: white;
  padding: 0 4px;
}

/* Input validation states */
.form-input.success {
  border-color: #22c55e;
}

.form-input.success:focus {
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
}

.form-input.error {
  border-color: #ef4444;
  animation: shake 300ms ease-in-out;
}

.form-input.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
```

## Tooltip and Menu Animations

```css
/* Smooth tooltip appearance */
.tooltip-trigger {
  position: relative;
  cursor: help;
}

.tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  margin-bottom: 4px;
}

.tooltip-trigger:hover .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(-16px);
}

/* Dropdown menu animation */
.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  opacity: 0;
  transform: translateY(-8px) scaleY(0.95);
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  transform-origin: top center;
  margin-top: 8px;
}

.dropdown:hover .dropdown-menu,
.dropdown:focus-within .dropdown-menu {
  opacity: 1;
  transform: translateY(0) scaleY(1);
  pointer-events: auto;
}

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 200ms ease;
}

.dropdown-item:hover {
  background: #f5f7fa;
  padding-left: 20px;
}
```

## Notification Animations

```css
/* Toast notification entrance */
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideInRight 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast.exit {
  animation: slideOutRight 300ms cubic-bezier(0.4, 0, 1, 1);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOutRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* Success/error notification indicators */
.toast.success {
  border-left: 4px solid #22c55e;
}

.toast.error {
  border-left: 4px solid #ef4444;
}

.toast.info {
  border-left: 4px solid #3b82f6;
}
```

## Accessibility for Micro-Interactions

```css
/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* High contrast mode adjustments */
@media (prefers-contrast: more) {
  .button:focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 2px;
  }

  .card:hover {
    border: 2px solid currentColor;
  }
}
```

## Performance Optimization

- Use GPU properties: `transform`, `opacity`, `filter`
- Keep animations under 400ms for micro-interactions
- Use `cubic-bezier(0.34, 1.56, 0.64, 1)` for smooth easing
- Test all animations on M-series Apple Silicon
- Profile in Chrome DevTools Performance tab
- Ensure 60fps minimum on standard displays, 120fps on ProMotion
