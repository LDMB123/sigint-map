<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    title: string;
    description?: string;
    icon?: string;
    iconSnippet?: Snippet;
    action?: Snippet;
    class?: string;
  };

  let {
    title,
    description,
    icon,
    iconSnippet,
    action,
    class: className = ''
  }: Props = $props();
</script>

<div class="empty-state {className}" role="status">
  {#if icon || iconSnippet}
    <div class="icon" aria-hidden="true">
      {#if iconSnippet}
        {@render iconSnippet()}
      {:else if icon}
        <span class="icon-emoji">{icon}</span>
      {/if}
    </div>
  {/if}

  <div class="content">
    <h2 class="title">{title}</h2>
    {#if description}
      <p class="description">{description}</p>
    {/if}
  </div>

  {#if action}
    <div class="actions">
      {@render action()}
    </div>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    place-items: center;
    gap: var(--space-6);
    padding: var(--space-12) var(--space-4);
    text-align: center;
    min-height: 320px;

    /* Subtle animation on mount */
    animation: fadeIn var(--transition-slow) var(--ease-out-expo);

    /* Container query context */
    container: empty-state / inline-size;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Icon container */
  .icon {
    display: flex;
    place-items: center;
    width: 80px;
    height: 80px;
    background: linear-gradient(
      to bottom,
      var(--background-secondary),
      var(--background-tertiary)
    );
    border-radius: var(--radius-full);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
  }

  .icon-emoji {
    font-size: var(--text-4xl);
    line-height: 1;
  }

  .icon :global(svg) {
    width: 40px;
    height: 40px;
    color: var(--foreground-muted);
  }

  /* Content */
  .content {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 500px;
  }

  .title {
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    margin: 0;
    line-height: var(--leading-tight);
  }

  .description {
    font-size: var(--text-base);
    color: var(--foreground-secondary);
    margin: 0;
    line-height: var(--leading-relaxed);
  }

  /* Actions */
  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    align-items: center;
    margin-top: var(--space-2);
  }

  .actions :global(button),
  .actions :global(a) {
    min-width: 200px;
  }

  /* Container query for component-level responsive design */
  @container empty-state (max-width: 400px) {
    .empty-state {
      padding: var(--space-8) var(--space-4);
      min-height: 280px;
    }

    .icon {
      width: 64px;
      height: 64px;
    }

    .icon-emoji {
      font-size: var(--text-3xl);
    }

    .icon :global(svg) {
      width: 32px;
      height: 32px;
    }

    .title {
      font-size: var(--text-xl);
    }

    .description {
      font-size: var(--text-sm);
    }
  }

  /* Fallback for browsers without container queries */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .empty-state {
        padding: var(--space-8) var(--space-4);
        min-height: 280px;
      }

      .icon {
        width: 64px;
        height: 64px;
      }

      .icon-emoji {
        font-size: var(--text-3xl);
      }

      .icon :global(svg) {
        width: 32px;
        height: 32px;
      }

      .title {
        font-size: var(--text-xl);
      }

      .description {
        font-size: var(--text-sm);
      }
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .icon {
      background: linear-gradient(
        to bottom,
        var(--color-gray-800),
        var(--color-gray-900)
      );
      border-color: var(--color-gray-700);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .empty-state {
      animation: none;
    }
  }
</style>
