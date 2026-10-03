import { browser } from '$app/env';

/**
 * Shared refresh-rate probe: samples ~1s of rAF deltas, takes the median and
 * snaps to a common display class (60 / 120 / 144+ Hz). Also honors
 * prefers-reduced-motion, which renders animations instantly.
 */
const probe = $state({ hz: 0, reduced: false });

let started = false;

function measure(): void {
	const done = () => {
		if (probe.hz) return;
		probe.hz = 60;
	};
	if (typeof document === 'undefined' || document.hidden) {
		done();
		return;
	}
	const samples: number[] = [];
	let last = performance.now();
	const t0 = last;
	const tick = (t: number) => {
		const dt = t - last;
		last = t;
		if (dt > 0 && dt < 100) samples.push(dt);
		if (t - t0 < 1000 && samples.length < 240) {
			requestAnimationFrame(tick);
		} else {
			samples.sort((a, b) => a - b);
			const median = samples[Math.floor(samples.length / 2)] ?? 16.7;
			const raw = Math.round(1000 / median);
			probe.hz = raw >= 170 ? 240 : raw >= 100 ? 144 : raw >= 90 ? 120 : 60;
			document.documentElement.dataset.hz = String(probe.hz);
		}
	};
	requestAnimationFrame(tick);
	setTimeout(done, 2000);
}

export function refreshRate(): { hz: number; reduced: boolean } {
	if (browser && !started) {
		started = true;
		probe.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!probe.reduced) measure();
	}
	return probe;
}

/**
 * Wall-time budget for a chart draw-in, paced by the detected refresh class:
 * higher-Hz displays get more (and cheaper) frames over a slightly shorter run.
 */
export function drawInMs(hz: number, reduced: boolean): number {
	if (reduced) return 0;
	if (hz >= 170) return 420;
	if (hz >= 100) return 500;
	return 620;
}
