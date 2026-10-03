<script lang="ts">
	import { addYearsClamped, formatYMD, parseYMD } from '#lib/engine/dates';
	import type { SalaryStep } from '#lib/engine/types';

	let {
		steps = $bindable(),
		employmentStart,
		errors = {}
	}: {
		steps: SalaryStep[];
		employmentStart: string;
		errors?: Record<string, string>;
	} = $props();

	function addStep() {
		const last = steps[steps.length - 1];
		let from = employmentStart;
		try {
			from = formatYMD(addYearsClamped(parseYMD(last.from), 1));
		} catch {
			// keep employmentStart fallback
		}
		steps.push({ from, monthly: last?.monthly ?? 80_000 });
	}

	function removeStep(i: number) {
		steps.splice(i, 1);
	}
</script>

<fieldset class="group">
	<legend>Monthly salary steps</legend>
	<div class="rows">
		{#each steps as step, i (i)}
			<div class="row">
				<label class="field">
					<span>Effective from</span>
					{#if i === 0}
						<input type="date" value={employmentStart} disabled aria-label="First salary step starts on employment date" />
					{:else}
						<input type="date" bind:value={step.from} />
					{/if}
					{#if errors[`salary.${i}.from`]}
						<span class="error">{errors[`salary.${i}.from`]}</span>
					{/if}
				</label>
				<label class="field amount">
					<span>₱ per month</span>
					<input type="number" class="num" min="0" step="1000" bind:value={step.monthly} />
					{#if errors[`salary.${i}.monthly`]}
						<span class="error">{errors[`salary.${i}.monthly`]}</span>
					{/if}
				</label>
				<button
					type="button"
					class="icon-btn"
					disabled={steps.length === 1}
					aria-label={`Remove salary step ${i + 1}`}
					onclick={() => removeStep(i)}
				>
					✕
				</button>
			</div>
		{/each}
	</div>
	<button type="button" class="add-btn" onclick={addStep}>+ Add salary step</button>
</fieldset>

<style>
	.group {
		border: none;
		margin: 0;
		padding: 0;
	}

	legend {
		font-weight: 650;
		font-size: 13px;
		padding: 0;
		margin-bottom: 8px;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.row {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 8px;
		align-items: start;
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

	.icon-btn {
		border: 1px solid var(--hairline-strong);
		background: var(--card);
		border-radius: var(--radius-sm);
		width: 34px;
		height: 34px;
		margin-top: 21px;
		color: var(--ink-soft);
	}

	.icon-btn:hover:not(:disabled) {
		color: var(--danger);
		border-color: var(--danger);
	}

	.add-btn {
		margin-top: 8px;
		border: 1px dashed var(--hairline-strong);
		background: transparent;
		border-radius: var(--radius-sm);
		padding: 6px 10px;
		color: var(--ink-soft);
		font-size: 13px;
	}

	.add-btn:hover {
		color: var(--primary);
		border-color: var(--primary);
	}
</style>
