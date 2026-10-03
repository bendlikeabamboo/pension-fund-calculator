<script lang="ts">
	import { ordinal } from '#lib/engine/dates';
	import type { MonthPoint } from '#lib/engine/types';
	import { aprLabel, monthLabel, php } from '#lib/format';
	import { drawIn } from '#lib/charts/animate';
	import { linear, niceTicks, yearTicks, type Scale } from '#lib/charts/scales';
	import { drawInMs, refreshRate } from '#lib/refresh-rate.svelte';
	import CrosshairTooltip from './CrosshairTooltip.svelte';

	/** Shares the hover index with the balances chart (same point list). */
	let { points, hover = $bindable(null) }: { points: MonthPoint[]; hover?: number | null } = $props();

	let width = $state(640);
	let height = $state(260);
	let clipW = $state(0);
	let container = $state<HTMLDivElement | null>(null);

	const pad = { top: 18, right: 18, bottom: 30, left: 68 };
	const APR_CAP = 10; // 1000% — beyond the solvable bound, displayed as "≥1000%"

	const innerW = $derived(Math.max(10, width - pad.left - pad.right));

	const ord0 = $derived(points.length ? ordinal(points[0].date) : 0);
	const ord1 = $derived(points.length ? ordinal(points[points.length - 1].date) : 1);

	/** Curve domain starts at the first contribution — APR is undefined before it. */
	const firstApr = $derived(points.findIndex((p) => p.apr !== null));
	const curve = $derived(firstApr === -1 ? [] : points.slice(firstApr));

	const yMax = $derived(Math.max(0.05, ...curve.map((p) => p.apr ?? APR_CAP)) * 1.08);

	const x: Scale = $derived(linear(ord0, ord1, pad.left, pad.left + innerW));
	const y: Scale = $derived(linear(0, yMax, height - pad.bottom, pad.top));

	const yTicks = $derived(niceTicks(yMax, 4));
	const xTicks = $derived(yearTicks(ord0, ord1, innerW));

	const ordinals = $derived(points.map((p) => ordinal(p.date)));

	function px(p: MonthPoint): number {
		return x(ordinal(p.date));
	}

	function aprY(p: MonthPoint): number {
		return y(Math.min(p.apr ?? APR_CAP, yMax));
	}

	const linePath = $derived(
		curve.length >= 2
			? curve.map((p, i) => `${i ? 'L' : 'M'}${px(p).toFixed(1)},${aprY(p).toFixed(1)}`).join('')
			: ''
	);
	const areaPath = $derived(
		curve.length >= 2
			? `${linePath}L${px(curve[curve.length - 1]).toFixed(1)},${y(0).toFixed(1)}L${px(curve[0]).toFixed(1)},${y(0).toFixed(1)}Z`
			: ''
	);

	const hovered = $derived(hover !== null ? points[hover] ?? null : null);
	const tipX = $derived(hovered ? Math.min(Math.max(px(hovered), pad.left + 60), pad.left + innerW - 60) : 0);
	const tipY = $derived(hovered ? aprY(hovered) : 0);

	function indexFor(clientX: number): number | null {
		if (!container || points.length === 0) return null;
		const rect = container.getBoundingClientRect();
		const vx = clientX - rect.left;
		const ord = ord0 + ((vx - pad.left) / innerW) * (ord1 - ord0);
		let best = 0;
		let bestD = Infinity;
		for (let i = 0; i < ordinals.length; i++) {
			const d = Math.abs(ordinals[i] - ord);
			if (d < bestD) {
				bestD = d;
				best = i;
			}
		}
		return best;
	}

	function onPointerMove(e: PointerEvent) {
		hover = indexFor(e.clientX);
	}

	function onPointerLeave() {
		hover = null;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
		e.preventDefault();
		if (points.length === 0) return;
		const current = hover ?? points.length - 1;
		if (e.key === 'Home') hover = 0;
		else if (e.key === 'End') hover = points.length - 1;
		else hover = Math.min(points.length - 1, Math.max(0, current + (e.key === 'ArrowRight' ? 1 : -1)));
	}

	$effect(() => {
		const el = container;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			width = Math.max(280, entries[0].contentRect.width);
		});
		ro.observe(el);
		return () => ro.disconnect();
	});

	$effect(() => {
		const rr = refreshRate();
		return drawIn((p) => (clipW = p * innerW), drawInMs(rr.hz, rr.reduced));
	});

	const summary = $derived(
		hovered && hovered.apr !== null
			? `${monthLabel(hovered.date.y, hovered.date.m, hovered.date.d)}: APR ${aprLabel(hovered.apr)}, contributed ${php(hovered.c)}, payout ${php(hovered.payout)}.`
			: ''
	);
