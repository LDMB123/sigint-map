---
name: View Transitions Patterns
description: Cross-document transitions and morphing animations with Chrome 143+ View Transitions API
trigger: /view-transitions
---

# View Transitions Patterns for Chromium 143+

Chromium 143+ includes native support for cross-document View Transitions, enabling seamless animated transitions between full-page navigations without JavaScript animation libraries. This eliminates the need for Framer Motion or similar libraries for navigation-based animations.

## View Transition Fundamentals

The View Transitions API creates automatic screenshots before/after navigation and animates between them:

```javascript
// Trigger view transition on navigation
document.startViewTransition(() => {
  // Navigation logic or DOM updates
  history.pushState(null, '', '/new-page');
});

// For cross-document navigation, use fetch interceptor
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link && link.origin === window.location.origin) {
    e.preventDefault();

    document.startViewTransition(async () => {
      const response = await fetch(link.href);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      document.documentElement.innerHTML = doc.documentElement.innerHTML;
      window.history.pushState(null, '', link.href);
    });
  }
});
```

## View Transition Names

Assign names to elements to create custom morphing animations:

```html
<style>
  /* Name the element being transitioned */
  .hero-image {
    view-transition-name: hero-visual;
  }

  .product-card {
    view-transition-name: product-detail;
  }

  .button-primary {
    view-transition-name: call-to-action;
  }
</style>

<img src="hero.jpg" class="hero-image" alt="Hero">
<div class="product-card">Product Details</div>
<button class="button-primary">Buy Now</button>
```

## View Transition Class Grouping

Group related elements for coordinated animations:

```css
.sidebar {
  view-transition-name: sidebar-panel;
}

.sidebar.hidden {
  view-transition-name: none;
}

.content-area {
  view-transition-name: main-content;
}

.footer {
  view-transition-name: footer-section;
}

/* Pseudo-elements control animation */
::view-transition-old(hero-visual) {
  animation: fadeOut 300ms cubic-bezier(0.4, 0, 1, 1);
}

::view-transition-new(hero-visual) {
  animation: scaleIn 400ms cubic-bezier(0, 0, 0.2, 1);
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes scaleIn {
  from { transform: scale(0.95); }
  to { transform: scale(1); }
}
```

## Morphing Animations Between States

Create smooth morphing effects as elements change between pages:

```html
<style>
  /* Home page hero */
  .page-home .hero {
    view-transition-name: app-hero;
    width: 100vw;
    height: 60vh;
    border-radius: 0;
  }

  /* Product page hero - same element, different layout */
  .page-product .hero {
    view-transition-name: app-hero;
    width: 300px;
    height: 400px;
    border-radius: 12px;
  }

  /* Customize the transition animation */
  ::view-transition-old(app-hero) {
    animation: fadeOutMove 400ms cubic-bezier(0.4, 0, 1, 1);
  }

  ::view-transition-new(app-hero) {
    animation: fadeInMove 400ms cubic-bezier(0, 0, 0.2, 1);
  }

  @keyframes fadeOutMove {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.9);
    }
  }

  @keyframes fadeInMove {
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

<div class="hero">Featured Content</div>
```

## Navigation Transitions for PWAs

Progressive Web Apps benefit from smooth transitions between routes:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .page {
      view-transition-name: page-container;
      min-height: 100vh;
      padding: 20px;
    }

    .nav-link {
      color: #0066cc;
      text-decoration: none;
      margin-right: 16px;
      cursor: pointer;
    }

    ::view-transition-old(page-container) {
      animation: slideOutLeft 400ms ease-in;
    }

    ::view-transition-new(page-container) {
      animation: slideInRight 400ms ease-out;
    }

    @keyframes slideOutLeft {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(-100%);
      }
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
  </style>
</head>
<body>
  <nav>
    <a class="nav-link" onclick="navigateToPage('home')">Home</a>
    <a class="nav-link" onclick="navigateToPage('about')">About</a>
    <a class="nav-link" onclick="navigateToPage('contact')">Contact</a>
  </nav>

  <div id="page" class="page">
    <h1>Welcome Home</h1>
  </div>

  <script>
    const pages = {
      home: '<h1>Welcome Home</h1><p>Home page content</p>',
      about: '<h1>About Us</h1><p>About page content</p>',
      contact: '<h1>Contact Us</h1><p>Contact page content</p>'
    };

    async function navigateToPage(pageName) {
      const pageElement = document.getElementById('page');

      document.startViewTransition(() => {
        pageElement.innerHTML = pages[pageName];
        window.history.pushState({ page: pageName }, '', `/${pageName}`);
      });
    }
  </script>
