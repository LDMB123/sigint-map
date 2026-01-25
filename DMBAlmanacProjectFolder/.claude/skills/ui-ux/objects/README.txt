# UI/UX Objects: Steve Jobs-Obsessive Visual Craftsmanship

Six comprehensive skills covering atomic visual building blocks with Steve Jobs-level obsession for detail. Every pixel, every spacing value, every component state matters.

## Overview

These skills represent the foundational layer of high-fidelity UI design. Each skill focuses on a core visual element that appears throughout every interface, demanding pixel-perfect execution and systematic thinking.

**Common Philosophy**: Visual design is not decoration—it is communication. Every design decision must serve function and clarity. Consistency across these objects creates a unified, professional interface.

---

## Skills

### 1. Icon Perfection (`icon-perfection.md`)
**Every pixel matters in these microscopic communication tools.**

Master SVG iconography with obsessive attention to:
- Proper viewBox and scalable dimensions
- currentColor for seamless theming
- Consistent stroke width across icon sets
- Optical alignment (mathematical centering ≠ visual centering)
- Standardized sizing scale (16, 20, 24, 32, 48px)
- Accessibility with aria-label and role attributes
- Meaningful icon animation without decoration

**Key Checklist**: ViewBox, sizing scale, currentColor, stroke consistency, optical alignment, accessibility, no blurriness.

---

### 2. Button Craft (`button-craft.md`)
**The most clicked element deserves obsessive design attention.**

Create interaction-perfect buttons with:
- Four-tier visual hierarchy (primary, secondary, tertiary, ghost)
- Minimum 44x44px touch targets for accessibility
- Horizontal padding > vertical padding ratio discipline
- Consistent border radius throughout system
- Keyboard focus states with :focus-visible
- Loading states with disabled interaction
- Icon-text alignment precision
- All component states explicitly designed

**Key Checklist**: Touch target, padding ratios, focus states, loading disabled, all states covered, no ambiguous buttons.

---

### 3. Input Excellence (`input-excellence.md`)
**Forms are conversations. Make every interaction clear.**

Guide users through form interactions with:
- Properly associated labels (not placeholder-only)
- Placeholder as hint, label as requirement
- High-contrast focus rings for keyboard navigation
- Inline error messages connected via aria-describedby
- Success state feedback
- Comfortable input sizing (44px minimum height)
- :-webkit-autofill styling for browser integration
- field-sizing: content for modern browsers

**Key Checklist**: Labels associated, no placeholder-only, 16px font on mobile, focus visible, inline errors, aria-invalid, success feedback.

---

### 4. Card Architecture (`card-architecture.md`)
**Content containers with intentional internal and external structure.**

Architect cards as consistent building blocks:
- Uniform padding from design system scale
- Shadow hierarchy with elevation system
- Consistent border radius
- Image aspect-ratio containers preventing layout shift
- Clear content hierarchy within cards
- Interactive vs static card distinction
- Responsive grid layouts with CSS Grid
- Hover states for clickable cards

**Key Checklist**: Consistent padding, shadow hierarchy, aspect ratios, responsive grid, hover states, no content overflow, all variants tested.

---

### 5. Image Presentation (`image-presentation.md`)
**Visual content deserves optimization and responsive delivery.**

Deliver images with pixel-perfect efficiency:
- Responsive srcset and sizes for device adaptation
- Lazy loading for below-fold images
- aspect-ratio property preventing layout shift
- object-fit and object-position for precise display
- LQIP (low-quality image placeholders) for perceived speed
- Art direction with <picture> element
- WebP/AVIF with JPEG fallback support
- Meaningful alt text and decorative image handling

**Key Checklist**: Responsive srcset, lazy loading, aspect-ratio, object-fit, no CLS, modern formats with fallback, alt text, all breakpoints tested.

---

### 6. Divider and Spacing (`divider-spacing.md`)
**Whitespace is positive space. Master negative space before adding elements.**

Orchestrate breathing room and section separation:
- Consistent spacing scale (4, 8, 12, 16, 24, 32, 48, 64px)
- Spacing as primary separator, dividers supplementary
- Horizontal rules with intentional styling
- Section separation patterns with visual rhythm
- Whitespace as design element for emphasis
- CSS gap property for flex/grid consistency
- Responsive spacing at different breakpoints
- Never arbitrary spacing values

**Key Checklist**: Spacing scale consistency, spacing > dividers, responsive scaling, gap usage, no cramped layouts, whitespace purpose clear.

---

## How to Use These Skills

