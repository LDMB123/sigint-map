---
name: simplicity-audit
description: Ruthless elimination of complexity - one primary action per screen
version: 1.0.0
author: Claude Code
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Simplicity is the ultimate sophistication. It takes a lot of hard work to make something simple." - Steve Jobs
---

# Simplicity Audit: Ruthless Elimination

The most important feature is the one you don't build. Every element must earn its place through contribution to the user's goal. When in doubt, delete it.

## Core Principle: The One Primary Action Rule

Every screen should have exactly one primary action. Not two, not three. One.

**Visual Hierarchy Enforcement:**

```css
/* One primary action per screen - make it unmistakable */

/* Primary action: demands attention */
.button-primary {
  background: color(display-p3 0 0.388 0.898);
  color: white;
  font-weight: 600;
  padding: 12px 32px;
  min-width: 200px;

  border: none;
  border-radius: 8px;
  font-size: 16px;

  /* Cursor signals importance */
  cursor: pointer;

  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);

  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.button-primary:hover {
  background: color-mix(in display-p3, color(display-p3 0 0.388 0.898), white 10%);
  box-shadow: 0 8px 24px rgba(0, 113, 227, 0.4);
}

.button-primary:active {
  transform: scale(0.98);
}

/* Secondary action: subordinate, lower visual weight */
.button-secondary {
  background: transparent;
  color: #0071E3;
  border: 1px solid #ccc;
  padding: 10px 20px;
  font-weight: 400;

  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;

  transition: all 150ms;
}

.button-secondary:hover {
  background: #f5f5f5;
  border-color: #999;
}

/* Tertiary action: minimal, text-only */
.button-tertiary {
  background: none;
  border: none;
  color: #666;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;

  transition: color 150ms;
}

.button-tertiary:hover {
  color: #0071E3;
}

/* Layout: Primary action is visually dominant */
.action-group {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
}

/* Primary button larger and on the right */
.action-group .button-primary {
  order: 2;
  flex-grow: 0;
}

/* Secondary buttons smaller and left-aligned */
.action-group .button-secondary {
  order: 1;
}

.action-group .button-tertiary {
  order: 0;
}
```

**Example: Modal with One Primary Action**
```html
<!-- Simple modal dialog with clear hierarchy -->
<div class="modal">
  <div class="modal-content">
    <h2 class="modal-title">Delete this item?</h2>
    <p class="modal-message">This action cannot be undone.</p>

    <div class="modal-actions">
      <!-- Primary action: Delete (destructive but primary) -->
      <button class="button-primary button-destructive">
        Delete
      </button>

      <!-- Secondary action: Cancel -->
      <button class="button-secondary" data-dismiss="modal">
        Cancel
      </button>
    </div>
  </div>
</div>
```

```css
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.modal-message {
  margin: 0 0 24px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 12px;
  flex-direction: row-reverse;
}

.button-destructive {
  background: #ef4444;
  color: white;
}

.button-destructive:hover {
  background: #dc2626;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .modal-content {
    background: #1a1a1a;
  }

  .modal-title { color: white; }
  .modal-message { color: #999; }

  .button-secondary {
    border-color: #333;
    color: #0071E3;
  }

  .button-secondary:hover {
    background: #2d2d2d;
  }
}
```

## Progressive Disclosure

Hide complexity until it's needed.

**Progressive Disclosure Pattern:**

```html
<!-- Basic view: Essential information only -->
<div class="card">
  <div class="card-header">
    <h3>Account Settings</h3>
  </div>

  <div class="card-content">
    <div class="setting">
      <label>Email</label>
      <input type="email" value="user@example.com" disabled>
    </div>

    <!-- Show advanced options only on demand -->
    <button class="button-tertiary" data-toggle="advanced">
      Show advanced options ↓
    </button>

    <!-- Hidden by default -->
    <div class="advanced-options" hidden>
      <div class="setting">
        <label>API Key</label>
        <input type="text" value="sk_live_..." disabled>
      </div>

      <div class="setting">
        <label>Webhook URL</label>
        <input type="text" placeholder="https://example.com/webhook">
      </div>
    </div>
  </div>
</div>
```

```css
/* Hide advanced options by default */
.advanced-options {
  display: none;
  border-top: 1px solid #e5e5e5;
  padding-top: 16px;
  margin-top: 16px;
}

.advanced-options[aria-expanded="true"] {
  display: block;
  animation: expandDown 300ms ease-out;
}

@keyframes expandDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Rotate toggle icon when expanded */
[data-toggle="advanced"][aria-expanded="true"]::after {
  transform: rotate(180deg);
  content: ' ↑';
}
```

**JavaScript for Progressive Disclosure:**
```javascript
class ProgressiveDisclosure {
  constructor() {
    this.toggles = document.querySelectorAll('[data-toggle]');
    this.init();
  }

  init() {
    this.toggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.onToggle(e));
    });
  }

  onToggle(e) {
    const toggle = e.target;
    const targetId = toggle.dataset.toggle;
    const target = document.querySelector(`.${targetId}`);

    if (!target) return;

    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
    const newState = !isExpanded;

    toggle.setAttribute('aria-expanded', newState);
    target.setAttribute('aria-expanded', newState);

    if (newState) {
      target.style.display = 'block';
      toggle.textContent = 'Hide advanced options ↑';
    } else {
      target.style.display = 'none';
      toggle.textContent = 'Show advanced options ↓';
    }
  }
}

new ProgressiveDisclosure();
```