</body>
</html>
```

## Gallery View Transitions

Create smooth morphing between gallery thumbnails and full-size images:

```html
<style>
  .gallery-thumb {
    width: 100px;
    height: 100px;
    cursor: pointer;
    border-radius: 8px;
  }

  .gallery-thumb[data-selected] {
    view-transition-name: gallery-selected;
    border: 2px solid #0066cc;
  }

  .fullscreen-image {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    object-fit: contain;
    background: rgba(0, 0, 0, 0.95);
  }

  .fullscreen-image[data-view-transition] {
    view-transition-name: gallery-selected;
  }

  ::view-transition-old(gallery-selected) {
    animation: thumbnailToFullscreen 300ms cubic-bezier(0, 0, 0.2, 1);
  }

  ::view-transition-new(gallery-selected) {
    animation: expandToFullscreen 300ms cubic-bezier(0, 0, 0.2, 1);
  }

  @keyframes thumbnailToFullscreen {
    from {
      width: 100px;
      height: 100px;
      border-radius: 8px;
    }
    to {
      width: 100vw;
      height: 100vh;
      border-radius: 0;
    }
  }

  @keyframes expandToFullscreen {
    from {
      width: 100px;
      height: 100px;
      border-radius: 8px;
    }
    to {
      width: 100vw;
      height: 100vh;
      border-radius: 0;
    }
  }
</style>

<div class="gallery">
  <img src="thumb1.jpg" class="gallery-thumb" data-selected>
  <img src="thumb2.jpg" class="gallery-thumb">
  <img src="thumb3.jpg" class="gallery-thumb">
</div>

<script>
  document.querySelectorAll('.gallery-thumb').forEach((thumb, index) => {
    thumb.addEventListener('click', () => {
      document.startViewTransition(() => {
        document.querySelectorAll('[data-selected]').forEach(el => {
          el.removeAttribute('data-selected');
        });
        thumb.setAttribute('data-selected', '');
      });
    });
  });
</script>
```

## Modal Transitions

Smooth animations for modal open/close with view transitions:

```html
<style>
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 600px;
    background: white;
    border-radius: 12px;
    padding: 32px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    z-index: 1000;
  }

  .modal[open] {
    view-transition-name: modal-container;
  }

  .modal-trigger {
    padding: 12px 24px;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
  }

  ::view-transition-old(modal-container) {
    animation: scaleOutFade 300ms ease-in;
  }

  ::view-transition-new(modal-container) {
    animation: scaleInFade 300ms ease-out;
  }

  @keyframes scaleOutFade {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.9);
    }
  }

  @keyframes scaleInFade {
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

<button class="modal-trigger" onclick="openModal()">Open Modal</button>

<dialog id="modal" class="modal">
  <h2>Modal Title</h2>
  <p>Modal content goes here</p>
  <button onclick="closeModal()">Close</button>
</dialog>

<script>
  function openModal() {
    const modal = document.getElementById('modal');
    document.startViewTransition(() => {
      modal.setAttribute('open', '');
      modal.showModal();
    });
  }

  function closeModal() {
    const modal = document.getElementById('modal');
    document.startViewTransition(() => {
      modal.removeAttribute('open');
      modal.close();
    });
  }
</script>
```

## Tab Switching Transitions

Animate between tab panels:

```css
.tab-panel {
  view-transition-name: tab-content;
  animation: fadeAndSlide 300ms ease-out;
}

.tab-panel.hidden {
  display: none;
}

::view-transition-old(tab-content) {
  animation: fadeAndSlideOut 300ms ease-in;
}

::view-transition-new(tab-content) {
  animation: fadeAndSlideIn 300ms ease-out;
}

@keyframes fadeAndSlideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-30px);
  }
}

@keyframes fadeAndSlideIn {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

HTML structure:

```html
<div class="tabs">
  <button class="tab-button" onclick="switchTab('panel1')">Tab 1</button>
  <button class="tab-button" onclick="switchTab('panel2')">Tab 2</button>
  <button class="tab-button" onclick="switchTab('panel3')">Tab 3</button>
</div>

<div id="panel1" class="tab-panel">Content 1</div>
<div id="panel2" class="tab-panel hidden">Content 2</div>
<div id="panel3" class="tab-panel hidden">Content 3</div>

<script>
  function switchTab(panelId) {
    document.startViewTransition(() => {
      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
      });
      document.getElementById(panelId).classList.remove('hidden');
    });
  }
</script>
```

## Disabling View Transitions

Skip transitions for specific navigations:

```html
<style>
  /* Opt-out specific navigation from transitions */
  a[data-no-transition] {
    view-transition: none;
  }
</style>

<a href="/page" data-no-transition>Skip Transition</a>

<script>
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link?.hasAttribute('data-no-transition')) {
      // Navigation happens without view transition
    }
  });
</script>
```

## Performance Considerations

- View Transitions create snapshots, avoid for heavy DOM
- Limit named transitions to < 10 elements per page
- Use simple easing functions for smoother 120fps
- Test actual page transitions, not just CSS
- Provide fallback for older browser versions
