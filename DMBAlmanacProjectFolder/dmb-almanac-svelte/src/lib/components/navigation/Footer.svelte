<script lang="ts">
  /**
   * Footer Component - Svelte 5
   *
   * Multi-column footer with brand info, navigation links, and copyright.
   * Uses Svelte 5 runes for reactive date.
   */

  interface FooterLink {
    label: string;
    href: string;
  }

  interface FooterLinkGroup {
    browse: FooterLink[];
    discover: FooterLink[];
    about: FooterLink[];
  }

  const footerLinks: FooterLinkGroup = {
    browse: [
      { label: 'Tours', href: '/tours' },
      { label: 'Songs', href: '/songs' },
      { label: 'Venues', href: '/venues' },
      { label: 'Guests', href: '/guests' }
    ],
    discover: [
      { label: 'Discography', href: '/discography' },
      { label: 'Liberation List', href: '/liberation' },
      { label: 'Statistics', href: '/stats' },
      { label: 'Search', href: '/search' }
    ],
    about: [
      { label: 'About', href: '/about' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact', href: '/contact' }
    ]
  };

  const currentYear = $derived(new Date().getFullYear());
</script>

<footer class="footer">
  <div class="container">
    <div class="grid">
      <!-- Brand -->
      <div class="brand">
        <a href="/" class="logo" aria-label="DMB Almanac Home">
          <span class="logoIcon" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
              <circle cx="16" cy="16" r="4" fill="currentColor" />
            </svg>
          </span>
          <span class="logoText" aria-hidden="true"> DMB Almanac </span>
        </a>
        <p class="description">
          The comprehensive database of Dave Matthews Band concert history, setlists, and
          statistics since 1991.
        </p>
      </div>

      <!-- Browse Links -->
      <nav class="linkGroup" aria-label="Browse navigation">
        <h4 class="linkGroupTitle" id="footer-browse">Browse</h4>
        <ul class="linkList" aria-labelledby="footer-browse">
          {#each footerLinks.browse as link}
            <li>
              <a href={link.href} class="link">
                {link.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>

      <!-- Discover Links -->
      <nav class="linkGroup" aria-label="Discover navigation">
        <h4 class="linkGroupTitle" id="footer-discover">Discover</h4>
        <ul class="linkList" aria-labelledby="footer-discover">
          {#each footerLinks.discover as link}
            <li>
              <a href={link.href} class="link">
                {link.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>

      <!-- About Links -->
      <nav class="linkGroup" aria-label="About navigation">
        <h4 class="linkGroupTitle" id="footer-about">About</h4>
        <ul class="linkList" aria-labelledby="footer-about">
          {#each footerLinks.about as link}
            <li>
              <a href={link.href} class="link">
                {link.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </div>

    <!-- Bottom Bar -->
    <div class="bottom">
      <p class="copyright">
        &copy; {currentYear} DMB Almanac. This is a fan-made site, not affiliated with Dave
        Matthews Band.
      </p>
      <p class="disclaimer">
        Data sourced from
        <a
          href="https://dmbalmanac.com"
          target="_blank"
          rel="noopener noreferrer"
          class="externalLink"
        >
          DMBAlmanac.com
        </a>
      </p>
    </div>
  </div>
</footer>

<style>
  .footer {
    background: linear-gradient(
      to bottom,
      var(--background-secondary),
      color-mix(in oklch, var(--background-secondary) 95%, var(--color-gray-200))
    );
    border-top: 1px solid var(--border-color);
    margin-top: auto;
    position: relative;
  }

  /* Subtle top border gradient */
  .footer::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--color-primary-200),
      transparent
    );
  }

  .container {
    max-width: var(--container-xl);
    margin: 0 auto;
    padding: var(--space-12) var(--space-4);
  }

  @media (min-width: 640px) {
    .container {
      padding: var(--space-12) var(--space-6);
    }
  }

  .grid {
    display: grid;
    gap: var(--space-8);
    grid-template-columns: 1fr;
  }

  @media (min-width: 640px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .grid {
      grid-template-columns: 2fr 1fr 1fr 1fr;
    }
  }

  /* Brand */
  .brand {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    text-decoration: none;
    color: var(--foreground);
  }

  .logo:hover {
    text-decoration: none;
  }

  .logoIcon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: var(--color-primary-500);
  }

  .logoIcon svg {
    width: 100%;
    height: 100%;
  }

  .logoText {
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
  }

  .description {
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
    line-height: var(--leading-relaxed);
    max-width: 300px;
    margin: 0;
  }

  /* Link Groups */
  .linkGroup {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .linkGroupTitle {
    font-size: var(--text-xs);
    font-weight: var(--font-bold);
    color: var(--foreground);
    text-transform: uppercase;
    letter-spacing: var(--tracking-widest);
    margin: 0;
  }

  .linkList {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .link {
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
    text-decoration: none;
    transition:
      color var(--transition-fast) var(--ease-smooth),
      transform var(--transition-fast) var(--ease-apple);
    display: inline-block;
  }

  .link:hover {
    color: var(--color-primary-600);
    text-decoration: none;
    transform: translateX(2px);
  }

  .link:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  .logo:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 4px;
    border-radius: var(--radius-md);
  }

  /* Bottom Bar */
  .bottom {
    margin-top: var(--space-8);
    padding-top: var(--space-6);
    border-top: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  @media (min-width: 640px) {
    .bottom {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
  }

  .copyright,
  .disclaimer {
    font-size: var(--text-xs);
    color: var(--foreground-muted);
    margin: 0;
  }

  .externalLink {
    color: var(--color-primary-600);
    text-decoration: none;
  }

  .externalLink:hover {
    text-decoration: underline;
  }

  .externalLink:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .footer {
      background: linear-gradient(
        to bottom,
        var(--color-gray-900),
        color-mix(in oklch, var(--color-gray-900) 90%, var(--color-gray-950))
      );
      border-top-color: var(--color-gray-700);
    }

    .footer::before {
      background: linear-gradient(
        90deg,
        transparent,
        oklch(0.7 0.19 82 / 0.3),
        transparent
      );
    }

    .link:hover {
      color: var(--color-primary-400);
    }

    .externalLink {
      color: var(--color-primary-400);
    }
  }

  /* High Contrast Mode support */
  @media (forced-colors: active) {
    .link:focus-visible,
    .logo:focus-visible,
    .externalLink:focus-visible {
      outline: 2px solid Highlight;
    }
  }
</style>
