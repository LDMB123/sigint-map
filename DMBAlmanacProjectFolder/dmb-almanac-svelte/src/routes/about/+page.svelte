<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import CardContent from '$lib/components/ui/CardContent.svelte';
</script>

<svelte:head>
  <title>About | DMB Almanac</title>
  <meta
    name="description"
    content="Learn about DMB Almanac - a comprehensive database of Dave Matthews Band performances"
  />
</svelte:head>

<div class="container">
  <!-- Header -->
  <div class="header">
    <h1 class="title">About DMB Almanac</h1>
    <p class="subtitle">
      A comprehensive database of Dave Matthews Band performances
    </p>
  </div>

  <!-- Main Content -->
  <div class="content">
    <!-- What is DMB Almanac -->
    <Card class="section">
      <CardContent class="section-content">
        <h2 class="section-title">What is DMB Almanac?</h2>
        <p class="text">
          DMB Almanac is a comprehensive database dedicated to cataloging every known Dave
          Matthews Band performance. From intimate club shows in the early 1990s to massive
          stadium tours, this project aims to preserve the rich touring history of one of
          America's most prolific live bands.
        </p>
        <p class="text">
          The database includes detailed setlists, venue information, guest musician
          appearances, song statistics, and more. Whether you're researching a specific
          show you attended or exploring the band's evolution over three decades, DMB
          Almanac provides the tools to dive deep into the data.
        </p>
      </CardContent>
    </Card>

    <!-- Data Source -->
    <Card class="section">
      <CardContent class="section-content">
        <h2 class="section-title">Data Source</h2>
        <p class="text">
          The data in this application is sourced from{' '}
          <a
            href="https://www.dmbalmanac.com"
            target="_blank"
            rel="noopener noreferrer"
            class="link"
          >
            DMBAlmanac.com
          </a>
          , the original and definitive resource for Dave Matthews Band setlist information.
          DMBAlmanac.com has been meticulously maintained by dedicated fans for over two
          decades.
        </p>
        <p class="text">
          We are deeply grateful to the DMBAlmanac.com community for their tireless work in
          documenting every show, verifying setlists, and preserving this invaluable archive of
          DMB history.
        </p>
      </CardContent>
    </Card>

    <!-- Educational Project -->
    <Card class="section">
      <CardContent class="section-content">
        <h2 class="section-title">Educational Project</h2>
        <p class="text">
          This application was built as an educational project to explore modern web development
          technologies. It serves as a practical demonstration of:
        </p>
        <ul class="list">
          <li>SvelteKit and Svelte 5 runes</li>
          <li>Progressive Web App (PWA) capabilities</li>
          <li>SQLite database integration</li>
          <li>View Transitions API</li>
          <li>Modern CSS features (Container Queries, :has() selector)</li>
          <li>Accessible, responsive design patterns</li>
        </ul>
        <p class="text">
          This project is not affiliated with Dave Matthews Band, their management, or
          DMBAlmanac.com. It is an independent fan project created for educational purposes.
        </p>
      </CardContent>
    </Card>

    <!-- Features -->
    <Card class="section">
      <CardContent class="section-content">
        <h2 class="section-title">Features</h2>
        <div class="feature-grid">
          <div class="feature">
            <h3 class="feature-title">Show Database</h3>
            <p class="feature-text">
              Browse thousands of shows with complete setlists, venue details, and performance
              notes.
            </p>
          </div>
          <div class="feature">
            <h3 class="feature-title">Song Statistics</h3>
            <p class="feature-text">
              Explore detailed statistics for every song including play counts, gaps, and
              performance trends.
            </p>
          </div>
          <div class="feature">
            <h3 class="feature-title">Liberation List</h3>
            <p class="feature-text">
              Track songs that haven't been played in years, waiting to be
              "liberated" back into rotation.
            </p>
          </div>
          <div class="feature">
            <h3 class="feature-title">Guest Musicians</h3>
            <p class="feature-text">
              Discover which guest musicians have joined DMB on stage and explore their
              appearance history.
            </p>
          </div>
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

  .text:last-child {
    margin-bottom: 0;
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

  /* List */
  .list {
    margin: 0 0 var(--space-4);
    padding-left: var(--space-6);
    color: var(--foreground-secondary);
    line-height: 1.8;
  }

  .list li {
    margin-bottom: var(--space-2);
  }

  /* Feature Grid */
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .feature {
    padding: var(--space-4);
    background: var(--background);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
  }

  .feature-title {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--color-primary-600);
    margin: 0 0 var(--space-2);
  }

  .feature-text {
    font-size: var(--text-sm);
    color: var(--foreground-muted);
    line-height: 1.6;
    margin: 0;
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

    .feature-grid {
      grid-template-columns: 1fr;
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

    .feature {
      background: var(--background-secondary);
      border-color: var(--border-color);
    }

    .feature-title {
      color: var(--color-primary-400);
    }
  }
</style>
