---
skill_id: ui-ux-interest-invokers
skill_name: "Hover-Triggered UI with Interest Invokers (Chrome 143+)"
description: "Master hover-triggered interfaces using interesttarget attribute in Chromium 143+"
category: "UI/UX Interactions"
target_platform: "Chromium 143+ on Apple Silicon"
version: "1.0"
created_date: 2026-01-21
difficulty: "intermediate"
estimated_time_minutes: 26
---

# Hover-Triggered UI with Interest Invokers for Chromium 143+

The interest invoker system in Chromium 143+ enables hover-triggered interactions without JavaScript. This skill covers interesttarget attribute, hover popovers, tooltip activation, and preview cards.

## Basic Hover Popover

Trigger popovers on hover with interesttarget attribute.

```html
<div class="hover-demo">
  <button interesttarget="hover-popover">Hover over me</button>

  <div popover="auto" id="hover-popover">
    <h3>Tooltip Content</h3>
    <p>This appears on hover, no JavaScript needed</p>
  </div>
</div>

<style>
  .hover-demo {
    padding: 40px;
    display: flex;
    justify-content: center;
  }

  button {
    padding: 12px 24px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
  }

  button:hover {
    background: #1976D2;
  }

  [popover] {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    background: white;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    width: 250px;
  }

  [popover]:popover-open {
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
```

## Tooltip System with Interest Invokers

Create a comprehensive tooltip system with hover activation.

```html
<div class="tooltip-grid">
  <div class="card" interesttarget="tooltip-1">
    <h3>Card 1</h3>
    <p>Basic content</p>
  </div>

  <div class="card" interesttarget="tooltip-2">
    <h3>Card 2</h3>
    <p>Hover for details</p>
  </div>

  <div class="card" interesttarget="tooltip-3">
    <h3>Card 3</h3>
    <p>More information available</p>
  </div>
</div>

<div popover="auto" id="tooltip-1" class="tooltip">
  <strong>Card 1 Details</strong>
  <p>Extended information about Card 1</p>
</div>

<div popover="auto" id="tooltip-2" class="tooltip">
  <strong>Card 2 Details</strong>
  <p>Extended information about Card 2</p>
</div>

<div popover="auto" id="tooltip-3" class="tooltip">
  <strong>Card 3 Details</strong>
  <p>Extended information about Card 3</p>
</div>

<style>
  .tooltip-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    padding: 20px;
  }

  .card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    background: #f9f9f9;
    cursor: pointer;
    transition: all 0.2s;
  }

  .card:hover {
    border-color: #2196F3;
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.1);
    background: white;
  }

  .card h3 {
    margin: 0 0 8px 0;
    color: #333;
    font-size: 16px;
  }

  .card p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }

  .tooltip {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    min-width: 200px;
    font-size: 14px;
  }

  .tooltip strong {
    display: block;
    margin-bottom: 8px;
    color: #333;
  }

  .tooltip p {
    margin: 0;
    color: #666;
  }

  .tooltip:popover-open {
    animation: tooltipSlide 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes tooltipSlide {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
```

## Preview Cards on Hover

Show detailed preview cards when hovering over list items.

```html
<div class="preview-list">
  <ul class="items">
    <li interesttarget="preview-item-1">
      <div class="item-title">Document A</div>
      <div class="item-meta">Updated 2 hours ago</div>
    </li>
    <li interesttarget="preview-item-2">
      <div class="item-title">Document B</div>
      <div class="item-meta">Updated 1 day ago</div>
    </li>
    <li interesttarget="preview-item-3">
      <div class="item-title">Document C</div>
      <div class="item-meta">Updated 1 week ago</div>
    </li>
  </ul>
</div>

<div popover="auto" id="preview-item-1" class="preview-card">
  <div class="preview-header">Document A</div>
  <div class="preview-content">
    <p>This is a detailed preview of Document A with full content summary and metadata.</p>
    <div class="preview-stats">
      <span>Pages: 5</span>
      <span>Size: 2.3 MB</span>
    </div>
  </div>
</div>

<div popover="auto" id="preview-item-2" class="preview-card">
  <div class="preview-header">Document B</div>
  <div class="preview-content">
    <p>This is a detailed preview of Document B with full content summary and metadata.</p>
    <div class="preview-stats">
      <span>Pages: 12</span>
      <span>Size: 4.7 MB</span>
    </div>
  </div>
</div>

<div popover="auto" id="preview-item-3" class="preview-card">
  <div class="preview-header">Document C</div>
  <div class="preview-content">
    <p>This is a detailed preview of Document C with full content summary and metadata.</p>
    <div class="preview-stats">
      <span>Pages: 3</span>
      <span>Size: 1.2 MB</span>
    </div>
  </div>
</div>

<style>
  .preview-list {
    max-width: 400px;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
  }

  .items {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .items li {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .items li:last-child {
    border-bottom: none;
  }

  .items li:hover {
    background-color: #f5f5f5;
  }

  .item-title {
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }

  .item-meta {
    font-size: 12px;
    color: #999;
  }

  .preview-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: white;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    width: 280px;
    overflow: hidden;
  }

  .preview-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px;
    font-weight: 600;
  }

  .preview-content {
    padding: 16px;
  }

  .preview-content p {
    margin: 0 0 12px 0;
    color: #666;
    font-size: 14px;
    line-height: 1.5;
  }

  .preview-stats {
    display: flex;
    gap: 16px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
    font-size: 13px;
    color: #999;
  }

  .preview-card:popover-open {
    animation: slideInRight 0.3s ease-out;
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
```

