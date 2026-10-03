<script lang="ts">
	import { parseYMD } from '#lib/engine/dates';
	import type { Simulator } from '#lib/state/inputs.svelte';
	import ContributionEditor from './ContributionEditor.svelte';
	import SalaryStepsEditor from './SalaryStepsEditor.svelte';

	let { sim }: { sim: Simulator } = $props();

	const model = $derived(sim.model);
	const errors = $derived(sim.errors);

	function validISO(s: string): boolean {
		try {
			parseYMD(s);
			return true;
		} catch {
			return false;
		}
	}

	// Keep the pinned invariants: first salary step starts at employment,
	// the window cannot start before employment, the first rate starts with the window.
	$effect(() => {
		const es = model.employmentStart;
		if (validISO(es)) {
			if (model.salarySteps[0] && model.salarySteps[0].from !== es) model.salarySteps[0].from = es;
			if (model.window.start < es) model.window.start = es;
		}
	});
	$effect(() => {
		const ws = model.window.start;
		if (validISO(ws) && model.window.rateSteps[0] && model.window.rateSteps[0].from !== ws) {
			model.window.rateSteps[0].from = ws;
		}
	});
</script>

<form class="panel" onsubmit={(e) => e.preventDefault()} aria-label="Simulation inputs">
	<fieldset class="group">
		<legend>Dates</legend>
		<label class="field">
			<span>Employment start</span>
			<input type="date" bind:value={model.employmentStart} />
			{#if errors.employmentStart}
				<span class="error">{errors.employmentStart}</span>
			{/if}
		</label>
		<label class="field">
			<span>Exit (resignation) date</span>
			<input type="date" bind:value={model.exitDate} />
			{#if errors.exitDate}
				<span class="error">{errors.exitDate}</span>
			{/if}
		</label>
	</fieldset>

	<SalaryStepsEditor bind:steps={model.salarySteps} employmentStart={model.employmentStart} errors={errors} />

	<ContributionEditor
		bind:start={model.window.start}
		bind:end={model.window.end}
		bind:rateSteps={model.window.rateSteps}
		errors={errors}
	/>

	<button type="button" class="reset" onclick={sim.reset}>Reset to defaults</button>
</form>

<style>
	.panel {
		background: var(--card);
		border: 1px solid var(--hairline);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.group {
		border: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	legend {
		font-weight: 650;
		font-size: 13px;
		padding: 0;
		margin-bottom: 2px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font-size: 12px;
		color: var(--ink-soft);
		min-width: 0;
	}

	.error {
		color: var(--danger);
		font-size: 11.5px;
	}

	.reset {
		align-self: flex-start;
		border: 1px solid var(--hairline-strong);
		background: transparent;
		border-radius: var(--radius-sm);
		padding: 7px 12px;
		color: var(--ink-soft);
		font-size: 13px;
	}

	.reset:hover {
		color: var(--danger);
		border-color: var(--danger);
	}
</style>
