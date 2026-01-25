# HTML5 API Skills

Comprehensive skills for modern HTML5 features, semantic elements, and web platform APIs.

## Skills Overview

### Form & Interactive Elements

- **[fieldset-legend.md](./fieldset-legend.md)** - Grouping form controls with `<fieldset>` and `<legend>` for accessibility
- **[output-meter-progress.md](./output-meter-progress.md)** - Using `<output>`, `<meter>`, and `<progress>` elements for calculated values and indicators

### Performance Optimization

- **[lazy-loading.md](./lazy-loading.md)** - Native lazy loading with `loading="lazy"`, `fetchpriority`, and `decoding` attributes
- **[inert-attribute.md](./inert-attribute.md)** - Using `inert` attribute to disable interactive content during modals and loading states

### Web Components

- **[template-slot.md](./template-slot.md)** - Creating reusable components with `<template>`, `<slot>`, Shadow DOM, and custom elements

## When to Use These Skills

### Form Development
Use **fieldset-legend** when:
- Grouping radio buttons or checkboxes
- Creating multi-section forms
- Disabling entire form sections

Use **output-meter-progress** when:
- Displaying live calculation results
- Showing values in a known range (disk usage, scores)
- Indicating task progress (uploads, loading)

### Performance Optimization
Use **lazy-loading** when:
- Page has many images or iframes
- Optimizing Core Web Vitals (LCP, CLS)
- Reducing initial page load time

Use **inert-attribute** when:
- Showing modal dialogs or overlays
- Disabling UI during loading states
- Preventing keyboard access to hidden content

### Component Development
Use **template-slot** when:
- Building reusable UI components
- Creating framework-agnostic widgets
- Implementing design system components

## Quick Reference

### Lazy Loading Images
```html
<!-- Hero image: load immediately -->
<img src="hero.jpg" loading="eager" fetchpriority="high" width="1920" height="1080">

<!-- Below-fold: lazy load -->
<img src="photo.jpg" loading="lazy" width="800" height="600">
```

### Inert Attribute
```html
<!-- Disable background during modal -->
<main inert>
  <button>Cannot be focused</button>
</main>

<dialog open>
  <p>Modal content</p>
</dialog>
```

### Template & Slot
```html
<template id="card">
  <div class="card">
    <slot name="header"></slot>
    <slot></slot>
  </div>
</template>
```

### Fieldset Grouping
```html
<fieldset>
  <legend>Choose shipping:</legend>
  <label><input type="radio" name="ship" value="standard"> Standard</label>
  <label><input type="radio" name="ship" value="express"> Express</label>
</fieldset>
```

### Output, Meter, Progress
```html
<!-- Output: calculation result -->
<output for="quantity price">$29.99</output>

<!-- Meter: value in range -->
<meter value="75" min="0" max="100" low="20" high="80">75%</meter>

<!-- Progress: task completion -->
<progress value="45" max="100">45%</progress>
```

## Browser Support Summary

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Lazy loading | 77+ | 79+ | 15.4+ | 75+ |
| Inert | 102+ | 102+ | 15.5+ | 112+ |
| Template/Slot | 35+ | 79+ | 10+ | 63+ |
| Fieldset/Legend | ✅ All | ✅ All | ✅ All | ✅ All |
| Output/Meter/Progress | 8+ | 10+ | 6+ | 16+ |

## Accessibility Considerations

All skills include:
- Proper ARIA attributes
- Screen reader testing guidelines
- Keyboard navigation support
- WCAG 2.1 AA compliance
- Semantic HTML best practices

## Related Skills

- **[/accessibility/](../accessibility/)** - Focus management, keyboard navigation, ARIA
- **[/performance/](../performance/)** - Core Web Vitals, LCP, CLS optimization
- **[/pwa/](../pwa/)** - Progressive Web Apps, offline capabilities

## Contributing

When adding new HTML skills:
1. Follow the standard skill format with YAML frontmatter
2. Include "When to Use" section
3. Provide framework examples (React, Svelte, Vue)
4. Add accessibility testing checklist
5. Include browser support table
6. Document common mistakes to avoid

## Testing Tools

- **Chrome DevTools**: Inspect Shadow DOM, check lazy loading
- **Lighthouse**: Performance and accessibility audits
- **NVDA/JAWS**: Screen reader testing
- **axe DevTools**: Accessibility validation
- **Browser Compatibility**: Can I Use (caniuse.com)
