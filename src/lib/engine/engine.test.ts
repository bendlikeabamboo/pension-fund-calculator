import { describe, expect, it } from 'vitest';
import {
	addYearsClamped,
	completedYears,
	compareYMD,
	daysInMonth,
	monthRange,
	ordinal,
	paydayOf,
	parseYMD
} from './dates';
import { simulate } from './simulate';
import { vestingFraction } from './vesting';
import { xirr } from './xirr';
import type { SimulationInput } from './types';

describe('dates', () => {
	it('clamps the payday to the last day of short Februaries', () => {
		expect(paydayOf(2021, 2).d).toBe(28);
		expect(paydayOf(2024, 2).d).toBe(29);
		expect(paydayOf(2026, 1).d).toBe(29);
		expect(daysInMonth(2021, 2)).toBe(28);
	});

	it('adds years clamped for Feb 29 starts', () => {
		expect(addYearsClamped(parseYMD('2024-02-29'), 1)).toEqual(parseYMD('2025-02-28'));
		expect(addYearsClamped(parseYMD('2024-02-29'), 4)).toEqual(parseYMD('2028-02-29'));
	});

	it('counts completed years with clamped anniversaries', () => {
		const start = parseYMD('2020-01-15');
		expect(completedYears(start, parseYMD('2020-01-14'))).toBe(0);
		expect(completedYears(start, parseYMD('2020-01-15'))).toBe(0);
		expect(completedYears(start, parseYMD('2025-01-14'))).toBe(4);
		expect(completedYears(start, parseYMD('2025-01-15'))).toBe(5);
		const leapStart = parseYMD('2024-02-29');
		expect(completedYears(leapStart, parseYMD('2025-02-28'))).toBe(1);
	});

	it('iterates months inclusive of both endpoints', () => {
		const months = monthRange(parseYMD('2025-11-01'), parseYMD('2026-02-10'));
		expect(months.map((x) => `${x.y}-${x.m}`)).toEqual(['2025-11', '2025-12', '2026-1', '2026-2']);
	});

	it('orders and measures days consistently', () => {
		expect(compareYMD(parseYMD('2020-01-29'), parseYMD('2020-02-28'))).toBeLessThan(0);
		expect(ordinal(parseYMD('2020-01-29')) - ordinal(parseYMD('2019-01-29'))).toBe(365);
	});
});

describe('vesting', () => {
	it('matches the retention schedule', () => {
		expect(vestingFraction(0)).toBe(0);
		expect(vestingFraction(4.99)).toBe(0);
		expect(vestingFraction(5)).toBe(0.5);
		expect(vestingFraction(6)).toBe(0.6);
		expect(vestingFraction(9)).toBe(0.9);
		expect(vestingFraction(10)).toBe(1);
		expect(vestingFraction(15)).toBe(1);
	});
});

const baseInput: SimulationInput = {
	employmentStart: '2020-01-01',
	exitDate: '2030-01-01',
	salarySteps: [{ from: '2020-01-01', monthly: 80_000 }],
	window: {
		start: '2020-01-01',
		end: null,
		rateSteps: [{ from: '2020-01-01', rate: 7 }]
	}
};

function run(overrides: Partial<SimulationInput> = {}) {
	return simulate({ ...baseInput, ...overrides });
}

