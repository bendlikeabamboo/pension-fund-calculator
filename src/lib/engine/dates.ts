export interface YMD {
	y: number;
	m: number;
	d: number;
}

export function ymd(y: number, m: number, d: number): YMD {
	return { y, m, d };
}

export function parseYMD(s: string): YMD {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!match) throw new Error(`Invalid date: ${s}`);
	const y = Number(match[1]);
	const m = Number(match[2]);
	const d = Number(match[3]);
	if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) throw new Error(`Invalid date: ${s}`);
	return { y, m, d };
}

export function formatYMD(t: YMD): string {
	return `${String(t.y).padStart(4, '0')}-${String(t.m).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`;
}

export function isLeap(y: number): boolean {
	return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
	switch (m) {
		case 2:
			return isLeap(y) ? 29 : 28;
		case 4:
		case 6:
		case 9:
		case 11:
			return 30;
		default:
			return 31;
	}
}

/** Days since 1970-01-01. Pure calendar arithmetic, no timezone. */
export function ordinal(t: YMD): number {
	return Date.UTC(t.y, t.m - 1, t.d) / 86_400_000;
}

export function compareYMD(a: YMD, b: YMD): number {
	return ordinal(a) - ordinal(b);
}

export function daysBetween(a: YMD, b: YMD): number {
	return ordinal(b) - ordinal(a);
}

/** Add calendar years, clamping Feb 29 to Feb 28 in non-leap target years. */
export function addYearsClamped(t: YMD, n: number): YMD {
	const y = t.y + n;
	return ymd(y, t.m, Math.min(t.d, daysInMonth(y, t.m)));
}

/**
 * The fixed payday: the 29th of the month. February without a 29th pays on
 * its last day instead, so every month has exactly one payday.
 */
export function paydayOf(y: number, m: number): YMD {
	return ymd(y, m, Math.min(29, daysInMonth(y, m)));
}

/** Completed years of service at t (t >= start), Feb-29 starts included. */
export function completedYears(start: YMD, t: YMD): number {
	let years = t.y - start.y;
	if (years > 0) {
		const anniversary = addYearsClamped(start, years);
		if (compareYMD(t, anniversary) < 0) years -= 1;
	}
	return Math.max(0, years);
}

/** Month iteration helper: yields (y, m) from a's month up to and including b's month. */
export function monthRange(a: YMD, b: YMD): Array<{ y: number; m: number }> {
	const out: Array<{ y: number; m: number }> = [];
	let y = a.y;
	let m = a.m;
	while (y < b.y || (y === b.y && m <= b.m)) {
		out.push({ y, m });
		m += 1;
		if (m > 12) {
			m = 1;
			y += 1;
		}
	}
	return out;
}

/** Whole months from a to b, rounded up over partial months. */
export function monthsUntil(a: YMD, b: YMD): number {
	const days = daysBetween(a, b);
	if (days <= 0) return 0;
	return Math.ceil(days / 30.4375);
}
