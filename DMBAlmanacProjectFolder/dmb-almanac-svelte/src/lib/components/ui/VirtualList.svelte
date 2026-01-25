<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	// ==================== TYPES ====================

	interface VirtualListProps<T> {
		items: T[];
		itemHeight: number | ((item: T, index: number) => number);
		overscan?: number;
		estimateSize?: number;
		class?: string;
		role?: string;
		'aria-label'?: string;
		children: Snippet<[{ item: T; index: number; style: string }]>;
	}

	// ==================== PROPS ====================

	let {
		items,
		itemHeight,
		overscan = 3,
		estimateSize = 100,
		class: className = '',
		role = 'list',
		'aria-label': ariaLabel,
		children
	}: VirtualListProps<T> = $props();

	// ==================== STATE ====================

	let scrollContainer = $state<HTMLDivElement | null>(null);
	let scrollTop = $state(0);
	let containerHeight = $state(0);
	let isInitialized = $state(false);

	// Cache for measured heights when using dynamic heights
	// Using a version counter instead of Map recreation to avoid full re-renders
	let heightCache = $state<Map<number, number>>(new Map());
	let heightCacheVersion = $state(0);

	// Prefix sum cache for O(1) offset lookups (instead of O(n) iteration)
	let offsetCache = $state<number[]>([]);

	// ==================== DERIVED CALCULATIONS ====================

	/**
	 * Get item height - either from function or fixed value
	 */
	function getItemHeight(item: T, index: number): number {
		if (typeof itemHeight === 'function') {
			// Check cache first for dynamic heights
			const cached = heightCache.get(index);
			if (cached !== undefined) {
				return cached;
			}
			// Calculate and cache
			const height = itemHeight(item, index);
			heightCache.set(index, height);
			return height;
		}
		return itemHeight;
	}

	/**
	 * Rebuild prefix sum cache when heights change
	 * This runs once when heightCacheVersion changes, making all subsequent
	 * getItemOffset calls O(1) instead of O(n)
	 * Using version counter avoids Map recreation overhead
	 */
	$effect(() => {
		// Subscribe to version changes to trigger rebuild
		const _version = heightCacheVersion;
		if (typeof itemHeight === 'function' && items.length > 0) {
			// Rebuild prefix sum cache
			const newOffsetCache: number[] = new Array(items.length + 1);
			newOffsetCache[0] = 0;
			for (let i = 0; i < items.length; i++) {
				newOffsetCache[i + 1] = newOffsetCache[i] + (heightCache.get(i) ?? estimateSize);
			}
			offsetCache = newOffsetCache;
		}
	});

	/**
	 * Calculate total height of all items
	 */
	const totalHeight = $derived.by(() => {
		if (typeof itemHeight === 'number') {
			return items.length * itemHeight;
		}
		// Use prefix sum cache - total is the last element
		return offsetCache[items.length] ?? items.length * estimateSize;
	});

	/**
	 * Calculate offset position for an item - O(1) with prefix sum cache
	 */
	function getItemOffset(index: number): number {
		if (typeof itemHeight === 'number') {
			return index * itemHeight;
		}
		// O(1) lookup from prefix sum cache
		return offsetCache[index] ?? index * estimateSize;
	}

	/**
	 * Binary search to find first visible item
	 */
	function findStartIndex(): number {
		let low = 0;
		let high = items.length - 1;

		while (low <= high) {
			const mid = Math.floor((low + high) / 2);
			const offset = getItemOffset(mid);

			if (offset < scrollTop) {
				low = mid + 1;
			} else {
				high = mid - 1;
			}
		}

		return Math.max(0, low - 1);
	}

	/**
	 * Calculate visible range with overscan
	 */
	const visibleRange = $derived.by(() => {
		if (!isInitialized || containerHeight === 0) {
			return { start: 0, end: 0 };
		}

		const startIndex = findStartIndex();
		const endScrollTop = scrollTop + containerHeight;

		let endIndex = startIndex;
		let currentOffset = getItemOffset(startIndex);

		// Find end index
		while (endIndex < items.length && currentOffset < endScrollTop) {
			currentOffset += getItemHeight(items[endIndex], endIndex);
			endIndex++;
		}

		// Apply overscan
		return {
			start: Math.max(0, startIndex - overscan),
			end: Math.min(items.length, endIndex + overscan)
		};
	});

	/**
	 * Visible items to render
	 */
	const visibleItems = $derived.by(() => {
		const { start, end } = visibleRange;
		return items.slice(start, end).map((item, i) => ({
			item,
			index: start + i,
			offset: getItemOffset(start + i)
		}));
	});

	/**
	 * Offset for the container to position items correctly
	 */
	const offsetY = $derived(visibleItems.length > 0 ? visibleItems[0].offset : 0);

	// ==================== EVENT HANDLERS ====================

	function handleScroll(event: Event) {
		const target = event.target as HTMLDivElement;
		scrollTop = target.scrollTop;
	}

	// ==================== OBSERVERS ====================

	/**
	 * Observe container size changes
	 */
	let resizeObserver: ResizeObserver | null = null;

	/**
	 * Observe item sizes for dynamic heights
	 */
	let itemResizeObserver: ResizeObserver | null = null;

	onMount(() => {
		if (!scrollContainer) return;

		// Initialize container height
		containerHeight = scrollContainer.clientHeight;
		isInitialized = true;

		// ResizeObserver for container
		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerHeight = entry.contentRect.height;
			}
		});
		resizeObserver.observe(scrollContainer);

		// ResizeObserver for dynamic item heights
		if (typeof itemHeight === 'function') {
			itemResizeObserver = new ResizeObserver((entries) => {
				let needsUpdate = false;
				for (const entry of entries) {
					const index = parseInt(entry.target.getAttribute('data-index') ?? '-1', 10);
					if (index >= 0) {
						const newHeight = entry.contentRect.height;
						const oldHeight = heightCache.get(index);
						if (oldHeight !== newHeight) {
							heightCache.set(index, newHeight);
							needsUpdate = true;
						}
					}
				}
				// Increment version to trigger reactive updates without Map recreation
				// This avoids the O(n) Map copy that was causing reflow issues
				if (needsUpdate) {
					heightCacheVersion++;
				}
			});
		}

		return () => {
			resizeObserver?.disconnect();
			itemResizeObserver?.disconnect();
		};
	});

	/**
	 * Register item element for size observation
	 */
	function observeItem(element: HTMLElement, index: number) {
		if (itemResizeObserver && typeof itemHeight === 'function') {
			element.setAttribute('data-index', String(index));
			itemResizeObserver.observe(element);
		}
	}

	// ==================== KEYBOARD NAVIGATION ====================

	let focusedIndex = $state<number>(-1);

	function handleKeyDown(event: KeyboardEvent) {
		const { start, end } = visibleRange;
		const visibleCount = end - start;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (focusedIndex < items.length - 1) {
					focusedIndex = focusedIndex === -1 ? start : focusedIndex + 1;
					scrollToIndex(focusedIndex);
				}
				break;
			case 'ArrowUp':
				event.preventDefault();
				if (focusedIndex > 0) {
					focusedIndex = focusedIndex === -1 ? start : focusedIndex - 1;
					scrollToIndex(focusedIndex);
				}
				break;
			case 'PageDown':
				event.preventDefault();
				focusedIndex = Math.min(items.length - 1, focusedIndex + visibleCount);
				scrollToIndex(focusedIndex);
				break;
			case 'PageUp':
				event.preventDefault();
				focusedIndex = Math.max(0, focusedIndex - visibleCount);
				scrollToIndex(focusedIndex);
				break;
			case 'Home':
				event.preventDefault();
				focusedIndex = 0;
				scrollToIndex(0);
				break;
			case 'End':
				event.preventDefault();
				focusedIndex = items.length - 1;
				scrollToIndex(items.length - 1);
				break;
		}
	}

	/**
	 * Scroll to ensure index is visible
	 */
	function scrollToIndex(index: number) {
		if (!scrollContainer) return;

		const offset = getItemOffset(index);
		const itemH = getItemHeight(items[index], index);

		// Check if item is already visible
		if (offset < scrollTop) {
			// Scroll up to show item at top
			scrollContainer.scrollTop = offset;
		} else if (offset + itemH > scrollTop + containerHeight) {
			// Scroll down to show item at bottom
			scrollContainer.scrollTop = offset + itemH - containerHeight;
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={scrollContainer}
	class="virtual-list {className}"
	onscroll={handleScroll}
	onkeydown={handleKeyDown}
	{role}
	aria-label={ariaLabel}
	tabindex="0"
>
	<!-- Spacer to maintain scroll height -->
	<div class="virtual-list-spacer" style="height: {totalHeight}px;">
		<!-- Visible items container with offset -->
		<div class="virtual-list-content" style="transform: translateY({offsetY}px);">
			{#each visibleItems as { item, index, offset } (index)}
				{@const height = getItemHeight(item, index)}
				{@const itemStyle = `height: ${height}px;`}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="virtual-list-item"
					style={itemStyle}
					data-index={index}
					role="listitem"
					tabindex={focusedIndex === index ? 0 : -1}
					aria-setsize={items.length}
					aria-posinset={index + 1}
					use:observeItem={index}
				>
					{@render children({ item, index, style: itemStyle })}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.virtual-list {
		overflow-y: auto;
		overflow-x: hidden;
		position: relative;
		height: 100%;
		width: 100%;

		/* Modern performance optimizations */
		contain: strict;
		content-visibility: auto;

		/* Smooth scrolling on iOS and modern browsers */
		-webkit-overflow-scrolling: touch;
		overscroll-behavior-y: contain;

		/* GPU acceleration */
		transform: translateZ(0);
		backface-visibility: hidden;
		will-change: scroll-position;

		/* Custom scrollbar styling */
		scrollbar-width: thin;
		scrollbar-color: var(--color-gray-400) var(--color-gray-200);
	}

	.virtual-list::-webkit-scrollbar {
		width: 8px;
	}

	.virtual-list::-webkit-scrollbar-track {
		background: var(--color-gray-100);
		border-radius: var(--radius-full);
	}

	.virtual-list::-webkit-scrollbar-thumb {
		background: var(--color-gray-400);
		border-radius: var(--radius-full);
		transition: background var(--transition-fast);
	}

	.virtual-list::-webkit-scrollbar-thumb:hover {
		background: var(--color-gray-500);
	}

	.virtual-list:focus {
		outline: 2px solid var(--color-primary-500);
		outline-offset: -2px;
	}

	.virtual-list:focus:not(:focus-visible) {
		outline: none;
	}

	.virtual-list-spacer {
		position: relative;
		width: 100%;
		pointer-events: none;
	}

	.virtual-list-content {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		pointer-events: auto;

		/* GPU-accelerated transform */
		will-change: transform;
		transform: translateZ(0);
	}

	.virtual-list-item {
		/* Layout containment for better performance */
		contain: layout style;

		/* Prevent items from being selectable during fast scrolling */
		user-select: none;

		/* Offscreen optimization */
		content-visibility: auto;
		contain-intrinsic-size: auto 100px;
	}

	.virtual-list-item:focus {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
		z-index: 1;
	}

	.virtual-list-item:focus:not(:focus-visible) {
		outline: none;
	}

	/* Dark mode scrollbar */
	@media (prefers-color-scheme: dark) {
		.virtual-list {
			scrollbar-color: var(--color-gray-600) var(--color-gray-800);
		}

		.virtual-list::-webkit-scrollbar-track {
			background: var(--color-gray-800);
		}

		.virtual-list::-webkit-scrollbar-thumb {
			background: var(--color-gray-600);
		}

		.virtual-list::-webkit-scrollbar-thumb:hover {
			background: var(--color-gray-500);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.virtual-list {
			scroll-behavior: auto;
		}

		.virtual-list-content {
			will-change: auto;
		}
	}

	/* High contrast mode */
	@media (forced-colors: active) {
		.virtual-list:focus {
			outline: 2px solid Highlight;
		}
	}
</style>
