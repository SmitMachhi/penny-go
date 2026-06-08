export const BLOCK_STATUS_CHARACTERS = ['░', '▒', '▓', '█'] as const;

export const WORKING_STATUS_LINES = [
	'checking evidence',
	'reading official pages',
	'sorting the signal',
	'following the paper trail',
	'testing the fit',
	'building the case',
	'drafting the next move'
] as const;

type BlockStatusTransitionInput = {
	from: string;
	to: string;
	step: number;
	totalSteps: number;
};

const FIRST_STEP = 0;
const FULLY_MASKED_RATIO = 0.5;

function blockForIndex(index: number): string {
	return BLOCK_STATUS_CHARACTERS[index % BLOCK_STATUS_CHARACTERS.length] ?? '░';
}

function visibleCharacterAt(text: string, index: number): string {
	return text[index] ?? ' ';
}

export function blockStatusTransitionText(input: BlockStatusTransitionInput): string {
	if (input.step <= FIRST_STEP) {
		return input.from;
	}
	if (input.step >= input.totalSteps) {
		return input.to;
	}

	const width = Math.max(input.from.length, input.to.length);
	const midpoint = Math.max(1, Math.floor(input.totalSteps * FULLY_MASKED_RATIO));
	const text = input.step < midpoint ? input.from : input.to;
	const visibleCount =
		input.step < midpoint
			? Math.max(0, width - Math.ceil((input.step / midpoint) * width))
			: Math.max(
					0,
					Math.ceil(((input.step - midpoint) / (input.totalSteps - midpoint)) * width)
				);

	return Array.from({ length: width }, (_value, index) => {
		const fromStart = input.step >= midpoint;
		const isVisible = fromStart ? index < visibleCount : index >= width - visibleCount;
		return isVisible ? visibleCharacterAt(text, index) : blockForIndex(index + input.step);
	})
		.join('')
		.trimEnd();
}