## Feature Audit Checklist

Before adding any feature, answer these questions:

**The 5 Questions:**

1. **Does this serve the primary goal?**
   - User goal: Complete task X
   - Feature: Does it enable or enhance task X?
   - If no → Delete it

2. **Is this used by more than 20% of users?**
   - Feature: Advanced export options
   - Usage: Only 5% of users export
   - If no → Move to progressive disclosure or remove

3. **Can this be done simpler?**
   - Feature: Multi-step form with 10 fields
   - Simpler: 3 required fields, 7 optional collapsed
   - If yes → Simplify before shipping

4. **Does this add visual clarity or cognitive load?**
   - Feature: Color-coded tags
   - Adds: Quick visual scanning
   - Removes: Nothing
   - Keep it

5. **What breaks if we remove this?**
   - Feature: "Save draft" button
   - Breaks: Users lose work
   - Keep it

**Feature Audit Template:**
```javascript
// Feature evaluation checklist
const featureAudit = {
  featureName: "Advanced search filters",
  primary_goal: "Help users find content",
  serves_goal: true,
  user_percentage: 0.15, // 15% of users
  simpler_approach: "Use faceted search instead of filters",
  visual_impact: "Adds 200px of filter panel",
  users_affected: 150000,
  removal_consequence: "Some users lose advanced search"
};

function evaluateFeature(audit) {
  const checks = [
    audit.serves_goal,
    audit.user_percentage > 0.2,
    !audit.simpler_approach,
    audit.visual_impact < 300,
  ];

  const pass = checks.filter(c => c).length;

  return {
    keep: pass >= 3,
    recommendation: pass >= 3 ? 'Keep' : 'Reconsider',
    score: `${pass}/4`
  };
}
```

## Complexity Reduction Strategies

### 1. Remove Before Adding

For every new feature, remove one existing one.

```css
/* BEFORE: Too many variations */
.button {
  /* 12 different classes for different states */
}

.button-small { font-size: 12px; }
.button-medium { font-size: 14px; }
.button-large { font-size: 16px; }
.button-primary { background: blue; }
.button-secondary { background: gray; }
.button-tertiary { background: white; }
.button-outlined { border: 1px solid; }
.button-rounded { border-radius: 20px; }
.button-full-width { width: 100%; }
.button-disabled { opacity: 0.5; }
.button-loading { /* complex animation */ }

/* AFTER: Flexible but simple */
.button {
  /* Base styles */
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 200ms;

  /* Size via modifier: data attribute or BEM */
  font-size: 14px; /* Default medium */
}

.button[size="small"] { font-size: 12px; padding: 8px 16px; }
.button[size="large"] { font-size: 16px; padding: 16px 32px; }

.button[variant="primary"] { background: #0071E3; color: white; }
.button[variant="secondary"] { background: #f5f5f5; color: #1a1a1a; }
.button[variant="tertiary"] { background: none; color: #0071E3; border: 1px solid #ccc; }

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.button.is-loading {
  pointer-events: none;
  opacity: 0.7;
}
```

### 2. One Primary Action Per Screen

```javascript
// Audit page actions
class ActionAudit {
  static auditPage() {
    const buttons = document.querySelectorAll('button, a[role="button"]');

    // Classify by visual prominence
    const analysis = {
      primary: 0,      // Large, colored, prominent
      secondary: 0,    // Medium, gray, normal
      tertiary: 0,     // Small, text-only, minimal
      total: buttons.length
    };

    buttons.forEach(btn => {
      const computed = window.getComputedStyle(btn);
      const fontSize = parseFloat(computed.fontSize);
      const fontWeight = parseFloat(computed.fontWeight);
      const bgColor = computed.backgroundColor;

      // Heuristic classification
      if (fontSize >= 16 && fontWeight >= 600) {
        analysis.primary++;
      } else if (bgColor !== 'rgba(0, 0, 0, 0)') {
        analysis.secondary++;
      } else {
        analysis.tertiary++;
      }
    });

    console.log('Action Audit:', analysis);

    // Warning: Too many primary actions
    if (analysis.primary > 1) {
      console.warn(
        `⚠ Warning: ${analysis.primary} primary actions found. ` +
        `Consider reducing to 1 primary action per screen.`
      );
    }

    return analysis;
  }
}

ActionAudit.auditPage();
```

### 3. Remove Decorative Elements

```css
/* ❌ BEFORE: Decoration without purpose */
.card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;

  /* Pointless shadow */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  /* Decorative background gradient that adds nothing */
  background: linear-gradient(135deg, #fff 0%, #f9f9f9 100%);

  /* Decorative icon that's never used */
  ::before {
    content: '✦';
    position: absolute;
    top: 8px;
    right: 8px;
    color: #ddd;
  }
}

/* ✓ AFTER: Minimal, purposeful */
.card {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 16px;
  /* Shadow serves purpose: elevation/depth */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* If gradient is needed, it serves a purpose */
.card--featured {
  border: 2px solid #0071E3;
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.2);
}
```

