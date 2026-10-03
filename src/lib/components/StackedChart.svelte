<script lang="ts">
	import { ordinal } from '#lib/engine/dates';
	import type { MonthPoint } from '#lib/engine/types';
	import { monthLabel, php, phpCompact } from '#lib/format';
	import { drawIn } from '#lib/charts/animate';
	import { linear, niceTicks, yearTicks, type Scale } from '#lib/charts/scales';
	import { drawInMs, refreshRate } from '#lib/refresh-rate.svelte';
	import CrosshairTooltip from './CrosshairTooltip.svelte';

	let {
		points,
		hover = $bindable(null),
		showOverlay = $bindable(false)
	}: {
		points: MonthPoint[];
		hover?: number | null;
		showOverlay?: boolean;
	} = $props();

	let width = $state(640);
	let height = $state(340);
	let clipW = $state(0);
	let container = $state<HTMLDivElement | null>(null);

	const pad = { top: 18, right: 18, bottom: 30, left: 68 };
	const innerW = $derived(Math.max(10, width - pad.left - pad.right));

	const ord0 = $derived(points.length ? ordinal(points[0].date) : 0);
	const ord1 = $derived(points.length ? ordinal(points[points.length - 1].date) : 1);
	const yMax = $derived(Math.max(1, ...points.map((p) => p.a + p.b + p.c + p.bCollected)) * 1.04);

	const x: Scale = $derived(linear(ord0, ord1, pad.left, pad.left + innerW));
	const y: Scale = $derived(linear(0, yMax, height - pad.bottom, pad.top));

	const yTicks = $derived(niceTicks(yMax, 5));
	const xTicks = $derived(yearTicks(ord0, ord1, innerW));

	const ordinals = $derived(points.map((p) => ordinal(p.date)));

	function px(p: MonthPoint): number {
		return x(ordinal(p.date));
	}

	function stackArea(top: (p: MonthPoint) => number, bottom: (p: MonthPoint) => number): string {
		if (points.length < 2) return '';
		const up = points.map((p, i) => `${i ? 'L' : 'M'}${px(p).toFixed(1)},${y(top(p)).toFixed(1)}`).join('');
		const down = [...points]
			.reverse()
			.map((p) => `L${px(p).toFixed(1)},${y(bottom(p)).toFixed(1)}`)
			.join('');
		return up + down + 'Z';
	}

	const areaA = $derived(stackArea((p) => p.a, () => 0));
	const areaB = $derived(stackArea((p) => p.a + p.b, (p) => p.a));
	const areaC = $derived(stackArea((p) => p.a + p.b + p.c, (p) => p.a + p.b));
	const areaCollected = $derived(
		stackArea((p) => p.a + p.b + p.c + p.bCollected, (p) => p.a + p.b + p.c)
	);
	const overlayPath = $derived(
		points.length >= 2
			? points.map((p, i) => `${i ? 'L' : 'M'}${px(p).toFixed(1)},${y(p.payout).toFixed(1)}`).join('')
			: ''
	);

	const hovered = $derived(hover !== null ? points[hover] ?? null : null);
	const tipX = $derived(hovered ? Math.min(Math.max(px(hovered), pad.left + 60), pad.left + innerW - 60) : 0);
	const stackTop = $derived(hovered ? hovered.a + hovered.b + hovered.c + hovered.bCollected : 0);
	const tipY = $derived(hovered ? y(stackTop) : 0);

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

	// Draw-in once on mount, paced by the measured refresh rate.
	$effect(() => {
		const rr = refreshRate();
		return drawIn((p) => (clipW = p * innerW), drawInMs(rr.hz, rr.reduced));
	});

	const summary = $derived(
		hovered
			? `${monthLabel(hovered.date.y, hovered.date.m, hovered.date.d)}: Fund A ${php(hovered.a)}, Fund B ${php(hovered.b + hovered.bCollected)}, Fund C ${php(hovered.c)}, vesting ${Math.round(hovered.vesting * 100)}%, vested payout ${php(hovered.payout)}.`
			: ''
	);
</script>

