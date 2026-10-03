/** Progresses 0→1 across `duration` via rAF (refresh-rate paced); 0 duration renders instantly. */
export function drawIn(apply: (progress: number) => void, duration: number): () => void {
	if (duration <= 0) {
		apply(1);
		return () => {};
	}
	let raf = 0;
	let start = 0;
	let cancelled = false;
	const easeOut = (p: number) => 1 - (1 - p) ** 3;
	const step = (t: number) => {
		if (cancelled) return;
		if (!start) start = t;
		const p = Math.min(1, (t - start) / duration);
		apply(easeOut(p));
		if (p < 1) raf = requestAnimationFrame(step);
	};
	raf = requestAnimationFrame(step);
	return () => {
		cancelled = true;
		cancelAnimationFrame(raf);
	};
}