## Rich Information Panels

Display rich information panels on hover.

```html
<div class="product-showcase">
  <div class="product-item" interesttarget="product-panel-1">
    <div class="product-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
    <h3>Premium Product</h3>
    <p class="price">$99.99</p>
  </div>

  <div class="product-item" interesttarget="product-panel-2">
    <div class="product-image" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"></div>
    <h3>Deluxe Product</h3>
    <p class="price">$149.99</p>
  </div>
</div>

<div popover="auto" id="product-panel-1" class="product-panel">
  <h3>Premium Product</h3>
  <p class="panel-price">$99.99</p>
  <ul class="features">
    <li>Feature 1</li>
    <li>Feature 2</li>
    <li>Feature 3</li>
    <li>Feature 4</li>
  </ul>
  <button class="add-to-cart">Add to Cart</button>
</div>

<div popover="auto" id="product-panel-2" class="product-panel">
  <h3>Deluxe Product</h3>
  <p class="panel-price">$149.99</p>
  <ul class="features">
    <li>Premium Feature 1</li>
    <li>Premium Feature 2</li>
    <li>Premium Feature 3</li>
    <li>Premium Feature 4</li>
    <li>Exclusive Feature 5</li>
  </ul>
  <button class="add-to-cart">Add to Cart</button>
</div>

<style>
  .product-showcase {
    display: flex;
    gap: 20px;
    padding: 20px;
  }

  .product-item {
    text-align: center;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .product-item:hover {
    transform: translateY(-4px);
  }

  .product-image {
    width: 150px;
    height: 150px;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .product-item h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #333;
  }

  .price {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #2196F3;
  }

  .product-panel {
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 20px;
    background: white;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    width: 280px;
  }

  .product-panel h3 {
    margin: 0 0 8px 0;
    color: #333;
    font-size: 18px;
  }

  .panel-price {
    margin: 0 0 16px 0;
    font-size: 24px;
    font-weight: 700;
    color: #2196F3;
  }

  .features {
    list-style: none;
    margin: 0 0 16px 0;
    padding: 0;
  }

  .features li {
    padding: 8px 0;
    color: #666;
    font-size: 14px;
    border-bottom: 1px solid #f0f0f0;
  }

  .features li:last-child {
    border-bottom: none;
  }

  .add-to-cart {
    width: 100%;
    padding: 12px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .add-to-cart:hover {
    background: #45a049;
  }

  .product-panel:popover-open {
    animation: popoverAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes popoverAppear {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
```

## Keyboard Accessible Hover Interactions

Ensure hover interactions work with keyboard navigation.

