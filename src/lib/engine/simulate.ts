import {
	completedYears,
	compareYMD,
	monthRange,
	ordinal,
	paydayOf,
	parseYMD,
	type YMD
} from './dates';
import {
	fundARate,
	nextVestingDate,
	vestingFraction
} from './vesting';
import type {
	MonthPoint,
	RateStep,
	SimulationInput,
	SimulationResult,
	SalaryStep
} from './types';
import { xirr } from './xirr';

interface Step<T> {
	from: YMD;
	value: T;
}

function stepsOf<S, T>(raw: S[], from: (s: S) => string, value: (s: S) => T): Array<Step<T>> {
	return raw
		.map((s) => ({ from: parseYMD(from(s)), value: value(s) }))
		.sort((a, b) => compareYMD(a.from, b.from));
}

function lookup<T>(steps: Array<Step<T>>, t: YMD): T {
	let found: T | undefined;
	for (const s of steps) {
		if (compareYMD(s.from, t) <= 0) found = s.value;
		else break;
	}
	if (found === undefined) throw new Error(`No step effective at ${t.y}-${t.m}-${t.d}`);
	return found;
}

/**
 * Simulate the pension scheme month by month.
 *
 * Contributions and accruals happen on the fixed payday (the 29th of each
 * calendar month, February's last day when shorter) while the employee is
 * employed (employmentStart ≤ payday < exitDate). The month of an exit
 * falling after the payday still gets that payday's accrual; a partial
 * final month before its payday contributes nothing.
 */
export function simulate(input: SimulationInput): SimulationResult {
	const employmentStart = parseYMD(input.employmentStart);
	const exitDate = parseYMD(input.exitDate);
	if (compareYMD(exitDate, employmentStart) <= 0) {
		throw new Error('exitDate must be after employmentStart');
	}
	const salarySteps = stepsOf(input.salarySteps, (s) => s.from, (s) => s.monthly);
	const rateSteps = stepsOf(input.window.rateSteps, (s) => s.from, (s) => s.rate);

	const windowStart = parseYMD(input.window.start);
	const windowEndRaw = input.window.end ? parseYMD(input.window.end) : null;
	// An end at or beyond the exit date is simply "until exit".
	const optOut = windowEndRaw && compareYMD(windowEndRaw, exitDate) < 0 ? windowEndRaw : null;

	let a = 0;
	let b = 0;
	let c = 0;
	let bTotal = 0;
	let bCollected = 0;
	let collected = false;

	const points: MonthPoint[] = [];
	const contributions: Array<{ t: number; amount: number }> = [];
	let firstContributionIndex = -1;

	const payoutAt = (t: YMD): number => {
		const v = vestingFraction(completedYears(employmentStart, t));
		const bPart = collected ? bCollected : v * b;
		return v * a + bPart + c;
	};

	const pushPoint = (date: YMD) => {
		points.push({
			date,
			a,
			b,
			c,
			bCollected,
			vesting: vestingFraction(completedYears(employmentStart, date)),
			payout: payoutAt(date),
			apr: null
		});
	};

	for (const { y, m } of monthRange(employmentStart, exitDate)) {
		const payday = paydayOf(y, m);
		if (compareYMD(payday, employmentStart) < 0) continue;
		if (compareYMD(payday, exitDate) >= 0) continue;

		// Opt-out collection lands between paydays; apply it as soon as reached.
		if (optOut && !collected && compareYMD(payday, optOut) >= 0) {
			bCollected = vestingFraction(completedYears(employmentStart, optOut)) * b;
			b = 0;
			collected = true;
		}

		const salary = lookup(salarySteps, payday);
		const tenure = completedYears(employmentStart, payday);
		a += fundARate(tenure) * salary;

		const windowActive =
			compareYMD(windowStart, payday) <= 0 && (!optOut || compareYMD(payday, optOut) < 0);
		if (windowActive) {
			const rate = lookup(rateSteps, payday) / 100;
			const employee = rate * salary;
			const match = Math.min(rate, 0.07) * salary;
			c += employee;
			b += match;
			bTotal += match;
			contributions.push({ t: ordinal(payday), amount: -employee });
			if (firstContributionIndex === -1) firstContributionIndex = points.length;
		}

		pushPoint(payday);
	}

	if (points.length === 0 || compareYMD(points[points.length - 1].date, exitDate) < 0) {
		pushPoint(exitDate);
	}

	const exitPoint = points[points.length - 1];
	const optOutT = optOut ? ordinal(optOut) : null;

	for (let i = firstContributionIndex === -1 ? points.length : firstContributionIndex; i < points.length; i++) {
		const p = points[i];
		const flows = contributions
			.filter((f) => f.t <= ordinal(p.date))
			.map((f) => ({ t: f.t, amount: f.amount }));
		if (collected && optOutT !== null && optOutT <= ordinal(p.date)) {
			flows.push({ t: optOutT, amount: bCollected });
		}
		flows.push({ t: ordinal(p.date), amount: p.payout });
		p.apr = xirr(flows);
	}

	const nextVest = nextVestingDate(employmentStart, exitDate);

	return {
		points,
		firstContributionIndex,
		totals: {
			cContributed: c,
			companyMoney: a + bTotal,
			vestedPayout: exitPoint.payout,
			vesting: exitPoint.vesting,
			apr: exitPoint.apr,
			monthsToNextVest: nextVest ? Math.max(1, Math.round((ordinal(nextVest) - ordinal(exitDate)) / 30.4375)) : null
		}
	};
}
