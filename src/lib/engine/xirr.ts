import type { CashFlow } from './types-flow';

export type { CashFlow };

/**
 * Solve Σ cf / (1+r)^(days/365) = 0 by bisection over [-0.99, 10].
 * Returns null when no root exists in that range (reported as "≥1000%"),
 * or when the flows cannot define a rate (fewer than two flows).
 * A payout that exactly equals the contributions returns 0 without iterating.
 */
export function xirr(flows: CashFlow[]): number | null {
	if (flows.length < 2) return null;

	let t0 = Infinity;
	let scale = 0;
	for (const f of flows) {
		if (f.t < t0) t0 = f.t;
		scale += Math.abs(f.amount);
	}
	if (scale === 0) return 0;

	const npv = (r: number): number => {
		let sum = 0;
		for (const f of flows) sum += f.amount * (1 + r) ** (-(f.t - t0) / 365);
		return sum;
	};

	const tolerance = scale * 1e-9;
	if (Math.abs(npv(0)) <= tolerance) return 0;

	let lo = -0.99;
	let hi = 10;
	let flo = npv(lo);
	let fhi = npv(hi);
	if (Math.abs(flo) <= tolerance) return lo;
	if (Math.abs(fhi) <= tolerance) return hi;
	if (flo > 0 === fhi > 0) return null;

	for (let i = 0; i < 100; i++) {
		const mid = (lo + hi) / 2;
		const fm = npv(mid);
		if (Math.abs(fm) <= tolerance || hi - lo < 1e-11) return mid;
		if (flo > 0 === fm > 0) {
			lo = mid;
			flo = fm;
		} else {
			hi = mid;
			fhi = fm;
		}
	}
	return (lo + hi) / 2;
}
