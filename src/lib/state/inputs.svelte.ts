import { browser } from '$app/env';
import { parseYMD } from '#lib/engine/dates';
import { simulate } from '#lib/engine/simulate';
import type { SimulationResult } from '#lib/engine/types';
import { CONTRIBUTION_RATES, type ContributionRate, type RateStep, type SalaryStep } from '#lib/engine/types';

const STORAGE_KEY = 'pension-fund-simulator';
const STORAGE_VERSION = 1;

export interface InputsModel {
	employmentStart: string;
	exitDate: string;
	salarySteps: SalaryStep[];
	window: {
		start: string;
		end: string | null;
		rateSteps: RateStep[];
	};
}

export type ValidationErrors = Record<string, string>;

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

/** First paint scenario: start = first of current month, exit = +15 years, ₱80k salary, 7% throughout. */
export function defaultModel(): InputsModel {
	const now = new Date();
	const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
	const exit = `${now.getFullYear() + 15}-${pad(now.getMonth() + 1)}-01`;
	return {
		employmentStart: start,
		exitDate: exit,
		salarySteps: [{ from: start, monthly: 80_000 }],
		window: { start, end: null, rateSteps: [{ from: start, rate: 7 }] }
	};
}

function isValidISO(s: string): boolean {
	try {
		parseYMD(s);
		return true;
	} catch {
		return false;
	}
}

export function validate(model: InputsModel): ValidationErrors {
	const errors: ValidationErrors = {};

	if (!model.employmentStart) errors.employmentStart = 'Employment start is required.';
	else if (!isValidISO(model.employmentStart)) errors.employmentStart = 'Enter a valid date.';

	if (!model.exitDate) errors.exitDate = 'Exit date is required.';
	else if (!isValidISO(model.exitDate)) errors.exitDate = 'Enter a valid date.';

	if (!errors.employmentStart && !errors.exitDate && model.exitDate <= model.employmentStart) {
		errors.exitDate = 'Exit must be after the employment start.';
	}

	if (!model.window.start) errors['window.start'] = 'Contribution start is required.';
	else if (!isValidISO(model.window.start)) errors['window.start'] = 'Enter a valid date.';
	else if (isValidISO(model.employmentStart) && model.window.start < model.employmentStart) {
		errors['window.start'] = 'Cannot start before employment.';
	}

	if (model.window.end) {
		if (!isValidISO(model.window.end)) errors['window.end'] = 'Enter a valid date.';
		else if (isValidISO(model.window.start) && model.window.end <= model.window.start) {
			errors['window.end'] = 'Must be after the contribution start.';
		}
	}

	model.salarySteps.forEach((step, i) => {
		if (!isValidISO(step.from) || step.from < model.employmentStart) {
			errors[`salary.${i}.from`] = 'Enter a date on or after employment start.';
		}
		if (!(step.monthly > 0)) {
			errors[`salary.${i}.monthly`] = 'Enter a positive amount.';
		}
		if (i > 0 && isValidISO(step.from) && isValidISO(model.salarySteps[i - 1].from) && step.from <= model.salarySteps[i - 1].from) {
			errors[`salary.${i}.from`] = 'Must be after the previous step.';
		}
	});

	model.window.rateSteps.forEach((step, i) => {
		if (!isValidISO(step.from) || step.from < model.window.start) {
			errors[`window.rate.${i}.from`] = 'Enter a date on or after the contribution start.';
		}
		if (!CONTRIBUTION_RATES.includes(step.rate)) {
			errors[`window.rate.${i}.rate`] = 'Rate must be 4%, 7% or 10%.';
		}
		if (i > 0 && isValidISO(step.from) && isValidISO(model.window.rateSteps[i - 1].from) && step.from <= model.window.rateSteps[i - 1].from) {
			errors[`window.rate.${i}.from`] = 'Must be after the previous step.';
		}
	});

	return errors;
}

function load(): InputsModel | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { version?: number; inputs?: InputsModel };
		if (parsed.version !== STORAGE_VERSION || !parsed.inputs) return null;
		const d = defaultModel();
		const i = parsed.inputs;
		// Shape check with defaults as fallback for forward compatibility.
		return {
			employmentStart: typeof i.employmentStart === 'string' ? i.employmentStart : d.employmentStart,
			exitDate: typeof i.exitDate === 'string' ? i.exitDate : d.exitDate,
			salarySteps: Array.isArray(i.salarySteps)
				? i.salarySteps.filter((s) => s && typeof s.from === 'string' && typeof s.monthly === 'number')
				: d.salarySteps,
			window: {
				start: typeof i.window?.start === 'string' ? i.window.start : d.window.start,
				end: typeof i.window?.end === 'string' || i.window?.end === null ? i.window.end : d.window.end,
				rateSteps: Array.isArray(i.window?.rateSteps)
					? i.window.rateSteps.filter(
							(s) => s && typeof s.from === 'string' && CONTRIBUTION_RATES.includes(s.rate as ContributionRate)
						)
					: d.window.rateSteps
			}
		};
	} catch {
		return null;
	}
}

export function createSimulator() {
	const model = $state<InputsModel>(load() ?? defaultModel());

	const errors = $derived(validate(model));
	const valid = $derived(Object.keys(errors).length === 0);

	const simulation = $derived.by<SimulationResult | null>(() => {
		if (!valid) return null;
		try {
			return simulate(model);
		} catch {
			return null;
		}
	});

	function reset() {
		Object.assign(model, defaultModel());
	}

	if (browser) {
		$effect(() => {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ version: STORAGE_VERSION, inputs: $state.snapshot(model) })
			);
		});
	}

	return {
		get model() {
			return model;
		},
		get errors() {
			return errors;
		},
		get valid() {
			return valid;
		},
		get simulation() {
			return simulation;
		},
		reset
	};
}

export type Simulator = ReturnType<typeof createSimulator>;