<div class="chart-block">
	<div class="chart-head">
		<h2>Balances by month</h2>
		<div class="legend" aria-hidden="true">
			<span class="key"><i style="background: var(--fund-a)"></i>Fund A</span>
			<span class="key"><i style="background: var(--fund-b)"></i>Fund B</span>
			<span class="key"><i class="i-collected"></i>Collected match</span>
			<span class="key"><i style="background: var(--fund-c)"></i>Fund C</span>
			<label class="overlay-toggle">
				<input type="checkbox" bind:checked={showOverlay} />
				Vested exit value
			</label>
		</div>
	</div>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class="chart-frame"
		tabindex="0"
		role="application"
		aria-label="Stacked fund balances by month. Use left and right arrow keys to inspect months."
		bind:this={container}
		onpointermove={onPointerMove}
		onpointerleave={onPointerLeave}
		onkeydown={onKeydown}
	>
		<svg width="100%" height={height} viewBox="0 0 {width} {height}">
			<defs>
				<clipPath id="stack-clip">
					<rect x={pad.left} y="0" width={clipW} height={height} />
				</clipPath>
			</defs>

			{#each yTicks as t (t)}
				<line x1={pad.left} x2={pad.left + innerW} y1={y(t)} y2={y(t)} class="gridline" />
				<text x={pad.left - 8} y={y(t)} class="tick num" text-anchor="end" dominant-baseline="middle">
					{phpCompact(t)}
				</text>
			{/each}

			{#each xTicks as t (t)}
				<line x1={x(t)} x2={x(t)} y1={pad.top} y2={height - pad.bottom} class="gridline" />
				<text x={x(t)} y={height - 10} class="tick" text-anchor="middle">
					{new Date(t * 86_400_000).getUTCFullYear()}
				</text>
			{/each}

			<line x1={pad.left} x2={pad.left + innerW} y1={height - pad.bottom} y2={height - pad.bottom} class="axis" />

			<g clip-path="url(#stack-clip)">
				<path d={areaC} fill="var(--fund-c)" />
				<path d={areaB} fill="var(--fund-b)" />
				<path d={areaA} fill="var(--fund-a)" />
				<path d={areaCollected} class="collected" />
				{#if showOverlay}
					<path d={overlayPath} class="overlay-line" />
				{/if}
			</g>

			{#if hovered}
				<line
					x1={px(hovered)}
					x2={px(hovered)}
					y1={pad.top}
					y2={height - pad.bottom}
					class="crosshair"
				/>
				<circle cx={px(hovered)} cy={y(stackTop)} r="3.5" class="dot" />
				{#if showOverlay}
					<circle cx={px(hovered)} cy={y(hovered.payout)} r="3" class="dot-overlay" />
				{/if}
			{/if}
		</svg>

		<CrosshairTooltip x={tipX} y={tipY} show={hovered !== null}>
			{#if hovered}
				<div class="tt-title">{monthLabel(hovered.date.y, hovered.date.m, hovered.date.d)}</div>
				<div class="tt-row"><span class="swatch" style="background: var(--fund-a)"></span>Fund A<b class="num">{php(hovered.a)}</b></div>
				<div class="tt-row">
					<span class="swatch" style="background: var(--fund-b)"></span>Fund B<b class="num">{php(hovered.b + hovered.bCollected)}</b>
				</div>
				<div class="tt-row"><span class="swatch" style="background: var(--fund-c)"></span>Fund C<b class="num">{php(hovered.c)}</b></div>
				<div class="tt-row sep">Vesting<b class="num">{Math.round(hovered.vesting * 100)}%</b></div>
				<div class="tt-row">Vested payout<b class="num">{php(hovered.payout)}</b></div>
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

	.legend {
		display: flex;
		align-items: center;
		gap: 14px;
		font-size: 12.5px;
		color: var(--ink-soft);
	}

	.key {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.key i {
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}

	.overlay-toggle {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		cursor: pointer;
		user-select: none;
	}

	.overlay-toggle input {
		accent-color: var(--primary);
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

	.i-collected {
		background: repeating-linear-gradient(
			-45deg,
			var(--fund-b) 0 2px,
			transparent 2px 5px
		);
		border: 1px solid var(--fund-b);
	}

	.collected {
		fill: var(--fund-b);
		fill-opacity: 0.18;
	}

	.overlay-line {
		fill: none;
		stroke: var(--vested);
		stroke-width: 1.6;
		stroke-dasharray: 5 4;
	}

	.crosshair {
		stroke: var(--ink-faint);
		stroke-width: 1;
	}

	.dot {
		fill: var(--card);
		stroke: var(--ink);
		stroke-width: 1.5;
	}

	.dot-overlay {
		fill: var(--card);
		stroke: var(--vested);
		stroke-width: 1.5;
	}

	.tt-row.sep {
		border-top: 1px solid rgb(255 255 255 / 25%);
		margin-top: 4px;
		padding-top: 4px;
	}
</style>