describe('simulate — accruals', () => {
	it('uses the fixed 29th payday and clamps February', () => {
		const r = run({ employmentStart: '2021-01-01', exitDate: '2021-03-01' });
		expect(r.points.map((p) => p.date.d)).toEqual([29, 28, 1]); // Jan 29, Feb 28 (non-leap), exit Mar 1
	});

	it('skips the first month when employment starts after the payday', () => {
		const r = run({ employmentStart: '2020-01-30', exitDate: '2020-03-01' });
		expect(r.points[0].date).toEqual(paydayOf(2020, 2));
	});

	it('accrues Fund A at 4% before 4 years and 8% after', () => {
		const r = run({ exitDate: '2025-01-01' });
		// 48 paydays (2020–2023) at 4% of 80k = 3200 each; 8% (6400) from Jan 2024.
		const at4y = r.points.find((p) => p.date.y === 2024 && p.date.m === 1)!;
		const dec24 = r.points.find((p) => p.date.y === 2024 && p.date.m === 12)!;
		expect(at4y.a).toBeCloseTo(3200 * 48 + 6400, 6);
		expect(dec24.a).toBeCloseTo(at4y.a + 6400 * 11, 6);
	});

	it('matches B at min(rate, 7%) and C at the full rate', () => {
		const r = run({
			exitDate: '2021-01-01',
			window: { start: '2020-01-01', end: null, rateSteps: [{ from: '2020-01-01', rate: 10 }] }
		});
		const p = r.points[0];
		expect(p.c).toBeCloseTo(8000, 6);
		expect(p.b).toBeCloseTo(5600, 6);
	});

	it('applies salary steps effective-dated', () => {
		const r = run({
			exitDate: '2021-01-01',
			salarySteps: [
				{ from: '2020-01-01', monthly: 80_000 },
				{ from: '2020-07-01', monthly: 100_000 }
			]
		});
		// 6 paydays at 7% of 80k, then 6 at 7% of 100k.
		const last = r.points[r.points.length - 2]; // Dec 2020 payday
		expect(last.c).toBeCloseTo(6 * 5600 + 6 * 7000, 6);
	});

	it('applies rate changes mid-window', () => {
		const r = run({
			exitDate: '2021-01-01',
			window: {
				start: '2020-01-01',
				end: null,
				rateSteps: [
					{ from: '2020-01-01', rate: 4 },
					{ from: '2020-07-01', rate: 10 }
				]
			}
		});
		const last = r.points[r.points.length - 2];
		expect(last.c).toBeCloseTo(6 * 3200 + 6 * 8000, 6);
		expect(last.b).toBeCloseTo(6 * 3200 + 6 * 5600, 6);
	});
});

describe('simulate — vesting and exit value', () => {
	it('forfeits all company money pre-cliff', () => {
		const r = run({ exitDate: '2024-12-31' }); // just under 5 years
		expect(r.totals.vesting).toBe(0);
		expect(r.totals.vestedPayout).toBeCloseTo(r.totals.cContributed, 6);
		expect(r.points.every((p) => p.payout === p.c || p.vesting > 0)).toBe(true);
	});

	it('vests 50% at exactly 5 years and pays Fund A on resignation', () => {
		const r = run({ exitDate: '2025-01-01' });
		expect(r.totals.vesting).toBe(0.5);
		const exit = r.points[r.points.length - 1];
		expect(exit.payout).toBeCloseTo(0.5 * exit.a + 0.5 * exit.b + exit.c, 6);
	});

	it('vests fully at 10 years', () => {
		const r = run({ exitDate: '2030-01-01' });
		expect(r.totals.vesting).toBe(1);
		const exit = r.points[r.points.length - 1];
		expect(exit.payout).toBeCloseTo(exit.a + exit.b + exit.c, 6);
	});

	it('contributes nothing in a partial final month', () => {
		const full = run({ exitDate: '2021-02-01' });
		const early = run({ exitDate: '2021-01-15' });
		const earlyExit = early.points[early.points.length - 1];
		const decPayday = full.points.find((p) => p.date.y === 2020 && p.date.m === 12)!;
		expect(earlyExit.a).toBeCloseTo(decPayday.a, 6);
		expect(earlyExit.c).toBeCloseTo(decPayday.c, 6);
	});

	it('still contributes in the exit month when the exit falls after the payday', () => {
		const r = run({ exitDate: '2021-01-31' });
		const jan = r.points.find((p) => p.date.y === 2021)!;
		const dec = r.points.find((p) => p.date.y === 2020 && p.date.m === 12)!;
		expect(jan.c).toBeCloseTo(dec.c + 5600, 6);
	});
});

describe('simulate — opt-out', () => {
	it('collects vested B at opt-out and stops all window accruals', () => {
		// Opt out 2022-06-15 (tenure 2.45y → vesting 0), exit later.
		const r = run({
			exitDate: '2025-01-01',
			window: { start: '2020-01-01', end: '2022-06-15', rateSteps: [{ from: '2020-01-01', rate: 7 }] }
		});
		expect(r.totals.vesting).toBe(0.5);
		const exit = r.points[r.points.length - 1];
		expect(exit.b).toBe(0);
		expect(exit.bCollected).toBe(0); // pre-cliff opt-out forfeits B entirely
		expect(exit.payout).toBeCloseTo(0.5 * exit.a + 0 + exit.c, 6);
		// No accruals after opt-out: last C equals C at May 2022 payday.
		const may22 = r.points.find((p) => p.date.y === 2022 && p.date.m === 5)!;
		expect(exit.c).toBeCloseTo(may22.c, 6);
	});

	it('pays vested B at opt-out mid-vesting and keeps it in the exit payout', () => {
		// Opt out 2027-06-15 (7y tenure → 70% vesting), exit 2029-01-01 (9y → 90%).
		const r = run({
			exitDate: '2029-01-01',
			window: { start: '2020-01-01', end: '2027-06-15', rateSteps: [{ from: '2020-01-01', rate: 7 }] }
		});
		const exit = r.points[r.points.length - 1];
		const bAtOptOut = 5600 * 89; // 89 paydays from Jan 2020 through May 2027
		const collected = 0.7 * bAtOptOut;
		expect(exit.bCollected).toBeCloseTo(collected, 4);
		expect(exit.payout).toBeCloseTo(0.9 * exit.a + collected + exit.c, 4);
	});

	it('treats an opt-out end at or after the exit date as "until exit"', () => {
		const a = run({
			exitDate: '2025-01-01',
			window: { start: '2020-01-01', end: '2025-06-01', rateSteps: [{ from: '2020-01-01', rate: 7 }] }
		});
		const b = run({ exitDate: '2025-01-01' });
		expect(a.totals.cContributed).toBeCloseTo(b.totals.cContributed, 6);
		expect(a.points.at(-1)!.bCollected).toBe(0);
	});
});

