import type { ToolActivity } from '$lib/chat/messages.js';
import { getToolPresentation } from '$lib/chat/tool-presentations.js';

export type WorkStepPhase = 'pending' | 'running' | 'done' | 'error';

export type WorkStepView = {
	id: string;
	label: string;
	phase: WorkStepPhase;
};

/** Canonical Penny tool order (mode-agnostic). */
export const PENNY_WORK_STEP_ORDER = [
	'search_corpus',
	'read_official_source',
	'web_search',
	'create_funding_brief'
] as const;

const STARTING_STEP_ID = 'starting';
const STARTING_STEP_LABEL = 'Getting started';

function mapToolPhase(phase: ToolActivity['phase']): WorkStepPhase {
	if (phase === 'running') {
		return 'running';
	}
	if (phase === 'error') {
		return 'error';
	}
	return 'done';
}

function resolveStepOrder(tools: readonly ToolActivity[]): string[] {
	const toolNames = new Set(tools.map((tool) => tool.name));
	return PENNY_WORK_STEP_ORDER.filter(
		(name) => name !== 'web_search' || toolNames.has('web_search')
	);
}

function highestReachedIndex(order: string[], toolByName: Map<string, ToolActivity>): number {
	let maxIndex = -1;
	for (let index = 0; index < order.length; index += 1) {
		if (toolByName.has(order[index] ?? '')) {
			maxIndex = index;
		}
	}
	return maxIndex;
}

function phaseForMissingStep(
	index: number,
	lastDoneIndex: number,
	sending: boolean
): WorkStepPhase {
	if (!sending) {
		return 'pending';
	}
	if (index === lastDoneIndex + 1) {
		return 'running';
	}
	return 'pending';
}

export function buildWorkSteps(tools: readonly ToolActivity[], sending: boolean): WorkStepView[] {
	if (!sending) {
		return [];
	}

	if (tools.length === 0) {
		return [{ id: STARTING_STEP_ID, label: STARTING_STEP_LABEL, phase: 'running' }];
	}

	const order = resolveStepOrder(tools);
	const toolByName = new Map(tools.map((tool) => [tool.name, tool]));
	const highestIndex = highestReachedIndex(order, toolByName);

	let lastDoneIndex = -1;
	for (let index = 0; index <= highestIndex; index += 1) {
		const name = order[index];
		if (!name) {
			continue;
		}
		const tool = toolByName.get(name);
		if (tool?.phase === 'done') {
			lastDoneIndex = index;
		}
	}

	let visibleThroughIndex = highestIndex;
	if (sending) {
		const lastReached = order[highestIndex];
		const lastTool = lastReached ? toolByName.get(lastReached) : undefined;
		if (lastTool?.phase === 'done' && visibleThroughIndex < order.length - 1) {
			visibleThroughIndex += 1;
		}
	}

	const steps: WorkStepView[] = [];
	for (let index = 0; index <= visibleThroughIndex; index += 1) {
		const name = order[index];
		if (!name) {
			continue;
		}
		const tool = toolByName.get(name);
		const label = getToolPresentation(name).label;
		if (tool) {
			steps.push({ id: name, label, phase: mapToolPhase(tool.phase) });
			continue;
		}
		steps.push({
			id: name,
			label,
			phase: phaseForMissingStep(index, lastDoneIndex, sending)
		});
	}

	return steps;
}
