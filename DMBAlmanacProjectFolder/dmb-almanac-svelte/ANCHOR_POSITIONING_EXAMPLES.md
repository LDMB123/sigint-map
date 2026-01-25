# CSS Anchor Positioning - Usage Examples

## Tooltip Examples

### Basic Tooltip with Bottom Position

```svelte
<script>
  import Tooltip from '$lib/components/anchored/Tooltip.svelte';
</script>

<Tooltip
  id="info-btn"
  content="Click to learn more"
  position="bottom"
>
  <button>Info</button>
</Tooltip>
```

**Result**: Tooltip appears below the button, automatically flips to top if no space.

---

### Tooltip with Custom Offset

```svelte
<Tooltip
  id="help-icon"
  content="Help and information about this feature"
  position="right"
  offset={16}
>
  <button>?</button>
</Tooltip>
```

**Result**: Tooltip on the right side with 16px gap.

---

### Tooltip with Icon Trigger

```svelte
<Tooltip
  id="icon-tooltip"
  content="Upload a file"
  position="top"
>
  <svg class="icon" viewBox="0 0 24 24">
    <use href="#upload-icon" />
  </svg>
</Tooltip>

<style>
  .icon {
    cursor: pointer;
    width: 24px;
    height: 24px;
  }
</style>
```

---

## Dropdown Menu Examples

### Basic Dropdown Menu

```svelte
<script>
  import Dropdown from '$lib/components/anchored/Dropdown.svelte';

  const actions = [
    { id: '1', label: 'View Details' },
    { id: '2', label: 'Edit' },
    { id: '3', label: 'Delete' },
  ];

  function handleAction(item) {
    console.log('Action selected:', item.label);
  }
</script>

<Dropdown
  id="row-actions"
  items={actions}
  onSelect={handleAction}
>
  <button>Actions ▼</button>
</Dropdown>
```

**Features**:
- Click trigger to open/close
- Arrow keys navigate
- Home/End jump to first/last
- Enter/Space activates item
- Escape closes menu

---

### Dropdown with Icons

```svelte
<script>
  import Dropdown from '$lib/components/anchored/Dropdown.svelte';

  const menuItems = [
    { id: 'profile', label: 'Profile Settings' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'help', label: 'Help & Support' },
    { id: 'logout', label: 'Sign Out' },
  ];

  function handleMenuSelect(item) {
    switch (item.id) {
      case 'profile':
        window.location.href = '/settings/profile';
        break;
      case 'logout':
        handleLogout();
        break;
    }
  }
</script>

<Dropdown
  id="user-menu"
  items={menuItems}
  onSelect={handleMenuSelect}
>
  <div class="user-button">
    <img src={userAvatar} alt="User" />
    <span>{userName}</span>
    <svg class="dropdown-icon" viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </div>
</Dropdown>

<style>
  .user-button {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  img {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }

  .dropdown-icon {
    width: 20px;
    height: 20px;
    transition: transform 0.2s;
  }
</style>
```

---

### Dropdown Menu with Disabled Items

```svelte
<script>
  import Dropdown from '$lib/components/anchored/Dropdown.svelte';

  const items = [
    { id: 'copy', label: 'Copy', disabled: false },
    { id: 'paste', label: 'Paste', disabled: !canPaste },
    { id: 'duplicate', label: 'Duplicate', disabled: false },
    { id: 'delete', label: 'Delete', disabled: false },
  ];
</script>

<Dropdown
  id="edit-menu"
  items={items}
>
  <button>Edit</button>
</Dropdown>
```

---

### Dropdown at Top of Trigger

```svelte
<Dropdown
  id="sort-menu"
  items={sortOptions}
  position="top"
  onSelect={(item) => (sortBy = item.id)}
>
  <button>Sort by: {sortLabel}</button>
</Dropdown>
```

---

## Popover Examples

### Basic Popover with Content