</script>

<div class="chart-block">
	<div class="chart-head">
		<h2>Effective APR if you exit here</h2>
		<p class="hint">XIRR of your Fund C contributions vs. the vested payout at each point in time.</p>
	</div>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class="chart-frame"
		tabindex="0"
		role="application"
		aria-label="APR curve by month. Use left and right arrow keys to inspect months."
		bind:this={container}
		onpointermove={onPointerMove}
		onpointerleave={onPointerLeave}
		onkeydown={onKeydown}
	>
		<svg width="100%" height={height} viewBox="0 0 {width} {height}">
			<defs>
				<clipPath id="apr-clip">
					<rect x={pad.left} y="0" width={clipW} height={height} />
				</clipPath>
			</defs>

			{#each yTicks as t (t)}
				<line x1={pad.left} x2={pad.left + innerW} y1={y(t)} y2={y(t)} class="gridline" />
				<text x={pad.left - 8} y={y(t)} class="tick num" text-anchor="end" dominant-baseline="middle">
					{(t * 100).toFixed(0)}%
				</text>
			{/each}

			{#each xTicks as t (t)}
				<line x1={x(t)} x2={x(t)} y1={pad.top} y2={height - pad.bottom} class="gridline" />
				<text x={x(t)} y={height - 10} class="tick" text-anchor="middle">
					{new Date(t * 86_400_000).getUTCFullYear()}
				</text>
			{/each}

			<line x1={pad.left} x2={pad.left + innerW} y1={height - pad.bottom} y2={height - pad.bottom} class="axis" />

			<g clip-path="url(#apr-clip)">
				{#if areaPath}
					<path d={areaPath} class="apr-area" />
					<path d={linePath} class="apr-line" />
				{/if}
			</g>

			{#if hovered && hovered.apr !== null}
				<line x1={px(hovered)} x2={px(hovered)} y1={pad.top} y2={height - pad.bottom} class="crosshair" />
				<circle cx={px(hovered)} cy={aprY(hovered)} r="3.5" class="dot" />
			{/if}
		</svg>

		<CrosshairTooltip x={tipX} y={tipY} show={hovered !== null && hovered.apr !== null}>
			{#if hovered}
				<div class="tt-title">{monthLabel(hovered.date.y, hovered.date.m, hovered.date.d)}</div>
				<div class="tt-row">Effective APR<b class="num">{aprLabel(hovered.apr)}</b></div>
				<div class="tt-row">Contributed (C)<b class="num">{php(hovered.c)}</b></div>
				<div class="tt-row">Vested payout<b class="num">{php(hovered.payout)}</b></div>
				<div class="tt-row">Gain<b class="num">{php(hovered.payout - hovered.c)}</b></div>
				{#if hovered.apr === 0}
					<div class="tt-note">Fully forfeited company money — you get exactly what you put in.</div>
				{/if}
			{/if}
		</CrosshairTooltip>
	</div>

	<div class="sr-only" role="status" aria-live="polite">{summary}</div>
</div>

<style>
	.chart-block {
		background: var(--card);
		border: 1px solid var(--hairline);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		padding: 14px 16px 10px;
	}

	.chart-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 6px;
	}

	h2 {
		font-size: 15px;
	}

	.hint {
		margin: 0;
		font-size: 12.5px;
		color: var(--ink-soft);
	}

	.chart-frame {
		position: relative;
		border-radius: var(--radius-sm);
	}

	.chart-frame:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	svg {
		display: block;
		touch-action: pan-y;
	}

	.gridline {
		stroke: var(--hairline);
		stroke-width: 1;
	}

	.axis {
		stroke: var(--hairline-strong);
		stroke-width: 1;
	}

	.tick {
		fill: var(--ink-soft);
		font-size: 11px;
	}

	.apr-area {
		fill: var(--primary);
		opacity: 0.1;
	}

	.apr-line {
		fill: none;
		stroke: var(--primary);
		stroke-width: 2;
	}

	.crosshair {
		stroke: var(--ink-faint);
		stroke-width: 1;
	}

	.dot {
		fill: var(--card);
		stroke: var(--primary);
		stroke-width: 1.5;
	}

	.tt-note {
		margin-top: 5px;
		max-width: 240px;
		white-space: normal;
		color: rgb(255 255 255 / 75%);
		font-size: 11.5px;
	}
</style>
