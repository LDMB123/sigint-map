<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import CardContent from '$lib/components/ui/CardContent.svelte';

  interface FAQItem {
    question: string;
    answer: string | string[];
  }

  const faqs: FAQItem[] = [
    {
      question: "How is the data collected?",
      answer: [
        "The data in DMB Almanac is sourced from DMBAlmanac.com, a fan-maintained database that has been documenting Dave Matthews Band shows for over two decades.",
        "Show information is compiled from multiple sources including fan reports, official recordings, venue records, and community verification. The DMBAlmanac.com community works together to confirm and update setlist information.",
      ],
    },
    {
      question: "How accurate is the data?",
      answer: [
        "The data is highly accurate for most shows, especially those from 2000 onwards when setlist documentation became more systematic. Earlier shows from the 1990s may have occasional gaps or uncertainties.",
        "Setlists are typically verified by multiple attendees and cross-referenced with recordings when available. However, as with any historical database, some errors may exist. If you notice an inaccuracy, the best way to report it is through DMBAlmanac.com directly.",
      ],
    },
    {
      question: "Can I contribute to the database?",
      answer: [
        "This application pulls its data from DMBAlmanac.com, so contributions should be made there. The DMBAlmanac.com community welcomes contributions from fans who attended shows and can verify setlist information.",
        "If you have information about a show - whether it's confirming a setlist, providing additional details about guest appearances, or correcting an error - visit DMBAlmanac.com to share your knowledge with the community.",
      ],
    },
    {
      question: "Why are some setlists marked as unknown?",
      answer: [
        "Some shows, particularly from the early years of DMB (1991-1994), have incomplete or unknown setlists. This can happen for several reasons:",
        "The show predates systematic setlist documentation. No recordings or fan reports have surfaced. The show was a private event with limited attendance. Historical records have been lost over time.",
        "The community continually works to fill in these gaps as new information emerges, so unknown setlists may be updated over time.",
      ],
    },
    {
      question: "What do the Liberation List numbers mean?",
      answer: [
        "The Liberation List tracks songs that haven't been played for an extended period. The numbers represent:",
        "Days: The number of days since the song was last performed. Shows: The number of DMB shows that have occurred since the song was last played. Rank: Songs are ranked by how long they've been absent, with the longest gaps at the top.",
        "When a song on the Liberation List finally gets played again, fans celebrate its 'liberation' - a triumphant return to the setlist. Some songs have been 'liberated' after gaps of over 1,000 shows!",
      ],
    },
    {
      question: "What is a 'bustout'?",
      answer: [
        "A 'bustout' refers to a song that returns to the setlist after an extended absence. While there's no official threshold, fans typically consider a song a bustout if it hasn't been played for 50+ shows or a year or more.",
        "Bustouts are celebrated moments at concerts, often generating huge crowd reactions when the opening notes reveal a long-awaited song returning to rotation.",
      ],
    },
    {
      question: "How often is the data updated?",
      answer:
        "This application's data is periodically synced with DMBAlmanac.com. During tour season, updates may be more frequent to capture new shows. The last sync date can be found in the footer of the application.",
    },
    {
      question: "Can I use this app offline?",
      answer: [
        "Yes! DMB Almanac is a Progressive Web App (PWA), which means you can install it on your device and access core features offline.",
        "To install: On desktop Chrome, click the install icon in the address bar. On mobile, use 'Add to Home Screen' from your browser menu. Once installed, you can browse shows, songs, and statistics without an internet connection.",
      ],
    },
    {
      question: "Is this affiliated with Dave Matthews Band?",
      answer:
        "No, this is an independent fan project and is not affiliated with Dave Matthews Band, their management, record labels, or DMBAlmanac.com. It was built as an educational project to explore modern web development technologies while celebrating DMB's touring history.",
    },
  ];
</script>

<svelte:head>
  <title>FAQ | DMB Almanac</title>
  <meta
    name="description"
    content="Frequently asked questions about DMB Almanac - answers about data collection, accuracy, and more"
  />
</svelte:head>