```svelte
<script>
  import Popover from '$lib/components/anchored/Popover.svelte';

  let showDetails = false;
</script>

<Popover
  id="product-info"
  title="Product Details"
  show={showDetails}
  onClose={() => (showDetails = false)}
  position="bottom"
>
  <button onclick={() => (showDetails = true)}>More Info</button>

  <div class="popover-details">
    <p>High-quality Swiss watchmaking with precision engineering.</p>
    <ul>
      <li>Water-resistant to 100m</li>
      <li>Sapphire crystal</li>
      <li>Automatic movement</li>
    </ul>
    <p><strong>Price:</strong> $999.99</p>
  </div>
</Popover>

<style>
  .popover-details {
    font-size: 14px;
    line-height: 1.6;
  }

  ul {
    margin: 12px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }
</style>
```

---

### Popover with Form

```svelte
<script>
  import Popover from '$lib/components/anchored/Popover.svelte';

  let showFilter = false;
  let filters = {
    category: '',
    priceMin: 0,
    priceMax: 1000,
  };

  function applyFilters() {
    console.log('Filters applied:', filters);
    showFilter = false;
  }
</script>

<Popover
  id="filter-popover"
  title="Filter Results"
  show={showFilter}
  onClose={() => (showFilter = false)}
  position="right"
>
  <button onclick={() => (showFilter = true)}>
    <svg viewBox="0 0 24 24">
      <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.5a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
    </svg>
    Filters
  </button>

  <div class="filter-form">
    <div class="form-group">
      <label for="category">Category</label>
      <select id="category" bind:value={filters.category}>
        <option value="">All</option>
        <option value="watches">Watches</option>
        <option value="jewelry">Jewelry</option>
      </select>
    </div>

    <div class="form-group">
      <label for="price-min">Min Price</label>
      <input
        id="price-min"
        type="number"
        bind:value={filters.priceMin}
        min="0"
      />
    </div>

    <div class="form-group">
      <label for="price-max">Max Price</label>
      <input
        id="price-max"
        type="number"
        bind:value={filters.priceMax}
        max="10000"
      />
    </div>

    <div class="form-actions">
      <button class="btn-primary" onclick={applyFilters}>
        Apply Filters
      </button>
      <button class="btn-secondary" onclick={() => (showFilter = false)}>
        Cancel
      </button>
    </div>
  </div>
</Popover>

<style>
  .filter-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  label {
    font-size: 14px;
    font-weight: 500;
  }

  select,
  input {
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 14px;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .btn-primary,
  .btn-secondary {
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .btn-primary {
    background: var(--color-primary-600);
    color: white;
  }

  .btn-secondary {
    background: var(--background-secondary);
    color: var(--foreground);
  }
</style>
```

---

### Popover on All Sides

```svelte
<script>
  import Popover from '$lib/components/anchored/Popover.svelte';

  let activePopover = null;
</script>

<div class="demo-grid">
  <Popover
    id="popover-top"
    title="Top Position"
    position="top"
    show={activePopover === 'top'}
    onClose={() => (activePopover = null)}
  >
    <button onclick={() => (activePopover = 'top')}>Top</button>
    <p>This popover opens above the button.</p>
  </Popover>

  <Popover
    id="popover-bottom"
    title="Bottom Position"
    position="bottom"
    show={activePopover === 'bottom'}
    onClose={() => (activePopover = null)}
  >
    <button onclick={() => (activePopover = 'bottom')}>Bottom</button>
    <p>This popover opens below the button.</p>
  </Popover>

  <Popover
    id="popover-left"
    title="Left Position"
    position="left"
    show={activePopover === 'left'}
    onClose={() => (activePopover = null)}
  >
    <button onclick={() => (activePopover = 'left')}>Left</button>
    <p>This popover opens to the left of the button.</p>
  </Popover>

  <Popover
    id="popover-right"
    title="Right Position"
    position="right"
    show={activePopover === 'right'}
    onClose={() => (activePopover = null)}
  >
    <button onclick={() => (activePopover = 'right')}>Right</button>
    <p>This popover opens to the right of the button.</p>
  </Popover>
</div>

<style>
  .demo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
    padding: 64px;
  }
</style>
```

---

## Advanced Examples

### Tooltip with Custom Styling

```svelte
<script>
  import Tooltip from '$lib/components/anchored/Tooltip.svelte';
</script>

<Tooltip
  id="styled-tooltip"
  content="Custom styled tooltip"
  position="bottom"
>
  <button class="custom-trigger">Hover me</button>
</Tooltip>

<style>
  :global(.tooltip-content) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: 1px solid rgba(255, 255, 255, 0.3);
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  :global(.tooltip-arrow) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .custom-trigger {
    background: #667eea;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }

  .custom-trigger:hover {
    background: #764ba2;
  }
</style>
```

