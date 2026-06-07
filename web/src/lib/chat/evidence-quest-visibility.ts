type EvidenceQuestThinkingInput = {
	answerStarted: boolean;
	thinkingText: string;
	statusHeadline: string;
};

const GENERIC_THINKING_LINES = new Set(['Thinking…', 'Thinking...', 'Working for you…']);

function concreteLine(text: string): string {
	const trimmed = text.trim();
	if (GENERIC_THINKING_LINES.has(trimmed)) {
		return '';
	}
	return trimmed;
}

export function resolveEvidenceQuestThinking(input: EvidenceQuestThinkingInput): string {
	const thinking = concreteLine(input.thinkingText);
	if (thinking) {
		return thinking;
	}
	if (input.answerStarted) {
		return '';
	}
	return concreteLine(input.statusHeadline);
}
