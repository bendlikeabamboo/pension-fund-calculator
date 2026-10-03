export interface Scale {
	(v: number): number;
}

export function linear(domain0: number, domain1: number, range0: number, range1: number): Scale {
	const k = domain1 === domain0 ? 0 : (range1 - range0) / (domain1 - domain0);
	return (v) => range0 + (v - domain0) * k;
}

/** ~`count` round steps from 0 up to max. */
export function niceTicks(max: number, count = 5): number[] {
	if (max <= 0 || !Number.isFinite(max)) return [0];
	const raw = max / count;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const norm = raw / mag;
	const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
	const ticks: number[] = [];
	for (let v = 0; v <= max * 1.0001; v += step) ticks.push(v);
	return ticks;
}

/** Ordinals of January 1st between the bounds, thinned to fit the given pixel width. */
export function yearTicks(ord0: number, ord1: number, width = Infinity): number[] {
	if (ord1 <= ord0) return [];
	const y0 = new Date(ord0 * 86_400_000).getUTCFullYear() + 1;
	const y1 = new Date(ord1 * 86_400_000).getUTCFullYear();
	const years: number[] = [];
	for (let y = y0; y <= y1; y++) {
		const ord = Date.UTC(y, 0, 1) / 86_400_000;
		if (ord > ord0 && ord <= ord1) years.push(ord);
	}
	const maxLabels = Math.max(2, Math.floor(width / 72));
	const keep = Math.max(1, Math.ceil(years.length / maxLabels));
	const kept = years.filter((_, i) => i % keep === 0);
	const last = years[years.length - 1];
	if (kept[kept.length - 1] !== last) {
		// Always label the final (exit) year; drop the previous kept label if it would crowd it.
		const step = (years[1] ?? last) - years[0];
		if (kept.length && last - kept[kept.length - 1] < step * keep * 0.5) kept.pop();
		kept.push(last);
	}
	return kept;
}
