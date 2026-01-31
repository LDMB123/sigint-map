# SvelteKit Component Migration Reference

## Native Dialog Migration
Replace custom modal components with `<dialog>`:
```svelte
<dialog bind:this={dialogEl}>
  <form method="dialog">
    <h2>Title</h2>
    <p>Content</p>
    <button value="cancel">Cancel</button>
    <button value="confirm">Confirm</button>
  </form>
</dialog>
```
Benefits: Built-in focus trap, Escape to close, backdrop support

## Native Details Migration
Replace custom accordion with `<details>`:
```svelte
<details>
  <summary>Section Title</summary>
  <div class="content">Expandable content</div>
</details>
```
Benefits: Built-in toggle, keyboard accessible, no JS needed

## JS-to-Native Mapping
| JS Widget | Native Element | Notes |
|-----------|---------------|-------|
| Custom modal | `<dialog>` | Use `.showModal()` for modal |
| Custom accordion | `<details>` | Use `<summary>` for trigger |
| Custom tooltip | `[popover]` | Chromium 114+ |
| Custom select | `<select>` | Or `<datalist>` for suggestions |
| Custom toggle | `<input type="checkbox">` | Style with appearance: none |

## ESLint Baseline Audit
- Run `npx eslint . --format json > baseline.json`
- Compare against previous baseline
- Zero new warnings policy
- Gradual reduction of existing warnings
