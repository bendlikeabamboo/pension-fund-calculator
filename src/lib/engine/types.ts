export const CONTRIBUTION_RATES = [4, 7, 10] as const;
export type ContributionRate = (typeof CONTRIBUTION_RATES)[number];

import type { YMD } from './dates';

/** Effective-dated monthly salary; applies from `from` until the next step. */
export interface SalaryStep {
	from: string;
	monthly: number;
}

/** Effective-dated voluntary rate; applies from `from` until the next step. */
export interface RateStep {
	from: string;
	rate: ContributionRate;
}

/**
 * Single continuous contribution window. `end` null means "until exit";
 * an end before the exit date is an opt-out (no re-entry — the single
 * window enforces that by construction).
 */
export interface ContributionWindow {
	start: string;
	end: string | null;
	rateSteps: RateStep[];
}

export interface SimulationInput {
	employmentStart: string;
	exitDate: string;
	salarySteps: SalaryStep[];
	window: ContributionWindow;
}

/** One monthly snapshot of the simulation, dated at that month's payday. */
export interface MonthPoint {
	/** Payday (29th) of the month — or the exit date for the terminal point. */
	date: YMD;
	/** Fund A balance (company, tenure-based, always accrues). */
	a: number;
	/** Fund B balance (company match) still held — 0 once collected at opt-out. */
	b: number;
	/** Fund C balance (employee voluntary). */
	c: number;
	/** Company match already collected at an opt-out date ≤ this date. */
	bCollected: number;
	/** Vesting fraction v(tenure) at this date. */
	vesting: number;
	/** Vested exit value if the employee left on this date. */
	payout: number;
	/** Effective APR (XIRR) of voluntary contributions if the employee left on this date; null before the first contribution. */
	apr: number | null;
}

export interface SimTotals {
	/** Total Fund C contributed over the window. */
	cContributed: number;
	/** Company money at exit: Fund A balance plus Fund B (held or collected). */
	companyMoney: number;
	/** Vested payout at the exit date. */
	vestedPayout: number;
	/** Vesting fraction at the exit date. */
	vesting: number;
	/** Effective APR at the exit date; null if no contributions were made. */
	apr: number | null;
	/** Whole months from exit until the next vesting step; null once fully vested. */
	monthsToNextVest: number | null;
}

export interface SimulationResult {
	points: MonthPoint[];
	/** Index of the first point with a Fund C contribution; -1 if none. */
	firstContributionIndex: number;
	totals: SimTotals;
}
