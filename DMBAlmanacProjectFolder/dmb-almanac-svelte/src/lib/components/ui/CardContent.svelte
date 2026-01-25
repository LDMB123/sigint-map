<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children?: Snippet;
	};

	let { class: className = '', children }: Props = $props();
</script>

<div class="content {className}">
	{@render children?.()}
</div>

<style>
	.content {
		/* Content container - layout handled by Card component */
		display: contents;
	}
</style>
