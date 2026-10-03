const phpFormatter = new Intl.NumberFormat('en-PH', {
	style: 'currency',
	currency: 'PHP',
	maximumFractionDigits: 0
});

const phpCompactFormatter = new Intl.NumberFormat('en-PH', {
	style: 'currency',
	currency: 'PHP',
	maximumFractionDigits: 1,
	notation: 'compact'
});

/** ₱1,234,567 — display-only rounding; the engine keeps full precision. */
export function php(n: number): string {
	return phpFormatter.format(n);
}

/** ₱1.2M — compact form for chart axis ticks. */
export function phpCompact(n: number): string {
	return phpCompactFormatter.format(n);
}

/** "12.3%" from a decimal rate; renders "≥1000%" for the XIRR cap. */
export function aprLabel(r: number | null): string {
	if (r === null) return '≥1000%';
	return `${(r * 100).toFixed(1)}%`;
}

const monthFormatter = new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric' });

/** "Jan 2026" from engine date parts (UTC-pinned to avoid TZ drift). */
export function monthLabel(y: number, m: number, d: number): string {
	return monthFormatter.format(new Date(Date.UTC(y, m - 1, d)));
}

/** "Mar 2026" style label from an ISO date string. */
export function isoMonthLabel(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	return monthLabel(y, m, d);
}
