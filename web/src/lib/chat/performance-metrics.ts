type PerformanceMarks = Pick<Performance, 'mark'>;
type PerformanceMeasures = Pick<Performance, 'measure'>;

type MarkOptions = {
	performanceApi?: PerformanceMarks;
};

type MeasureOptions = {
	startMark: string;
	endMark: string;
	performanceApi?: PerformanceMeasures;
};

function resolvePerformance<T>(provided: T | undefined): T | null {
	if (provided) {
		return provided;
	}
	if (typeof performance === 'undefined') {
		return null;
	}
	return performance as T;
}

function pennyTimingName(name: string): string {
	return `penny:${name}`;
}

export function markPennyTiming(name: string, options?: MarkOptions): void {
	resolvePerformance(options?.performanceApi)?.mark(pennyTimingName(name));
}

export function measurePennyTiming(name: string, options: MeasureOptions): void {
	try {
		resolvePerformance(options.performanceApi)?.measure(
			pennyTimingName(name),
			pennyTimingName(options.startMark),
			pennyTimingName(options.endMark)
		);
	} catch {
		// Missing marks should not affect the user flow being measured.
	}
}
