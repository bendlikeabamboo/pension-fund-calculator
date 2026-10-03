<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		x,
		y,
		show,
		children
	}: { x: number; y: number; show: boolean; children: Snippet } = $props();
</script>

{#if show}
	<div class="tooltip" style="left:{x}px; top:{y}px" aria-hidden="true">
		{@render children()}
	</div>
{/if}

<style>
	.tooltip {
		position: absolute;
		pointer-events: none;
		transform: translate(-50%, calc(-100% - 10px));
		background: var(--ink);
		color: #fff;
		border-radius: var(--radius-sm);
		padding: 8px 10px;
		font-size: 12.5px;
		line-height: 1.5;
		white-space: nowrap;
		box-shadow: var(--shadow);
		z-index: 3;
	}

	.tooltip :global(.tt-title) {
		font-weight: 650;
		margin-bottom: 3px;
	}

	.tooltip :global(.tt-row) {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.tooltip :global(.tt-row b) {
		margin-left: auto;
		padding-left: 12px;
		font-weight: 600;
	}

	.tooltip :global(.swatch) {
		width: 9px;
		height: 9px;
		border-radius: 2px;
		flex: none;
	}
</style>
