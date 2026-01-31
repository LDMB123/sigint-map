<script lang="ts">
  /**
   * Complete Integration Example
   * Shows how to use all anchor positioning components and utilities
   * Location: INTEGRATION_EXAMPLE.svelte (this is an example file)
   */

  import { onMount } from 'svelte';
  import Tooltip from '$lib/components/anchored/Tooltip.svelte';
  import Dropdown from '$lib/components/anchored/Dropdown.svelte';
  import Popover from '$lib/components/anchored/Popover.svelte';
  import { anchor, anchoredTo } from '$lib/actions/anchor';
  import {
    checkAnchorSupport,
    getAnchorSupportInfo,
  } from '$lib/utils/anchorPositioning';

  // State
  let supportInfo = $state<ReturnType<typeof getAnchorSupportInfo> | null>(null);
  let selectedShow = $state<any | null>(null);

  // Check support on mount
  onMount(() => {
    supportInfo = getAnchorSupportInfo();
  });

  // Menu items for dropdown
  const showActions = [
    {
      id: 'details',
      label: 'View Details',
      action: () => {
        console.log('View details clicked');
      },
    },
    {
      id: 'setlist',
      label: 'View Setlist',
      action: () => {
        console.log('View setlist clicked');
      },
    },
    {
      id: 'stats',
      label: 'Statistics',
      action: () => {
        console.log('Stats clicked');
      },
    },
    {
      id: 'archive',
      label: 'Archive',
      disabled: true,
      action: () => {},
    },
  ];

  const venueActions = [
    {
      id: 'map',
      label: 'View on Map',
      action: () => {
        console.log('Map clicked');
      },
    },
    {
      id: 'history',
      label: 'Venue History',
      action: () => {
        console.log('History clicked');
      },
    },
  ];
</script>