```html
<div class="accessible-list">
  <button interesttarget="info-1" class="info-trigger">Item 1</button>
  <button interesttarget="info-2" class="info-trigger">Item 2</button>
  <button interesttarget="info-3" class="info-trigger">Item 3</button>
</div>

<div popover="auto" id="info-1" role="tooltip">
  <h4>Item 1 Information</h4>
  <p>Details about Item 1 displayed on hover or focus</p>
</div>

<div popover="auto" id="info-2" role="tooltip">
  <h4>Item 2 Information</h4>
  <p>Details about Item 2 displayed on hover or focus</p>
</div>

<div popover="auto" id="info-3" role="tooltip">
  <h4>Item 3 Information</h4>
  <p>Details about Item 3 displayed on hover or focus</p>
</div>

<style>
  .accessible-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px;
  }

  .info-trigger {
    padding: 12px 16px;
    background: #2196F3;
    color: white;
    border: 2px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .info-trigger:hover,
  .info-trigger:focus {
    background: #1976D2;
    border-color: #1565C0;
    outline: none;
  }

  [popover][role="tooltip"] {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    background: white;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    width: 240px;
  }

  [popover][role="tooltip"] h4 {
    margin: 0 0 8px 0;
    color: #333;
    font-size: 14px;
  }

  [popover][role="tooltip"] p {
    margin: 0;
    color: #666;
    font-size: 13px;
    line-height: 1.4;
  }
</style>

<script>
  const triggers = document.querySelectorAll('.info-trigger');

  triggers.forEach(trigger => {
    trigger.addEventListener('focus', (e) => {
      const targetId = e.target.getAttribute('interesttarget');
      const tooltip = document.getElementById(targetId);
      if (tooltip) {
        tooltip.showPopover();
      }
    });

    trigger.addEventListener('blur', (e) => {
      const targetId = e.target.getAttribute('interesttarget');
      const tooltip = document.getElementById(targetId);
      if (tooltip && tooltip.matches(':popover-open')) {
        tooltip.hidePopover();
      }
    });
  });
</script>
```

## Hierarchical Hover Popovers

Create multi-level hover-triggered information hierarchy.

```html
<div class="menu">
  <div class="menu-item" interesttarget="submenu-1">
    <span>Products</span>
    <span class="arrow">></span>
  </div>
  <div class="menu-item" interesttarget="submenu-2">
    <span>Services</span>
    <span class="arrow">></span>
  </div>
  <div class="menu-item" interesttarget="submenu-3">
    <span>Resources</span>
    <span class="arrow">></span>
  </div>
</div>

<div popover="auto" id="submenu-1" class="submenu">
  <a href="#" interesttarget="detail-1">Electronics</a>
  <a href="#" interesttarget="detail-2">Software</a>
  <a href="#" interesttarget="detail-3">Services</a>
</div>

<div popover="auto" id="submenu-2" class="submenu">
  <a href="#">Consulting</a>
  <a href="#">Support</a>
  <a href="#">Training</a>
</div>

<div popover="auto" id="submenu-3" class="submenu">
  <a href="#">Documentation</a>
  <a href="#">FAQ</a>
  <a href="#">Blog</a>
</div>

<style>
  .menu {
    border: 1px solid #ddd;
    border-radius: 8px;
    background: white;
    width: 200px;
  }

  .menu-item {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background-color 0.2s;
  }

  .menu-item:last-child {
    border-bottom: none;
  }

  .menu-item:hover {
    background-color: #f5f5f5;
  }

  .arrow {
    color: #999;
    font-size: 12px;
  }

  .submenu {
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    min-width: 150px;
    padding: 8px 0;
  }

  .submenu a {
    display: block;
    padding: 12px 16px;
    color: #333;
    text-decoration: none;
    transition: background-color 0.2s;
    font-size: 14px;
  }

  .submenu a:hover {
    background-color: #f5f5f5;
    color: #2196F3;
  }

  .submenu:popover-open {
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
```

## Performance and Accessibility

Combine interesttarget with proper ARIA attributes:

```html
<button
  interesttarget="info-panel"
  aria-describedby="info-panel"
  aria-haspopup="dialog"
>
  More Info
</button>

<div popover="auto" id="info-panel" role="tooltip">
  <p>This is helpful additional information</p>
</div>

<style>
  [popover]:popover-open {
    animation: smoothAppear 0.2s ease-out;
  }

  @keyframes smoothAppear {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
```

## Browser Compatibility

- Chromium 143+: Full interesttarget support
- Edge 123+: Full support
- Safari 17.2+: Limited support
- Firefox: Planned support

## Summary

Master hover-triggered UI with interest invokers:
- Basic popover hover activation
- Tooltip systems with hover triggers
- Preview cards on item hover
- Rich information panels
- Keyboard accessible alternatives
- Hierarchical hover menus
- Proper ARIA attributes
- Performance optimization

Create interactive interfaces without hover listeners.
