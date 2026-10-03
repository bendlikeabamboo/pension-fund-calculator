<script lang="ts">
	import { addYearsClamped, compareYMD, formatYMD, parseYMD } from '#lib/engine/dates';
	import { CONTRIBUTION_RATES, type ContributionRate, type RateStep } from '#lib/engine/types';

	let {
		start = $bindable(),
		end = $bindable(),
		rateSteps = $bindable(),
		errors = {}
	}: {
		start: string;
		end: string | null;
		rateSteps: RateStep[];
		errors?: Record<string, string>;
	} = $props();

	const untilExit = $derived(end === null);

	// Clearing the date input means "until exit".
	$effect(() => {
		if (end === '') end = null;
	});

	function setUntilExit(until: boolean) {
		if (until) {
			end = null;
			return;
		}
		// Default the opt-out date a year after the window starts (kept before the exit date).
		let candidate: string;
		try {
			candidate = formatYMD(addYearsClamped(parseYMD(start), 1));
			if (compareYMD(parseYMD(candidate), parseYMD(start)) <= 0) candidate = start;
		} catch {
			candidate = start;
		}
		end = candidate;
	}

	function addRateStep() {
		const last = rateSteps[rateSteps.length - 1];
		let from = start;
		try {
			from = formatYMD(addYearsClamped(parseYMD(last.from), 1));
		} catch {
			// keep window start fallback
		}
		rateSteps.push({ from, rate: last?.rate ?? 10 });
	}

	function removeRateStep(i: number) {
		rateSteps.splice(i, 1);
	}
</script>

<fieldset class="group">
	<legend>Voluntary contribution</legend>

	<div class="dates">
		<label class="field">
			<span>Contributing from</span>
			<input type="date" bind:value={start} />
			{#if errors['window.start']}
				<span class="error">{errors['window.start']}</span>
			{/if}
		</label>
		<label class="field">
			<span>Opt-out date</span>
			<input type="date" bind:value={end} disabled={untilExit} placeholder="" />
			{#if errors['window.end']}
				<span class="error">{errors['window.end']}</span>
			{/if}
		</label>
	</div>
	<label class="until">
		<input
			type="checkbox"
			checked={untilExit}
			onchange={(e) => setUntilExit((e.currentTarget as HTMLInputElement).checked)}
		/>
		Contribute until exit (no opt-out)
	</label>
	<p class="hint">An opt-out collects your vested Fund B and ends the scheme — no re-entry.</p>

	<div class="rows">
		{#each rateSteps as step, i (i)}
			<div class="row">
				<label class="field">
					<span>Rate from</span>
					{#if i === 0}
						<input type="date" value={start} disabled aria-label="First rate starts with the contribution window" />
					{:else}
						<input type="date" bind:value={step.from} />
					{/if}
					{#if errors[`window.rate.${i}.from`]}
						<span class="error">{errors[`window.rate.${i}.from`]}</span>
					{/if}
				</label>
				<label class="field">
					<span>Rate</span>
					<select bind:value={step.rate}>
						{#each CONTRIBUTION_RATES as r (r)}
							<option value={r}>{r}%</option>
						{/each}
					</select>
					{#if errors[`window.rate.${i}.rate`]}
						<span class="error">{errors[`window.rate.${i}.rate`]}</span>
					{/if}
				</label>
				<button
					type="button"
					class="icon-btn"
					disabled={rateSteps.length === 1}
					aria-label={`Remove rate step ${i + 1}`}
					onclick={() => removeRateStep(i)}
				>
					✕
				</button>
			</div>
		{/each}
	</div>
	<button type="button" class="add-btn" onclick={addRateStep}>+ Add rate change</button>
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

	.dates {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
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

	.until {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12.5px;
		margin-top: 8px;
		cursor: pointer;
		user-select: none;
	}

	.until input {
		accent-color: var(--primary);
	}

	.hint {
		margin: 4px 0 10px;
		font-size: 11.5px;
		color: var(--ink-faint);
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.row {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: 8px;
		align-items: start;
	}

	.row .field:last-of-type {
		width: 92px;
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
