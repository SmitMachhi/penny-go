type ToolJsonResult = {
	content: Array<{ type: 'text'; text: string }>;
	details: Record<string, unknown>;
};

export function toToolJsonResult(result: unknown): ToolJsonResult {
	const details =
		typeof result === 'object' && result !== null
			? (result as Record<string, unknown>)
			: { value: result };

	return {
		content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		details
	};
}
