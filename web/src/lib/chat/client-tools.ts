import type { ToolActivity } from '$lib/chat/messages.js';

export function upsertTool(
	tools: ToolActivity[],
	name: string,
	phase: ToolActivity['phase']
): ToolActivity[] {
	const existing = tools.find((tool) => tool.name === name);
	if (existing) {
		return tools.map((tool) => (tool.name === name ? { ...tool, phase } : tool));
	}
	return [...tools, { id: crypto.randomUUID(), name, phase }];
}