### As a Design System Reference
Reference these skills when establishing design system components. Each provides comprehensive guidance on all states and variations.

### During Visual Design
Follow these skills when designing high-fidelity mockups. Use the specifications, spacing scales, and component states as your foundation.

### During Code Review
Use these skills to evaluate implementation fidelity. Check that components match the specifications, spacing, colors, and states defined.

### During Handoff
Provide these skills to developers as implementation specifications. Include the code examples and CSS patterns directly.

## Steve Jobs Philosophy

These skills embody key principles from Steve Jobs' design philosophy:

1. **Obsessive Attention to Detail**: Every pixel, every spacing value, every state matters
2. **Simplicity Through Reduction**: Remove decoration, keep function
3. **Systematic Thinking**: Use scales and systems, never arbitrary values
4. **Consistency as Clarity**: Repeated patterns create confidence
5. **Form Follows Function**: Visual design should communicate, not confuse
6. **Refinement Over Decoration**: Subtle, purposeful design beats flashy visuals
7. **Intentionality**: Every decision serves a reason

## Browser and Platform Support

**All Skills Target:**
- Chromium 143+
- Safari 18.2+
- Firefox 133+
- macOS 26.2+
- iOS 18.2+
- Android 15+
- Apple Silicon optimized

Modern browser features used throughout:
- CSS aspect-ratio for image containers
- field-sizing: content for form inputs
- :focus-visible for keyboard navigation
- CSS custom properties for theming
- CSS Grid and Flexbox layouts

## Quick Integration Checklist

When implementing these skills:

- [ ] Read all 6 skills to understand the complete system
- [ ] Extract color and spacing tokens into design system
- [ ] Create CSS utility classes for consistent spacing
- [ ] Build component library following each skill's specifications
- [ ] Test all component states (default, hover, active, disabled, error, loading)
- [ ] Verify accessibility (contrast, focus, keyboard navigation)
- [ ] Validate responsive behavior at all breakpoints
- [ ] Ensure Apple Silicon performance optimization
- [ ] Document deviations from system with justification
- [ ] Maintain this consistency across entire product

## Common Pitfalls to Avoid

### Icon Perfection
- Using icon fonts instead of SVG
- Blurry icons from improper scaling
- Inconsistent stroke widths
- No focus on optical alignment
- Missing accessibility attributes

### Button Craft
- Touch targets smaller than 44x44px
- No visible focus states
- Loading state doesn't disable button
- Inconsistent border radius
- Ambiguous button labels

### Input Excellence
- Placeholder-only labels (no visible label)
- No focus ring on inputs
- Generic error messages ("Invalid input")
- Font size < 16px on mobile
- Missing aria-describedby for errors

### Card Architecture
- Inconsistent padding between cards
- Images breaking aspect ratio
- No hover states for interactive cards
- Mixed shadow elevations
- Content overflow without truncation

### Image Presentation
- Same image size for all devices
- No lazy loading for off-screen images
- Layout shift from missing aspect-ratio
- Modern formats without JPEG fallback
- Missing alt text or decorative indication

### Divider and Spacing
- Arbitrary spacing values (not on scale)
- Cramped layout with no whitespace
- Inconsistent divider application
- Using margin for flex/grid spacing
- Overusing dividers as visual crutch

## Evolution and Updates

These skills represent current best practices as of January 2026:
- Chromium 143+ features included
- Apple Silicon optimization considered
- Modern CSS (aspect-ratio, gap, field-sizing) as standard
- Performance prioritized (lazy loading, format optimization)
- Accessibility as requirement (WCAG AA+)

As browser support evolves and new CSS features emerge, these skills should be updated to incorporate improvements while maintaining system consistency.

---

## References and Further Learning

Each skill includes comprehensive references. Key resources:
- [MDN Web Docs](https://developer.mozilla.org/) - Complete web standards reference
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility standards
- [Apple Human Interface Guidelines](https://developer.apple.com/design/) - Platform best practices
- [Material Design System](https://m3.material.io/) - Design system reference
- [Web.dev](https://web.dev/) - Performance and best practices

---

## Questions or Refinements?

These skills are comprehensive but not exhaustive. Adapt them to your specific product needs while maintaining the core principles:
- Systematic thinking (no arbitrary values)
- Consistent patterns (repetition builds confidence)
- Accessibility first (inclusive design benefits everyone)
- Performance conscious (fast delivery improves UX)
- Detail-oriented (precision communicates quality)

Remember: Design consistency is not boring—it's the foundation for sophisticated, professional interfaces.
