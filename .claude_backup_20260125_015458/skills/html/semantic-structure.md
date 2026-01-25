---
name: semantic-structure
description: Implement semantic HTML5 landmarks and document structure
trigger: /semantic
used_by: [semantic-html-engineer, full-stack-developer, accessibility-specialist]
tags: [html5, accessibility, seo, landmarks, semantic]
---

# Semantic HTML5 Document Structure

Implement semantic HTML5 elements for proper document structure, landmarks, and accessibility.

## When to Use

- Every web page and application
- Page layouts and content structure
- Navigation menus and sidebars
- Article/blog content
- Dashboard layouts
- Documentation sites
- Marketing pages

**ALWAYS USE semantic elements instead of generic divs when meaning exists.**

## Browser Support

- All modern browsers (Chrome, Safari, Firefox, Edge)
- IE 9+ (with HTML5 shiv for IE 8)
- Universal support - no polyfills needed

## Required Inputs

- Page content and sections
- Navigation structure
- Content hierarchy
- Sidebar/complementary content (if any)

## Core Semantic Elements

### Document Structure Elements

| Element | Purpose | When to Use |
|---------|---------|-------------|
| `<main>` | Main content of document | Once per page, wraps primary content |
| `<header>` | Introductory content | Site header, article header, section header |
| `<footer>` | Footer content | Site footer, article footer, section footer |
| `<nav>` | Navigation links | Primary nav, secondary nav, breadcrumbs |
| `<aside>` | Tangentially related content | Sidebars, pull quotes, ads |
| `<article>` | Self-contained content | Blog posts, news articles, forum posts |
| `<section>` | Thematic grouping | Chapters, tab panels, content sections |

## Implementation

