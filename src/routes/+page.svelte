<script lang="ts">
	import { createSimulator } from '#lib/state/inputs.svelte';
	import InputPanel from '#lib/components/InputPanel.svelte';
	import StackedChart from '#lib/components/StackedChart.svelte';
	import AprChart from '#lib/components/AprChart.svelte';
	import KpiCards from '#lib/components/KpiCards.svelte';

	const sim = createSimulator();
	const points = $derived(sim.simulation?.points ?? []);
	let hover = $state<number | null>(null);
	let showOverlay = $state(true);
</script>

<svelte:head>
	<title>Pension Fund Simulator</title>
	<meta
		name="description"
		content="Simulate your company pension month by month: Funds A, B and C, vesting, and the effective APR of your voluntary contributions."
	/>
</svelte:head>

<div class="shell">
	<header>
		<h1>Pension Fund Simulator</h1>
		<p class="sub">Month-by-month growth of Funds A, B and C — and what you walk away with.</p>
	</header>

	{#if sim.simulation}
		<KpiCards totals={sim.simulation.totals} />
	{/if}

	<div class="grid">
		<aside>
			<InputPanel {sim} />
		</aside>
		<main class="charts">
			<StackedChart {points} bind:hover bind:showOverlay />
			<AprChart {points} bind:hover />
		</main>
	</div>
</div>

<style>
	.shell {
		max-width: 1240px;
		margin: 0 auto;
		padding: 20px 20px 48px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	header h1 {
		font-size: 22px;
		color: var(--ink);
	}

	header h1::after {
		content: '';
		display: block;
		width: 42px;
		height: 4px;
		border-radius: 2px;
		background: var(--primary);
		margin-top: 6px;
	}

	.sub {
		margin: 8px 0 0;
		color: var(--ink-soft);
		font-size: 13.5px;
	}

	.grid {
		display: grid;
		grid-template-columns: 340px minmax(0, 1fr);
		gap: 16px;
		align-items: start;
	}

	.charts {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	@media (max-width: 960px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
