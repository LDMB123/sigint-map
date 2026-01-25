<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import CardContent from '$lib/components/ui/CardContent.svelte';

  interface Album {
    title: string;
    year: number;
    trackCount?: number;
    description?: string;
  }

  const studioAlbums: Album[] = [
    {
      title: "Under the Table and Dreaming",
      year: 1994,
      trackCount: 12,
      description: "Debut major label album featuring What Would You Say and Ants Marching",
    },
    {
      title: "Crash",
      year: 1996,
      trackCount: 12,
      description: "Grammy-winning album with So Much to Say and Crash into Me",
    },
    {
      title: "Before These Crowded Streets",
      year: 1998,
      trackCount: 11,
      description: "Fan-favorite album featuring Stay (Wasting Time) and Don't Drink the Water",
    },
    {
      title: "Everyday",
      year: 2001,
      trackCount: 12,
      description: "Produced by Glen Ballard, featuring The Space Between and I Did It",
    },
    {
      title: "Busted Stuff",
      year: 2002,
      trackCount: 12,
      description:
        "Reworked Lillywhite Sessions tracks including Grey Street and Where Are You Going",
    },
    {
      title: "Stand Up",
      year: 2005,
      trackCount: 14,
      description: "Featuring American Baby and Dreamgirl",
    },
    {
      title: "Big Whiskey and the GrooGrux King",
      year: 2009,
      trackCount: 13,
      description: "First album after LeRoi Moore's passing, featuring Funny the Way It Is",
    },
    {
      title: "Away From the World",
      year: 2012,
      trackCount: 13,
      description: "Reunion with producer Steve Lillywhite, featuring Mercy",
    },
    {
      title: "Come Tomorrow",
      year: 2018,
      trackCount: 10,
      description: "Debuted at No. 1, featuring Samurai Cop (Oh Joy Begin) and That Girl Is You",
    },
    {
      title: "Walk Around the Moon",
      year: 2024,
      trackCount: 12,
      description: "Latest studio album featuring Madman's Eyes and Walk Around the Moon",
    },
  ];

  const liveAlbums: Album[] = [
    {
      title: "Live at Red Rocks 8.15.95",
      year: 1997,
      trackCount: 14,
      description: "Iconic live album recorded at Red Rocks Amphitheatre",
    },
    {
      title: "Listener Supported",
      year: 1999,
      trackCount: 16,
      description: "Live album recorded during the Before These Crowded Streets tour",
    },
    {
      title: "Live at Folsom Field, Boulder, Colorado",
      year: 2002,
      trackCount: 19,
      description: "Double live album from 2001 performances",
    },
    {
      title: "The Central Park Concert",
      year: 2003,
      trackCount: 26,
      description: "Historic free concert in Central Park attended by over 100,000 fans",
    },
    {
      title: "Weekend on the Rocks",
      year: 2005,
      trackCount: 28,
      description: "4-disc set from 10th anniversary Red Rocks shows",
    },
    {
      title: "Live at Piedmont Park",
      year: 2007,
      trackCount: 23,
      description: "2-disc live album from Atlanta performance",
    },
    {
      title: "Live at Mile High Music Festival",
      year: 2008,
      trackCount: 20,
      description: "Live album from Colorado festival performance",
    },
    {
      title: "Live Trax Series",
      year: 2004,
      description: "Ongoing official bootleg series with 60+ volumes of complete shows",
    },
    {
      title: "DMB Live 25",
      year: 2016,
      trackCount: 25,
      description: "25th anniversary collection spanning the band's career",
    },
  ];

  const compilationAlbums: Album[] = [
    {
      title: "Recently",
      year: 1994,
      trackCount: 5,
      description: "EP featuring early versions of songs including Dancing Nancies",
    },
    {
      title: "Remember Two Things",
      year: 1993,
      trackCount: 8,
      description: "Independent debut album featuring Ants Marching and Satellite",
    },
    {
      title: "The Best of What's Around Vol. 1",
      year: 2006,
      trackCount: 17,
      description: "Greatest hits compilation",
    },
    {
      title: "The Gorge",
      year: 2004,
      trackCount: 37,
      description: "6-disc box set from the Gorge Amphitheatre",
    },
    {
      title: "Live in Chicago 12.19.98",
      year: 2001,
      trackCount: 20,
      description: "Live recording from United Center, Chicago",
    },
    {
      title: "The Lillywhite Sessions",
      year: 2001,
      description: "Unreleased album that leaked online, later reworked into Busted Stuff",
    },
  ];

  const totalAlbums = studioAlbums.length + liveAlbums.length + compilationAlbums.length;