<!-- Main Content -->
<div class="integration-example">
  <!-- Feature Detection Banner -->
  {#if supportInfo}
    <div class="support-info">
      <h3>CSS Anchor Positioning Support</h3>
      <pre><code>{JSON.stringify(supportInfo, null, 2)}</code></pre>

      {#if supportInfo.supported}
        <p class="status-success">
          ✅ CSS Anchor Positioning supported - using native browser feature
        </p>
      {:else}
        <p class="status-warning">
          ⚠️ Anchor positioning not supported - using fallback positioning
        </p>
      {/if}
    </div>
  {/if}

  <!-- Section 1: Tooltips -->
  <section class="demo-section">
    <h2>Tooltips Examples</h2>
    <p>Hover over the elements to see tooltips appear</p>

    <div class="demo-grid">
      <!-- Bottom tooltip (default) -->
      <Tooltip content="Save your changes" position="bottom">
        <button class="demo-button">💾 Save</button>
      </Tooltip>

      <!-- Top tooltip -->
      <Tooltip content="Information icon" position="top" offset={12}>
        <span class="info-icon">ℹ️</span>
      </Tooltip>

      <!-- Right tooltip -->
      <Tooltip content="Delete this item" position="right">
        <button class="demo-button danger">🗑️ Delete</button>
      </Tooltip>

      <!-- Left tooltip -->
      <Tooltip content="Edit content" position="left">
        <button class="demo-button">✏️ Edit</button>
      </Tooltip>
    </div>
  </section>

  <!-- Section 2: Dropdowns -->
  <section class="demo-section">
    <h2>Dropdown Menus</h2>
    <p>Click the buttons to open dropdown menus</p>

    <div class="demo-grid">
      <!-- Show actions dropdown -->
      <div>
        <h4>Show Actions</h4>
        <Dropdown
          items={showActions}
          position="bottom"
          id="show-menu"
          onSelect={(item) => {
            console.log('Selected:', item.label);
            selectedShow = item;
          }}
        >
          <span slot="trigger">⋮ Actions</span>
        </Dropdown>
        {#if selectedShow}
          <p class="selection">Selected: {selectedShow.label}</p>
        {/if}
      </div>

      <!-- Venue actions dropdown -->
      <div>
        <h4>Venue Actions</h4>
        <Dropdown
          items={venueActions}
          position="bottom"
          id="venue-menu"
          onSelect={(item) => {
            console.log('Selected:', item.label);
          }}
        >
          <span slot="trigger">⋮ More</span>
        </Dropdown>
      </div>
    </div>
  </section>

  <!-- Section 3: Popovers -->
  <section class="demo-section">
    <h2>Popovers</h2>
    <p>Click to open popovers with more information</p>

    <div class="demo-grid">
      <!-- About DMB -->
      <Popover title="About DMB Almanac" position="right">
        <span slot="trigger">ℹ️ About</span>

        <div class="popover-content">
          <p>The most comprehensive Dave Matthews Band concert database ever created.</p>
          <ul>
            <li>Thousands of shows</li>
            <li>Complete setlists</li>
            <li>Venue information</li>
            <li>Guest appearances</li>
          </ul>
        </div>
      </Popover>

      <!-- Venue Information -->
      <Popover title="Venue Information" position="right">
        <span slot="trigger">📍 Venue Info</span>

        <div class="popover-content">
          <h4>Madison Square Garden</h4>
          <p>New York, NY</p>
          <p><strong>Capacity:</strong> 20,000</p>
          <p><strong>Shows:</strong> 15</p>
          <p><strong>Last Show:</strong> 2023-12-15</p>
        </div>
      </Popover>

      <!-- Song Details -->
      <Popover title="Song Statistics" position="right">
        <span slot="trigger">🎵 Stats</span>

        <div class="popover-content">
          <h4>All Along the Watchtower</h4>
          <p><strong>Times Played:</strong> 847</p>
          <p><strong>Last Played:</strong> 2024-08-10</p>
          <p><strong>Rarity Score:</strong> 45/100</p>
          <p><strong>Average Gap:</strong> 12.4 shows</p>
        </div>
      </Popover>
    </div>
  </section>

  <!-- Section 4: Svelte Actions -->
  <section class="demo-section">
    <h2>Using Svelte Actions Directly</h2>
    <p>For custom positioning needs</p>

    <div class="actions-demo">
      <!-- Anchor definition -->
      <button
        use:anchor={{ name: 'custom-anchor' }}
        class="demo-button"
      >
        Custom Anchor
      </button>

      <!-- Positioned element using action -->
      <div
        use:anchoredTo={{
          anchor: 'custom-anchor',
          position: 'bottom',
          offset: 10,
        }}
        class="custom-positioned"
      >
        <p>This element is positioned using the anchor action!</p>
        <p>It automatically positions below the button with 10px offset.</p>
      </div>
    </div>
  </section>

  <!-- Section 5: CSS Classes -->
  <section class="demo-section">
    <h2>Using CSS Classes</h2>
    <p>For simple positioning with CSS</p>

    <div class="css-demo">
      <button class="anchor">Trigger Button</button>
      <div class="anchored-bottom">
        <p>Positioned with .anchored-bottom CSS class</p>
      </div>
    </div>
  </section>

  <!-- Section 6: Documentation Links -->
  <section class="demo-section">
    <h2>Documentation</h2>
    <div class="docs-links">
      <a href="./ANCHOR_POSITIONING_QUICKSTART.md" target="_blank" class="doc-link">
        📚 Quick Start Guide
      </a>
      <a href="./ANCHOR_POSITIONING_README.md" target="_blank" class="doc-link">
        📖 Complete Documentation
      </a>
      <a href="./src/lib/components/anchored/EXAMPLES.md" target="_blank" class="doc-link">
        💡 Component Examples
      </a>
    </div>
  </section>
</div>

<style>
  .integration-example {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .support-info {
    margin-bottom: 2rem;
    padding: 1rem;
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
  }

  .support-info h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .support-info pre {
    overflow-x: auto;
    background: var(--background);
    padding: 1rem;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
  }

  .status-success {
    color: var(--color-success);
    font-weight: var(--font-medium);
  }

  .status-warning {
    color: var(--color-warning);
    font-weight: var(--font-medium);
  }

  .demo-section {
    margin-bottom: 3rem;
  }

  .demo-section h2 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
  }

  .demo-section > p {
    color: var(--foreground-secondary);
    margin-bottom: 1.5rem;
  }

  .demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    padding: 1.5rem;
    background: var(--background-secondary);
    border-radius: var(--radius-lg);
  }

  .demo-button {
    padding: 0.75rem 1rem;
    background: var(--color-primary-600);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: var(--font-medium);
    transition: background-color var(--transition-fast);
    position: relative;
  }

  .demo-button:hover {
    background: var(--color-primary-700);
  }

  .demo-button.danger {
    background: var(--color-error);
  }

  .demo-button.danger:hover {
    background: var(--color-error-bg);
  }

  .info-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--background);
    border-radius: 50%;
    cursor: help;
    font-size: 1.25rem;
  }

  .demo-grid h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .selection {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--color-success-bg);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    color: var(--color-success);
  }

  .popover-content {
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .popover-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
  }

  .popover-content p {
    margin: 0.25rem 0;
  }

  .popover-content ul {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
  }

  .popover-content li {
    margin: 0.25rem 0;
  }

  .actions-demo {
    position: relative;
    padding: 2rem 1.5rem;
    background: var(--background-secondary);
    border-radius: var(--radius-lg);
    min-height: 200px;
  }

  .custom-positioned {
    padding: 1rem;
    background: var(--color-info-bg);
    border: 1px solid var(--color-info);
    border-radius: var(--radius-md);
    color: var(--foreground);
    max-width: 300px;
  }

  .custom-positioned p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
  }

  .css-demo {
    position: relative;
    padding: 2rem 1.5rem;
    background: var(--background-secondary);
    border-radius: var(--radius-lg);
    min-height: 200px;
  }

  .anchor {
    padding: 0.75rem 1rem;
    background: var(--color-primary-600);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: var(--font-medium);
  }

  .anchor:hover {
    background: var(--color-primary-700);
  }

  .anchored-bottom {
    padding: 1rem;
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--foreground);
    max-width: 300px;
  }

  .docs-links {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .doc-link {
    padding: 0.75rem 1.5rem;
    background: var(--color-primary-600);
    color: white;
    border-radius: var(--radius-md);
    text-decoration: none;
    font-weight: var(--font-medium);
    transition: background-color var(--transition-fast);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .doc-link:hover {
    background: var(--color-primary-700);
  }
</style>
