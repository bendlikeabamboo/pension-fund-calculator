<script lang="ts">
	import type { SimTotals } from '#lib/engine/types';
	import { aprLabel, php } from '#lib/format';

	let { totals }: { totals: SimTotals } = $props();

	const cards = $derived([
		{ label: 'Fund C contributed', value: php(totals.cContributed), note: 'Your voluntary contributions' },
		{ label: 'Company money (A + B)', value: php(totals.companyMoney), note: 'Employer contributions to date' },
		{ label: 'Vested payout at exit', value: php(totals.vestedPayout), note: 'What you walk away with' },
		{
			label: 'Effective APR',
			value: totals.apr === null ? '—' : aprLabel(totals.apr),
			note: totals.apr === 0 ? 'Payout equals what you put in' : 'XIRR of contributions vs. payout'
		},
		{ label: 'Vesting at exit', value: `${Math.round(totals.vesting * 100)}%`, note: 'Company money you keep' },
		{
			label: 'Next vesting step',
			value: totals.monthsToNextVest === null ? '—' : `${totals.monthsToNextVest} mo`,
			note: totals.monthsToNextVest === null ? 'Fully vested' : 'From your exit date'
		}
	]);
</script>

<section class="kpis" aria-label="Key figures at your exit date">
	{#each cards as c (c.label)}
		<div class="card">
			<span class="label">{c.label}</span>
			<span class="value num">{c.value}</span>
			<span class="note">{c.note}</span>
		</div>
	{/each}
	<p class="sr-only" role="status" aria-live="polite">
		At your exit date: you contributed {php(totals.cContributed)}, the company contributed
		{php(totals.companyMoney)}, your vested payout is {php(totals.vestedPayout)} at an effective APR of
		{totals.apr === null ? 'not applicable' : aprLabel(totals.apr)}, with {Math.round(totals.vesting * 100)} percent
		vesting.
	</p>
</section>

<style>
	.kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 10px;
	}

	.card {
		background: var(--card);
		border: 1px solid var(--hairline);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.label {
		font-size: 11.5px;
		color: var(--ink-soft);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.value {
		font-size: 19px;
		font-weight: 650;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.note {
		font-size: 11.5px;
		color: var(--ink-faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