---

### Chained Tooltips in Data Table

```svelte
<script>
  import Tooltip from '$lib/components/anchored/Tooltip.svelte';

  const users = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
    { id: 3, name: 'Carol White', email: 'carol@example.com' },
  ];
</script>

<table class="user-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {#each users as user (user.id)}
      <tr>
        <td>{user.name}</td>
        <td>
          <Tooltip id={`email-${user.id}`} content={user.email} position="top">
            <span class="email-link">{user.email}</span>
          </Tooltip>
        </td>
        <td>
          <Tooltip
            id={`edit-${user.id}`}
            content="Edit user profile"
            position="left"
          >
            <button class="action-btn">Edit</button>
          </Tooltip>
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .user-table {
    width: 100%;
    border-collapse: collapse;
  }

  .user-table th,
  .user-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  .email-link {
    color: var(--color-primary-600);
    cursor: help;
    text-decoration: underline;
  }

  .action-btn {
    padding: 4px 8px;
    background: var(--color-primary-600);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
</style>
```

---

### Context Menu with Dropdown

```svelte
<script>
  import Dropdown from '$lib/components/anchored/Dropdown.svelte';

  let contextMenu = null;
  let selectedItem = null;

  const contextActions = [
    { id: 'open', label: 'Open' },
    { id: 'edit', label: 'Edit' },
    { id: 'share', label: 'Share' },
    { id: 'delete', label: 'Delete' },
  ];

  function handleContextMenu(item, event) {
    selectedItem = item;
    contextMenu = `context-${item.id}`;
  }

  function handleAction(action) {
    console.log(`${action.label} clicked for:`, selectedItem);
  }
</script>

<div class="file-list">
  {#each files as file (file.id)}
    <div
      class="file-item"
      oncontextmenu={(e) => {
        e.preventDefault();
        handleContextMenu(file, e);
      }}
    >
      <span class="file-icon">{file.type === 'folder' ? '📁' : '📄'}</span>
      <span class="file-name">{file.name}</span>

      {#if selectedItem?.id === file.id && contextMenu}
        <Dropdown
          id={contextMenu}
          items={contextActions}
          onSelect={handleAction}
          position="bottom"
        >
          <div style="display: none;"></div>
        </Dropdown>
      {/if}
    </div>
  {/each}
</div>

<style>
  .file-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    position: relative;
  }

  .file-item:hover {
    background: var(--background-secondary);
  }

  .file-icon {
    font-size: 20px;
  }

  .file-name {
    flex: 1;
  }
</style>
```

---

## Responsive Behavior Examples

### Mobile-Friendly Tooltip

```svelte
<script>
  import Tooltip from '$lib/components/anchored/Tooltip.svelte';
</script>

<Tooltip
  id="mobile-tooltip"
  content="Information"
  position="bottom"
  offset={8}
>
  <button class="info-btn">?</button>
</Tooltip>

<style>
  .info-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: var(--color-primary-600);
    color: white;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* On mobile, adjust tooltip offset */
  @media (max-width: 768px) {
    :global(.tooltip-content) {
      max-width: calc(100vw - 32px);
      white-space: normal;
    }
  }
</style>
```

---

## Integration with Data Updates

### Dropdown that Updates Dynamically

```svelte
<script>
  import Dropdown from '$lib/components/anchored/Dropdown.svelte';

  let items = [];
  let loading = false;

  async function loadItems() {
    loading = true;
    const response = await fetch('/api/items');
    items = await response.json();
    loading = false;
  }

  onMount(() => {
    loadItems();
  });
</script>

<Dropdown
  id="dynamic-menu"
  items={items}
  onSelect={(item) => console.log('Selected:', item.label)}
>
  <button>
    {#if loading}
      Loading...
    {:else}
      Select Item
    {/if}
  </button>
</Dropdown>
```

---

These examples demonstrate the flexibility and power of CSS anchor positioning for creating user interface components that automatically adapt to available space while maintaining accessibility and responsive behavior.