### Basic Page Structure (Vanilla HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Semantic HTML5 Example</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }

    /* Skip link for keyboard users */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: #3b82f6;
      color: white;
      padding: 8px;
      text-decoration: none;
      z-index: 100;
    }

    .skip-link:focus {
      top: 0;
    }

    /* Header */
    .site-header {
      background: #1f2937;
      color: white;
      padding: 1rem 2rem;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .site-header nav ul {
      list-style: none;
      display: flex;
      gap: 2rem;
      margin: 0;
      padding: 0;
    }

    .site-header a {
      color: white;
      text-decoration: none;
    }

    /* Main content */
    .page-container {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    main {
      min-width: 0; /* Prevent overflow */
    }

    /* Article */
    article {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }

    article header {
      margin-bottom: 1rem;
    }

    article h1 {
      margin: 0 0 0.5rem 0;
    }

    .article-meta {
      color: #6b7280;
      font-size: 0.875rem;
    }

    /* Aside */
    aside {
      background: #f9fafb;
      padding: 1.5rem;
      border-radius: 8px;
      height: fit-content;
      position: sticky;
      top: 80px;
    }

    aside h2 {
      margin-top: 0;
      font-size: 1.125rem;
    }

    /* Footer */
    .site-footer {
      background: #1f2937;
      color: white;
      padding: 3rem 2rem;
      margin-top: 4rem;
    }

    .footer-nav ul {
      list-style: none;
      padding: 0;
    }

    .footer-nav a {
      color: white;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <!-- Skip link for keyboard accessibility -->
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <!-- Site Header -->
  <header class="site-header">
    <div>
      <h1>My Website</h1>
      <nav aria-label="Main navigation">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/blog">Blog</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <!-- Page Container -->
  <div class="page-container">
    <!-- Main Content -->
    <main id="main-content">
      <!-- Individual Article -->
      <article>
        <header>
          <h1>Article Title Goes Here</h1>
          <div class="article-meta">
            <time datetime="2026-01-21">January 21, 2026</time>
            <span> · </span>
            <span>By John Doe</span>
          </div>
        </header>

        <section>
          <h2>Introduction</h2>
          <p>
            This is the introductory section of the article. Semantic HTML helps
            both search engines and assistive technologies understand the structure
            of your content.
          </p>
        </section>

        <section>
          <h2>Main Content</h2>
          <p>
            Each section represents a thematic grouping of content. Use sections
            to break up long articles into logical parts.
          </p>
        </section>

        <footer>
          <p>Tags: HTML, Accessibility, Web Development</p>
        </footer>
      </article>

      <article>
        <header>
          <h1>Another Article</h1>
          <div class="article-meta">
            <time datetime="2026-01-20">January 20, 2026</time>
          </div>
        </header>
        <p>Article content here...</p>
      </article>
    </main>

    <!-- Sidebar -->
    <aside aria-label="Sidebar">
      <section>
        <h2>Related Posts</h2>
        <nav aria-label="Related posts">
          <ul>
            <li><a href="/post-1">First Related Post</a></li>
            <li><a href="/post-2">Second Related Post</a></li>
            <li><a href="/post-3">Third Related Post</a></li>
          </ul>
        </nav>
      </section>

      <section>
        <h2>About</h2>
        <p>This sidebar contains supplementary information.</p>
      </section>
    </aside>
  </div>

  <!-- Site Footer -->
  <footer class="site-footer">
    <nav aria-label="Footer navigation" class="footer-nav">
      <ul>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/terms">Terms of Service</a></li>
        <li><a href="/sitemap">Sitemap</a></li>
      </ul>
    </nav>
    <p>&copy; 2026 My Website. All rights reserved.</p>
  </footer>
</body>
</html>
```

### React/Next.js Implementation

```tsx
// app/layout.tsx (Next.js 14+)
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

// components/Header.tsx
export function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <h1>My Website</h1>
        <nav aria-label="Main navigation">
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

// components/Footer.tsx
export function Footer() {
  return (
    <footer className="site-footer">
      <nav aria-label="Footer navigation">
        <ul>
          <li><a href="/privacy">Privacy Policy</a></li>
          <li><a href="/terms">Terms of Service</a></li>
          <li><a href="/sitemap">Sitemap</a></li>
        </ul>
      </nav>
      <p>&copy; {new Date().getFullYear()} My Website. All rights reserved.</p>
    </footer>
  );
}

// app/blog/[slug]/page.tsx
export default function BlogPost({ params }: { params: { slug: string } }) {
  return (
    <div className="container">
      <article>
        <header>
          <h1>Article Title</h1>
          <div className="article-meta">
            <time dateTime="2026-01-21">January 21, 2026</time>
            <span> · </span>
            <span>By John Doe</span>
          </div>
        </header>

        <section>
          <h2>Introduction</h2>
          <p>Article content...</p>
        </section>

        <section>
          <h2>Main Content</h2>
          <p>More content...</p>
        </section>

        <footer>
          <p>Tags: HTML, Accessibility</p>
        </footer>
      </article>

      <aside aria-label="Related content">
        <h2>Related Posts</h2>
        <nav aria-label="Related posts">
          <ul>
            <li><a href="/post-1">Related Post 1</a></li>
            <li><a href="/post-2">Related Post 2</a></li>
          </ul>
        </nav>
      </aside>
    </div>
  );
}
```

### Svelte 5 Implementation

```svelte
<!-- routes/+layout.svelte -->
<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import './app.css';

  let { children } = $props();
</script>

<svelte:head>
  <html lang="en" />
</svelte:head>

<a href="#main-content" class="skip-link">Skip to main content</a>

<Header />

<main id="main-content">
  {@render children()}
</main>

<Footer />

<!-- lib/components/Header.svelte -->
<header class="site-header">
  <div class="container">
    <h1>My Website</h1>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/blog">Blog</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  </div>
</header>

<!-- lib/components/Footer.svelte -->
<footer class="site-footer">
  <nav aria-label="Footer navigation">
    <ul>
      <li><a href="/privacy">Privacy Policy</a></li>
      <li><a href="/terms">Terms of Service</a></li>
      <li><a href="/sitemap">Sitemap</a></li>
    </ul>
  </nav>
  <p>&copy; {new Date().getFullYear()} My Website. All rights reserved.</p>
</footer>

<!-- routes/blog/[slug]/+page.svelte -->
<script lang="ts">
  let { data } = $props();
</script>

<div class="container">
  <article>
    <header>
      <h1>{data.post.title}</h1>
      <div class="article-meta">
        <time datetime={data.post.date}>{data.post.formattedDate}</time>
        <span> · </span>
        <span>By {data.post.author}</span>
      </div>
    </header>

    <section>
      <h2>Introduction</h2>
      <p>{data.post.intro}</p>
    </section>

    <section>
      <h2>Main Content</h2>
      {@html data.post.content}
    </section>

    <footer>
      <p>Tags: {data.post.tags.join(', ')}</p>
    </footer>
  </article>

  <aside aria-label="Related content">
    <h2>Related Posts</h2>
    <nav aria-label="Related posts">
      <ul>
        {#each data.relatedPosts as post}
          <li><a href="/blog/{post.slug}">{post.title}</a></li>
        {/each}
      </ul>
    </nav>
  </aside>
</div>
```

## Semantic Element Guidelines

### `<main>`

**Rules:**
- Only ONE `<main>` per page
- Contains the main content
- Must NOT be a descendant of `<article>`, `<aside>`, `<footer>`, `<header>`, or `<nav>`

**Example:**
```html
<main id="main-content">
  <!-- Primary page content -->
</main>
```

### `<article>`

**Use for:**
- Blog posts
- News articles
- Forum posts
- Product cards
- User comments
- Independent widgets

**Test:** Could this content be distributed independently (RSS feed, social share)?

```html
<article>
  <header>
    <h1>Article Title</h1>
    <time datetime="2026-01-21">Jan 21, 2026</time>
  </header>
  <p>Content...</p>
  <footer>Author, tags, etc.</footer>
</article>
```

### `<section>`

**Use for:**
- Thematic grouping of content
- Chapters in a document
- Tab panels
- Content with a heading

**Rule:** If it doesn't have a heading, use `<div>` instead.

```html
<section>
  <h2>Section Heading</h2>
  <p>Section content...</p>
</section>
```

### `<nav>`

**Use for:**
- Primary navigation
- Secondary navigation
- Breadcrumbs
- Table of contents
- Pagination

**Use `aria-label` to distinguish multiple navs:**

```html
<nav aria-label="Main navigation">
  <ul>...</ul>
</nav>

<nav aria-label="Breadcrumb">
  <ol>...</ol>
</nav>

<footer>
  <nav aria-label="Footer navigation">
    <ul>...</ul>
  </nav>
</footer>
```

### `<aside>`

**Use for:**
- Sidebars
- Pull quotes
- Advertisements
- Related links
- Glossaries

**Content should be tangentially related, not essential:**

```html
<aside aria-label="Related articles">
  <h2>You might also like</h2>
  <ul>...</ul>
</aside>
```

### `<header>` and `<footer>`

**Can be used multiple times:**
- Site header/footer (once)
- Article header/footer (per article)
- Section header/footer (per section)

```html
<!-- Site header -->
<header class="site-header">
  <h1>Site Name</h1>
  <nav>...</nav>
</header>

<!-- Article header -->
<article>
  <header>
    <h1>Article Title</h1>
    <time>Date</time>
  </header>
  <p>Content...</p>
  <footer>
    <p>Author, tags</p>
  </footer>
</article>
```

## Landmark Roles (Implicit vs Explicit)

### Implicit Landmarks (Preferred)

Semantic elements automatically create landmarks:

| Element | Implicit Role |
|---------|---------------|
| `<main>` | `role="main"` |
| `<nav>` | `role="navigation"` |
| `<aside>` | `role="complementary"` |
| `<header>` (page-level) | `role="banner"` |
| `<footer>` (page-level) | `role="contentinfo"` |
| `<form>` with accessible name | `role="form"` |
| `<section>` with accessible name | `role="region"` |

**Do NOT add redundant ARIA roles:**

```html
<!-- WRONG: Redundant role -->
<nav role="navigation">...</nav>

<!-- CORRECT: Semantic element only -->
<nav>...</nav>
```

### When to Use Explicit ARIA

Only when semantic element doesn't exist:

```html
<!-- Older browsers or legacy code -->
<div role="navigation" aria-label="Main">
  <!-- Navigation links -->
</div>

<!-- Better: Use semantic element -->
<nav aria-label="Main">
  <!-- Navigation links -->
</nav>
```

## Skip Links for Keyboard Users

Always include a skip link to bypass navigation:

```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<header>
  <nav>...</nav>
</header>

<main id="main-content">
  <!-- Content -->
</main>

<style>
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: white;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  }

  .skip-link:focus {
    top: 0;
  }
</style>
```

## Heading Hierarchy

Maintain logical heading order (h1 → h2 → h3):

```html
<!-- CORRECT -->
<article>
  <h1>Article Title</h1>
  <section>
    <h2>Section</h2>
    <h3>Subsection</h3>
  </section>
</article>

<!-- WRONG: Skipped h2 -->
<article>
  <h1>Article Title</h1>
  <h3>Subsection</h3> <!-- Skip from h1 to h3 -->
</article>
```

## SEO Benefits

Semantic HTML improves SEO by:

1. **Clear structure**: Search engines understand content hierarchy
2. **Relevant content identification**: Article vs navigation
3. **Featured snippets**: Proper heading hierarchy
4. **Rich results**: Structured data foundation
5. **Mobile-first indexing**: Accessibility correlates with mobile UX

```html
<article>
  <header>
    <h1>How to Build Accessible Websites</h1>
    <time datetime="2026-01-21">January 21, 2026</time>
  </header>
  <section>
    <h2>Introduction</h2>
    <p>...</p>
  </section>
</article>

<!-- Google can extract:
  - Article title (h1)
  - Publication date (time)
  - Content structure (sections)
  - Main content (article vs nav/aside)
-->
```

## Common Mistakes to Avoid

### ❌ Using `<div>` for Everything
```html
<!-- WRONG -->
<div class="navigation">
  <div class="nav-item">Home</div>
</div>

<!-- CORRECT -->
<nav>
  <a href="/">Home</a>
</nav>
```

### ❌ Multiple `<main>` Elements
```html
<!-- WRONG: Only one <main> allowed -->
<main>Content 1</main>
<main>Content 2</main>

<!-- CORRECT -->
<main>
  <article>Content 1</article>
  <article>Content 2</article>
</main>
```

### ❌ `<section>` Without Heading
```html
<!-- WRONG -->
<section>
  <p>Some content</p>
</section>

<!-- CORRECT -->
<section>
  <h2>Section Title</h2>
  <p>Some content</p>
</section>

<!-- OR just use div -->
<div>
  <p>Some content</p>
</div>
```

### ❌ Redundant ARIA Roles
```html
<!-- WRONG: Redundant -->
<header role="banner">
<nav role="navigation">

<!-- CORRECT: Semantic only -->
<header>
<nav>
```

## Accessibility Checklist

- [ ] Page has ONE `<main>` element
- [ ] Skip link provided (href="#main-content")
- [ ] Navigation uses `<nav>` with `aria-label`
- [ ] Multiple navs have unique labels
- [ ] Articles use `<article>` element
- [ ] Sections have headings
- [ ] Heading hierarchy is logical (h1 → h2 → h3)
- [ ] Sidebars use `<aside>`
- [ ] Page header uses `<header>`
- [ ] Page footer uses `<footer>`
- [ ] No redundant ARIA roles

## Testing Tools

### Browser DevTools
- Chrome: Accessibility tree inspector
- Firefox: Accessibility Inspector
- Safari: Audit tab

### Screen Readers
- macOS: VoiceOver (Cmd+F5)
- Windows: NVDA (free), JAWS (commercial)

### Automated Tools
```bash
# Install axe-core
npm install --save-dev @axe-core/cli

# Run audit
npx axe http://localhost:3000
```

## Expected Output

A well-structured HTML document with:
- Clear semantic landmarks
- Logical heading hierarchy
- Proper navigation labels
- Accessible to keyboard users
- SEO-friendly structure
- Screen reader compatible

## Success Criteria

- [ ] All semantic elements used correctly
- [ ] One `<main>` per page
- [ ] Skip link functional
- [ ] Landmarks identifiable in accessibility tree
- [ ] Heading hierarchy valid (no skipped levels)
- [ ] Multiple navs have unique labels
- [ ] Screen reader can navigate by landmarks
- [ ] SEO structured data recognizes content

## References

- [MDN: HTML5 Semantic Elements](https://developer.mozilla.org/en-US/docs/Glossary/Semantics#semantic_elements)
- [W3C: HTML5 Sections](https://www.w3.org/TR/html5/sections.html)
- [WebAIM: Semantic Structure](https://webaim.org/techniques/semanticstructure/)
- [ARIA: Landmarks](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
