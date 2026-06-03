import { SESSION_TITLE_MAX_CHARS } from './session-title.ts';

const MAX_UNIQUE_SUFFIX_ATTEMPTS = 99;

export function isLabelInUseMessage(message: string): boolean {
	return message.toLowerCase().includes('label already in use');
}

export function uniqueSessionLabel(
	desired: string,
	takenLabels: Iterable<string>,
	maxLength: number = SESSION_TITLE_MAX_CHARS
): string {
	const base = desired.trim();
	const taken = new Set(
		[...takenLabels]
			.map((label) => label.trim())
			.filter((label) => label.length > 0)
	);

	if (!base) {
		return 'New chat';
	}

	const initial =
		base.length <= maxLength ? base : `${base.slice(0, Math.max(1, maxLength - 1))}…`;
	if (!taken.has(initial)) {
		return initial;
	}

	for (let suffixIndex = 2; suffixIndex <= MAX_UNIQUE_SUFFIX_ATTEMPTS; suffixIndex += 1) {
		const suffix = ` (${suffixIndex})`;
		const stemMax = maxLength - suffix.length;
		const stem =
			base.length <= stemMax ? base : `${base.slice(0, Math.max(1, stemMax - 1))}…`;
		const candidate = `${stem}${suffix}`;
		if (!taken.has(candidate)) {
			return candidate;
		}
	}

	const fallbackSuffix = ' (copy)';
	const stemMax = maxLength - fallbackSuffix.length;
	const stem = base.length <= stemMax ? base : `${base.slice(0, Math.max(1, stemMax - 1))}…`;
	return `${stem}${fallbackSuffix}`;
}