describe('APR (XIRR at exit points)', () => {
	it('is exactly 0 pre-cliff and jumps after the cliff', () => {
		const r = run({ exitDate: '2030-01-01' });
		const preCliff = r.points.filter((p) => p.vesting === 0);
		for (const p of preCliff.slice(r.firstContributionIndex)) {
			expect(p.apr).toBe(0);
		}
		const atCliff = r.points.find((p) => p.vesting === 0.5)!;
		expect(atCliff.apr).toBeGreaterThan(0);
	});

	it('is null before the first contribution', () => {
		const r = run({
			window: { start: '2021-01-01', end: null, rateSteps: [{ from: '2021-01-01', rate: 7 }] },
			exitDate: '2025-01-01'
		});
		expect(r.points[0].apr).toBeNull();
		expect(r.points[r.firstContributionIndex].apr).toBe(0);
	});

	it('returns null APR when no contributions were ever made', () => {
		const r = run({
			window: { start: '2021-01-01', end: '2021-01-02', rateSteps: [{ from: '2021-01-01', rate: 7 }] }
		});
		expect(r.firstContributionIndex).toBe(-1);
		expect(r.totals.apr).toBeNull();
		expect(r.totals.cContributed).toBe(0);
	});

	it('matches a hand-computed single-flow IRR', () => {
		// One contribution (payday Jan 29 2020), exit exactly 365 days later, pre-cliff payout = 0%
		// → use a synthetic check of the solver instead: 100 out, 110 in after 365 days = 10%.
		const r = xirr([
			{ t: 0, amount: -100 },
			{ t: 365, amount: 110 }
		]);
		expect(r).not.toBeNull();
		expect(r!).toBeCloseTo(0.10, 6);
	});

	it('caps unbounded rates at the upper bound (null → ≥1000%)', () => {
		const r = xirr([
			{ t: 0, amount: -1 },
			{ t: 365, amount: 1e6 }
		]);
		expect(r).toBeNull();
	});

	it('reports a 10-year full-vest exit APR on the known default scenario', () => {
		const r = run({ exitDate: '2030-01-01' });
		expect(r.totals.apr).not.toBeNull();
		expect(r.totals.apr!).toBeGreaterThan(0);
		expect(r.totals.apr!).toBeLessThan(10);
		// Contributions: 120 paydays × 5600. Payout: 100% of A+B+C.
		expect(r.totals.cContributed).toBeCloseTo(120 * 5600, 4);
	});
});

describe('monotonic invariants', () => {
	it('vested payout never exceeds total balances and balances never decrease', () => {
		const r = run({
			exitDate: '2032-06-01',
			salarySteps: [
				{ from: '2020-01-01', monthly: 80_000 },
				{ from: '2023-07-01', monthly: 95_000 }
			],
			window: {
				start: '2020-01-01',
				end: '2028-03-10',
				rateSteps: [
					{ from: '2020-01-01', rate: 7 },
					{ from: '2024-01-01', rate: 4 }
				]
			}
		});
		let prevA = 0;
		let prevC = 0;
		for (const p of r.points) {
			expect(p.a).toBeGreaterThanOrEqual(prevA - 1e-6);
			expect(p.c).toBeGreaterThanOrEqual(prevC - 1e-6);
			prevA = p.a;
			prevC = p.c;
			expect(p.payout).toBeLessThanOrEqual(p.a + p.b + p.c + p.bCollected + 1e-6);
			expect(p.payout).toBeGreaterThanOrEqual(p.c - 1e-6);
		}
	});
});
