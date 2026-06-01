export type ApiJsonOptions = {
	timeoutMs?: number;
	signal?: AbortSignal;
};

const DEFAULT_GET_TIMEOUT_MS = 30_000;
const DEFAULT_POST_TIMEOUT_MS = 60_000;

function resolveTimeoutMs(init: RequestInit | undefined, options?: ApiJsonOptions): number {
	if (options?.timeoutMs !== undefined) {
		return options.timeoutMs;
	}
	return init?.method === 'POST' ? DEFAULT_POST_TIMEOUT_MS : DEFAULT_GET_TIMEOUT_MS;
}

function composeRequestSignal(
	timeoutSignal: AbortSignal,
	callerSignal?: AbortSignal
): { signal: AbortSignal; cleanup: () => void } {
	if (!callerSignal || callerSignal.aborted) {
		return { signal: callerSignal ?? timeoutSignal, cleanup: () => {} };
	}

	const controller = new AbortController();
	const abortFromCaller = () => controller.abort(callerSignal.reason);
	const abortFromTimeout = () => controller.abort(timeoutSignal.reason);
	callerSignal.addEventListener('abort', abortFromCaller, { once: true });
	timeoutSignal.addEventListener('abort', abortFromTimeout, { once: true });

	return {
		signal: controller.signal,
		cleanup: () => {
			callerSignal.removeEventListener('abort', abortFromCaller);
			timeoutSignal.removeEventListener('abort', abortFromTimeout);
		}
	};
}

export async function apiJson<T>(
	path: string,
	init?: RequestInit,
	options?: ApiJsonOptions
): Promise<T> {
	const timeoutMs = resolveTimeoutMs(init, options);
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	const requestSignal = composeRequestSignal(controller.signal, options?.signal);

	try {
		const response = await fetch(path, {
			...init,
			signal: requestSignal.signal
		});
		const payload = (await response.json()) as T & { error?: string };
		if (!response.ok) {
			throw new Error(payload.error ?? `request failed: ${response.status}`);
		}
		return payload;
	} finally {
		clearTimeout(timeoutId);
		requestSignal.cleanup();
	}
}
