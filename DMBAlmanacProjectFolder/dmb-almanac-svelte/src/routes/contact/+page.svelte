<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import CardContent from '$lib/components/ui/CardContent.svelte';
</script>

<svelte:head>
  <title>Contact | DMB Almanac</title>
  <meta name="description" content="Contact information and credits for DMB Almanac" />
</svelte:head>

<div class="container">
  <!-- Header -->
  <div class="header">
    <h1 class="title">Contact</h1>
    <p class="subtitle">Get in touch and learn more about this project</p>
  </div>

  <!-- Main Content -->
  <div class="content">
    <!-- GitHub -->
    <Card class="section">
      <CardContent class="section-content">
        <h2 class="section-title">Source Code</h2>
        <p class="text">
          DMB Almanac is an open-source project. You can view the source code, report issues, or
          contribute on GitHub:
        </p>
        <a
          href="https://github.com/username/dmb-almanac"
          target="_blank"
          rel="noopener noreferrer"
          class="github-link"
        >
          <svg
            class="github-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <span>View on GitHub</span>
        </a>
        <p class="text-small">
          Issues, feature requests, and pull requests are welcome.
        </p>
      </CardContent>
    </Card>

    <!-- Credits -->
    <Card class="section">
      <CardContent class="section-content">
        <h2 class="section-title">Credits</h2>
        <div class="credits-list">
          <div class="credit">
            <h3 class="credit-title">Data Source</h3>
            <p class="credit-text">
              All show and setlist data is sourced from{' '}
              <a
                href="https://www.dmbalmanac.com"
                target="_blank"
                rel="noopener noreferrer"
                class="link"
              >
                DMBAlmanac.com
              </a>
              , maintained by the incredible DMB fan community for over 20 years.
            </p>
          </div>
          <div class="credit">
            <h3 class="credit-title">DMB Community</h3>
            <p class="credit-text">
              Special thanks to all the dedicated fans who have documented, verified, and
              preserved decades of DMB touring history.
            </p>
          </div>
          <div class="credit">
            <h3 class="credit-title">Technologies</h3>
            <p class="credit-text">
              Built with SvelteKit, Svelte 5, SQLite, and modern web technologies. Styled with
              modern CSS features like oklch colors and container queries.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Disclaimer -->
    <Card class="disclaimer">
      <CardContent class="disclaimer-content">
        <h2 class="disclaimer-title">Disclaimer</h2>
        <div class="disclaimer-text">
          <p>
            <strong>Not Affiliated:</strong> This application is an independent fan project and
            is not affiliated with, endorsed by, or connected to Dave Matthews Band, their
            management, record labels, or official channels.
          </p>
          <p>
            <strong>Data Accuracy:</strong> While we strive for accuracy, this database may
            contain errors or incomplete information. For official information, please refer to
            the band's official channels.
          </p>
          <p>
            <strong>Educational Purpose:</strong> This project was created for educational
            purposes to demonstrate modern web development techniques. It is provided as-is
            without warranty.
          </p>
          <p>
            <strong>Trademarks:</strong> "Dave Matthews Band" and related marks are
            trademarks of their respective owners. All concert and setlist information is
            provided for informational purposes only.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</div>

<style>
  .container {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: var(--space-6) var(--space-4);
  }

  /* Header */
  .header {
    text-align: center;
    margin-bottom: var(--space-8);
  }

  .title {
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    color: var(--foreground);
    margin: 0 0 var(--space-2);
  }

  .subtitle {
    font-size: var(--text-lg);
    color: var(--foreground-secondary);
    margin: 0;
  }

  /* Content */
  .content {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    max-width: 800px;
    margin: 0 auto;
  }

  /* Section */
  :global(.section) {
    background: linear-gradient(
      135deg,
      color-mix(in oklch, var(--color-primary-50) 60%, var(--background)),
      var(--background)
    );
  }

  :global(.section-content) {
    padding: var(--space-6) !important;
  }

  :global(.section-title) {
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
    color: var(--foreground);
    margin: 0 0 var(--space-4);
    padding-bottom: var(--space-3);
    border-bottom: 2px solid var(--color-primary-200);
  }

  /* Text */
  .text {
    font-size: var(--text-base);
    color: var(--foreground-secondary);
    line-height: 1.7;
    margin: 0 0 var(--space-4);
  }

  .text-small {
    font-size: var(--text-sm);
    color: var(--foreground-muted);
    margin: var(--space-4) 0 0;
  }

  /* Link */
  .link {
    color: var(--color-primary-600);
    font-weight: var(--font-medium);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .link:hover {
    color: var(--color-primary-700);
  }

  /* GitHub Link */
  .github-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    background: var(--foreground);
    color: var(--background);
    border-radius: var(--radius-lg);
    font-weight: var(--font-semibold);
    font-size: var(--text-base);
    text-decoration: none;
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  }

  .github-link:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    text-decoration: none;
    color: var(--background);
  }

  .github-icon {
    width: 24px;
    height: 24px;
  }

  /* Credits */
  .credits-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .credit {
    padding-left: var(--space-4);
    border-left: 3px solid var(--color-primary-300);
  }

  .credit-title {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    margin: 0 0 var(--space-2);
  }

  .credit-text {
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
    line-height: 1.6;
    margin: 0;
  }

  /* Disclaimer */
  :global(.disclaimer) {
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
  }

  :global(.disclaimer-content) {
    padding: var(--space-6) !important;
  }

  .disclaimer-title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    margin: 0 0 var(--space-4);
  }

  .disclaimer-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .disclaimer-text p {
    font-size: var(--text-sm);
    color: var(--foreground-muted);
    line-height: 1.6;
    margin: 0;
  }

  .disclaimer-text strong {
    color: var(--foreground-secondary);
    font-weight: var(--font-semibold);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: var(--space-4) var(--space-3);
    }

    .title {
      font-size: var(--text-3xl);
    }

    :global(.section-content) {
      padding: var(--space-4) !important;
    }

    :global(.disclaimer-content) {
      padding: var(--space-4) !important;
    }

    .github-link {
      width: 100%;
      justify-content: center;
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    :global(.section) {
      background: linear-gradient(
        135deg,
        oklch(0.70 0.19 82 / 0.08),
        var(--background)
      );
    }

    :global(.section-title) {
      border-bottom-color: oklch(0.70 0.19 82 / 0.3);
    }

    .credit {
      border-left-color: var(--color-primary-500);
    }

    .link {
      color: var(--color-primary-400);
    }

    .link:hover {
      color: var(--color-primary-300);
    }

    .github-link {
      background: var(--color-gray-100);
      color: var(--color-gray-900);
    }

    :global(.disclaimer) {
      background: var(--background-tertiary);
    }
  }
</style>
