import { addYearsClamped, compareYMD, type YMD } from './dates';

/**
 * Vesting fraction of company money by completed years of tenure:
 * below 5 years fully forfeited, 50% at year 5, +10% per year, 100% at year 10.
 */
export function vestingFraction(completedYears: number): number {
	if (completedYears >= 10) return 1;
	if (completedYears >= 5) return completedYears / 10;
	return 0;
}

/** Fund A accrual rate: 4% of salary below 4 years of tenure, 8% from the 4th anniversary. */
export function fundARate(completedYears: number): number {
	return completedYears < 4 ? 0.04 : 0.08;
}

/** Next anniversary at which the vesting fraction increases, strictly after `t`; null once fully vested. */
export function nextVestingDate(employmentStart: YMD, t: YMD): YMD | null {
	for (let years = 5; years <= 10; years++) {
		const d = addYearsClamped(employmentStart, years);
		if (compareYMD(d, t) > 0) return d;
	}
	return null;
}