<div class="container">
  <header class="header">
    <h1 class="title">Frequently Asked Questions</h1>
    <p class="subtitle">Common questions about DMB Almanac and its data</p>
  </header>

  <div class="content">
    {#each faqs as faq, _index}
      <details class="faq-item" name="faq">
        <summary class="question">
          <span class="question-text">{faq.question}</span>
          <span class="chevron" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              role="img"
              aria-label="Toggle answer"
            >
              <title>Toggle answer</title>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>
        <div class="answer">
          {#if Array.isArray(faq.answer)}
            {#each faq.answer as paragraph}
              <p class="answer-text">{paragraph}</p>
            {/each}
          {:else}
            <p class="answer-text">{faq.answer}</p>
          {/if}
        </div>
      </details>
    {/each}
  </div>

  <Card class="more-questions">
    <CardContent class="more-questions-content">
      <h2 class="more-questions-title">Have more questions?</h2>
      <p class="more-questions-text">
        For questions about specific shows or setlist data, visit{' '}
        <a
          href="https://www.dmbalmanac.com"
          target="_blank"
          rel="noopener noreferrer"
          class="link"
        >
          DMBAlmanac.com
        </a>
        . For questions about this application, see the{' '}
        <a href="/contact" class="link">
          Contact page
        </a>
        .
      </p>
    </CardContent>
  </Card>
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
    gap: var(--space-4);
    max-width: 800px;
    margin: 0 auto var(--space-8);
  }

  /* FAQ Accordion Item */
  .faq-item {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    background: var(--card-bg);
    overflow: hidden;
    transition: border-color var(--transition-fast);
  }

  .faq-item + .faq-item {
    margin-top: var(--space-4);
  }

  .faq-item[open] {
    border-color: var(--color-primary-400);
  }

  /* Question (Summary) - the clickable header */
  .question {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-5);
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: background-color var(--transition-fast);
  }

  /* Remove default marker in WebKit/Blink */
  .question::-webkit-details-marker {
    display: none;
  }

  .question:hover {
    background-color: var(--background-secondary);
  }

  .question:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: -2px;
  }

  .question-text {
    flex: 1;
  }

  /* Chevron icon rotation */
  .chevron {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    color: var(--foreground-secondary);
    transition: transform var(--transition-fast);
  }

  .chevron svg {
    width: 100%;
    height: 100%;
  }

  .faq-item[open] .chevron {
    transform: rotate(180deg);
  }

  /* Answer content with animation */
  .answer {
    padding: 0 var(--space-5) var(--space-5);
    color: var(--foreground-secondary);
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .answer-text {
    margin: 0;
    line-height: 1.6;
  }

  .answer-text + .answer-text {
    margin-top: var(--space-3);
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

  /* More Questions */
  :global(.more-questions) {
    max-width: 800px;
    margin: 0 auto;
    background: linear-gradient(
      135deg,
      color-mix(in oklch, var(--color-primary-50) 80%, var(--background)),
      var(--background)
    );
    text-align: center;
  }

  :global(.more-questions-content) {
    padding: var(--space-6) !important;
  }

  .more-questions-title {
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
    color: var(--foreground);
    margin: 0 0 var(--space-3);
  }

  .more-questions-text {
    font-size: var(--text-base);
    color: var(--foreground-secondary);
    line-height: 1.6;
    margin: 0;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .answer {
      animation: none;
    }

    .chevron {
      transition: none;
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: var(--space-4) var(--space-3);
    }

    .title {
      font-size: var(--text-3xl);
    }

    .question {
      font-size: var(--text-base);
      padding: var(--space-4);
    }

    .answer {
      padding: 0 var(--space-4) var(--space-4);
    }

    .answer-text {
      font-size: var(--text-sm);
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .faq-item[open] {
      border-color: var(--color-primary-500);
    }

    :global(.more-questions) {
      background: linear-gradient(
        135deg,
        oklch(0.70 0.19 82 / 0.1),
        var(--background)
      );
    }

    .link {
      color: var(--color-primary-400);
    }

    .link:hover {
      color: var(--color-primary-300);
    }
  }
</style>