### 4. No Options, Just Smart Defaults

```css
/* ❌ BEFORE: Bloated with options */
<div class="notification">
  <div class="notification-icon"></div>
  <div class="notification-content">
    <p class="notification-title"></p>
    <p class="notification-message"></p>
  </div>
  <button class="notification-close"></button>
  <div class="notification-progress"></div>
</div>

/* ✓ AFTER: Sensible defaults, minimal markup */
<div role="status" class="notification">
  <p></p>
</div>
```

```javascript
// Smart notifications - options? No, just smart defaults
class Notification {
  static success(message, duration = 3000) {
    this.show(message, 'success', duration);
  }

  static error(message, duration = 5000) {
    // Errors stay longer than successes
    this.show(message, 'error', duration);
  }

  static info(message, duration = 3000) {
    this.show(message, 'info', duration);
  }

  static show(message, type, duration) {
    const notification = document.createElement('div');
    notification.role = 'status';
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-dismiss
    setTimeout(() => notification.remove(), duration);
  }
}

// Usage: No options, just call the right method
Notification.success('Item saved');
Notification.error('Failed to save. Please try again.');
```

## Simplicity Audit Template

```javascript
// Complete simplicity audit for a feature
class SimplicityAudit {
  static audit(feature) {
    return {
      // 1. Does it serve the goal?
      serves_primary_goal: this.checkPrimaryGoal(feature),

      // 2. Can it be simpler?
      has_simpler_alternative: this.findSimpler(feature),

      // 3. Is it visual noise?
      visual_noise_score: this.measureVisualNoise(feature),

      // 4. Is it confusing?
      cognitive_load: this.measureCognitiveLo(feature),

      // 5. Is it used?
      estimated_usage: this.estimateUsage(feature),

      // Recommendation
      recommendation: this.recommend(feature)
    };
  }

  static checkPrimaryGoal(feature) {
    // Does this feature directly serve the primary user goal?
    return true; // Or false
  }

  static findSimpler(feature) {
    // Is there a simpler way to achieve the same goal?
    return null; // Or "Use X instead"
  }

  static measureVisualNoise(feature) {
    // How much visual space does this take?
    // 0: Not noticeable, 100: Takes up entire screen
    return 15; // Example: 15% of screen
  }

  static measureCognitiveLoad(feature) {
    // How hard is it to understand?
    // 0: Obvious, 100: Requires manual
    return 5; // Example: Very intuitive
  }

  static estimateUsage(feature) {
    // What percentage of users use this?
    return 0.65; // 65% of users
  }

  static recommend(feature) {
    const audit = this.audit(feature);

    if (!audit.serves_primary_goal) return 'DELETE';
    if (audit.estimated_usage < 0.2) return 'MOVE TO ADVANCED';
    if (audit.has_simpler_alternative) return 'SIMPLIFY';
    if (audit.visual_noise_score > 40) return 'REDUCE VISUAL FOOTPRINT';
    if (audit.cognitive_load > 50) return 'IMPROVE CLARITY';

    return 'KEEP';
  }
}
```

## The Simplicity Checklist

Before shipping any feature, ask:

- [ ] Is there exactly one primary action visible on this screen?
- [ ] Can I describe this feature in one sentence?
- [ ] Have I removed something to make room for this?
- [ ] Does every element serve the user's goal?
- [ ] Is the visual design minimal but complete?
- [ ] Would a new user understand this without instructions?
- [ ] Are there any decorative elements without purpose?
- [ ] Have I used progressive disclosure for advanced options?
- [ ] Are default behaviors smart and sensible?
- [ ] Could we achieve the same goal with less?

## Anti-Patterns to Avoid

```css
/* ❌ DO NOT: Feature creep */
.avoid {
  /* Every screen has 10+ buttons */
  /* User doesn't know where to start */
}

/* ✓ DO: One primary action */
.correct {
  /* One prominent button */
  /* Others are secondary/tertiary */
}

/* ❌ DO NOT: Expose all options immediately */
.avoid {
  /* Settings page with 50 toggles */
  /* Overwhelming and confusing */
}

/* ✓ DO: Progressive disclosure */
.correct {
  /* Common settings visible */
  /* Advanced hidden behind toggle */
}

/* ❌ DO NOT: Decorative elements */
.avoid {
  ::before { content: '★'; }
  /* Adds nothing, distracts from content */
}

/* ✓ DO: Every element earns its place */
.correct {
  /* Only necessary elements */
  /* Each serves the interface */
}
```

---

**Remember:** Every feature you ship is a commitment to maintain forever. Simplicity is not emptiness - it's the removal of everything except what matters. Before you ask "What should we add?" ask "What should we remove?"

The most powerful feature is the one users don't need to think about. Make your interfaces so simple they're invisible.