</script>

<svelte:head>
  <title>Discography | DMB Almanac</title>
  <meta
    name="description"
    content="Complete Dave Matthews Band discography including studio albums, live albums, and compilations"
  />
</svelte:head>

<div class="container">
  <div class="header">
    <h1 class="title">Discography</h1>
    <p class="subtitle">{totalAlbums} releases spanning over 30 years of music</p>
  </div>

  <div class="quick-stats">
    <div class="stat">
      <span class="stat-value">{studioAlbums.length}</span>
      <span class="stat-label">Studio Albums</span>
    </div>
    <div class="stat">
      <span class="stat-value">{liveAlbums.length}</span>
      <span class="stat-label">Live Albums</span>
    </div>
    <div class="stat">
      <span class="stat-value">{compilationAlbums.length}</span>
      <span class="stat-label">Compilations</span>
    </div>
    <div class="stat">
      <span class="stat-value">60+</span>
      <span class="stat-label">Live Trax Volumes</span>
    </div>
  </div>

  <div class="sections">
    <!-- Studio Albums -->
    <section class="section" aria-labelledby="studio-albums-heading">
      <h2 class="section-title" id="studio-albums-heading">
        Studio Albums
        <span class="album-count">{studioAlbums.length} albums</span>
      </h2>
      <div class="album-grid">
        {#each studioAlbums as album (album.title + '-' + album.year)}
          <Card interactive class="album-card">
            <CardContent class="album-content">
              <div class="album-art" aria-hidden="true">
                <div class="album-art-placeholder">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4" />
                    <path d="M12 18v4" />
                    <path d="M2 12h4" />
                    <path d="M18 12h4" />
                  </svg>
                </div>
              </div>
              <div class="album-info">
                <h3 class="album-title">{album.title}</h3>
                <div class="album-meta">
                  <span class="album-year">{album.year}</span>
                  {#if album.trackCount}
                    <span class="separator" aria-hidden="true">|</span>
                    <span class="album-tracks">
                      {album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}
                    </span>
                  {/if}
                </div>
                {#if album.description}
                  <p class="album-description">{album.description}</p>
                {/if}
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>
    </section>

    <!-- Live Albums -->
    <section class="section" aria-labelledby="live-albums-heading">
      <h2 class="section-title" id="live-albums-heading">
        Live Albums
        <span class="album-count">{liveAlbums.length} albums</span>
      </h2>
      <div class="album-grid">
        {#each liveAlbums as album (album.title + '-' + album.year)}
          <Card interactive class="album-card">
            <CardContent class="album-content">
              <div class="album-art" aria-hidden="true">
                <div class="album-art-placeholder">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4" />
                    <path d="M12 18v4" />
                    <path d="M2 12h4" />
                    <path d="M18 12h4" />
                  </svg>
                </div>
              </div>
              <div class="album-info">
                <h3 class="album-title">{album.title}</h3>
                <div class="album-meta">
                  <span class="album-year">{album.year}</span>
                  {#if album.trackCount}
                    <span class="separator" aria-hidden="true">|</span>
                    <span class="album-tracks">
                      {album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}
                    </span>
                  {/if}
                </div>
                {#if album.description}
                  <p class="album-description">{album.description}</p>
                {/if}
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>
    </section>

    <!-- Compilations & EPs -->
    <section class="section" aria-labelledby="compilations-heading">
      <h2 class="section-title" id="compilations-heading">
        Compilations & EPs
        <span class="album-count">{compilationAlbums.length} albums</span>
      </h2>
      <div class="album-grid">
        {#each compilationAlbums as album (album.title + '-' + album.year)}
          <Card interactive class="album-card">
            <CardContent class="album-content">
              <div class="album-art" aria-hidden="true">
                <div class="album-art-placeholder">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4" />
                    <path d="M12 18v4" />
                    <path d="M2 12h4" />
                    <path d="M18 12h4" />
                  </svg>
                </div>
              </div>
              <div class="album-info">
                <h3 class="album-title">{album.title}</h3>
                <div class="album-meta">
                  <span class="album-year">{album.year}</span>
                  {#if album.trackCount}
                    <span class="separator" aria-hidden="true">|</span>
                    <span class="album-tracks">
                      {album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}
                    </span>
                  {/if}
                </div>
                {#if album.description}
                  <p class="album-description">{album.description}</p>
                {/if}
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>
    </section>
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

  /* Quick Stats */
  .quick-stats {
    display: flex;
    justify-content: center;
    gap: var(--space-8);
    padding: var(--space-6);
    background: var(--background-secondary);
    border-radius: var(--radius-xl);
    margin-bottom: var(--space-10);
    flex-wrap: wrap;
    container-type: inline-size;
    container-name: quickstats;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .stat-value {
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    color: var(--color-primary-500);
  }

  .stat-label {
    font-size: var(--text-sm);
    color: var(--foreground-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Sections */
  .sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    container-type: inline-size;
    container-name: section;
  }

  .section-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--foreground);
    padding-bottom: var(--space-2);
    border-bottom: 2px solid var(--color-primary-500);
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .album-count {
    font-size: var(--text-sm);
    font-weight: var(--font-normal);
    color: var(--foreground-muted);
  }

  /* Album Grid */
  .album-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-4);
  }

  /* Album Card */
  :global(.album-card) {
    height: 100%;
  }

  :global(.album-content) {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-4) !important;
  }

  /* Album Art Placeholder */
  .album-art {
    flex-shrink: 0;
    width: 100px;
    height: 100px;
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .album-art-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      var(--color-primary-100) 0%,
      var(--color-primary-200) 50%,
      var(--color-primary-100) 100%
    );
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary-600);
  }

  /* Album Info */
  .album-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .album-title {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    margin: 0;
    line-height: var(--leading-tight);
  }

  .album-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
  }

  .album-year {
    font-weight: var(--font-semibold);
    color: var(--color-primary-500);
  }

  .separator {
    color: var(--foreground-muted);
  }

  .album-tracks {
    color: var(--foreground-secondary);
  }

  .album-description {
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
    margin: var(--space-2) 0 0;
    line-height: var(--leading-relaxed);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: var(--space-4) var(--space-3);
    }

    .title {
      font-size: var(--text-3xl);
    }

    .quick-stats {
      gap: var(--space-4);
      padding: var(--space-4);
    }

    .stat-value {
      font-size: var(--text-2xl);
    }

    .album-grid {
      grid-template-columns: 1fr;
    }

    :global(.album-content) {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .album-art {
      width: 140px;
      height: 140px;
    }

    .album-info {
      align-items: center;
    }

    .album-meta {
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .section-title {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-1);
    }
  }

  /* Container Queries */
  @container quickstats (max-width: 400px) {
    .quick-stats {
      gap: var(--space-3);
      padding: var(--space-3);
    }

    .stat-value {
      font-size: var(--text-xl);
    }

    .stat-label {
      font-size: var(--text-xs);
    }
  }

  @container section (max-width: 500px) {
    .album-grid {
      grid-template-columns: 1fr;
    }
  }

  @container section (min-width: 501px) and (max-width: 800px) {
    .album-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Scroll-driven animations */
  @supports (animation-timeline: scroll()) {
    .section {
      animation: reveal-section linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 60%;
    }

    @keyframes reveal-section {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    :global(.album-card) {
      animation: reveal-card linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 80%;
    }

    @keyframes reveal-card {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  }

  /* Fallback for scroll animations */
  @supports not (animation-timeline: scroll()) {
    .section,
    :global(.album-card) {
      opacity: 1;
      transform: none;
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .album-art-placeholder {
      background: linear-gradient(
        135deg,
        oklch(0.70 0.19 82 / 0.15) 0%,
        oklch(0.70 0.19 82 / 0.25) 50%,
        oklch(0.70 0.19 82 / 0.15) 100%
      );
      color: var(--color-primary-400);
    }

    .quick-stats {
      background: var(--background-tertiary);
    }
  }

  /* Fallback for container queries */
  @supports not (container-type: inline-size) {
    /* Uses existing media queries as fallback */
  }
</style>
