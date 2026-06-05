import type { ToolActivity } from '$lib/chat/messages.js';

export type EvidenceQuestStageId = 'ask' | 'find' | 'check' | 'plan';
export type EvidenceQuestPhase = 'pending' | 'active' | 'done';
export type EvidenceQuestTokenKind = 'corpus' | 'source' | 'web' | 'plan';

export type EvidenceQuestStage = {
	id: EvidenceQuestStageId;
	label: string;
	phase: EvidenceQuestPhase;
};

export type EvidenceQuestToken = {
	id: EvidenceQuestTokenKind;
	label: string;
	kind: EvidenceQuestTokenKind;
};

export type EvidenceQuestState = {
	status: string;
	stages: EvidenceQuestStage[];
	tokens: EvidenceQuestToken[];
};

type EvidenceQuestInput = {
	tools: readonly ToolActivity[];
	answerStarted: boolean;
};

type ToolName = 'search_corpus' | 'read_official_source' | 'web_search' | 'create_funding_brief';

const STAGE_LABELS: Record<EvidenceQuestStageId, string> = {
	ask: 'Ask',
	find: 'Find',
	check: 'Check',
	plan: 'Plan'
};

const TOOL_NAMES = {
	searchCorpus: 'search_corpus',
	readOfficialSource: 'read_official_source',
	webSearch: 'web_search',
	createFundingBrief: 'create_funding_brief'
} as const satisfies Record<string, ToolName>;

function hasToolPhase(
	tools: readonly ToolActivity[],
	name: ToolName,
	phase: ToolActivity['phase']
): boolean {
	return tools.some((tool) => tool.name === name && tool.phase === phase);
}

function hasTool(tools: readonly ToolActivity[], name: ToolName): boolean {
	return tools.some((tool) => tool.name === name);
}

function isFindDone(tools: readonly ToolActivity[]): boolean {
	return (
		hasToolPhase(tools, TOOL_NAMES.searchCorpus, 'done') ||
		hasToolPhase(tools, TOOL_NAMES.webSearch, 'done') ||
		hasTool(tools, TOOL_NAMES.readOfficialSource) ||
		hasTool(tools, TOOL_NAMES.createFundingBrief)
	);
}

function isFindActive(tools: readonly ToolActivity[]): boolean {
	return (
		tools.length === 0 ||
		hasToolPhase(tools, TOOL_NAMES.searchCorpus, 'running') ||
		hasToolPhase(tools, TOOL_NAMES.webSearch, 'running')
	);
}

function isCheckDone(tools: readonly ToolActivity[]): boolean {
	return (
		hasToolPhase(tools, TOOL_NAMES.readOfficialSource, 'done') ||
		hasTool(tools, TOOL_NAMES.createFundingBrief)
	);
}

function isCheckActive(tools: readonly ToolActivity[]): boolean {
	return hasToolPhase(tools, TOOL_NAMES.readOfficialSource, 'running');
}

function isPlanDone(tools: readonly ToolActivity[], answerStarted: boolean): boolean {
	return answerStarted || hasToolPhase(tools, TOOL_NAMES.createFundingBrief, 'done');
}

function isPlanActive(tools: readonly ToolActivity[]): boolean {
	return hasToolPhase(tools, TOOL_NAMES.createFundingBrief, 'running') || isCheckDone(tools);
}

function stage(id: EvidenceQuestStageId, phase: EvidenceQuestPhase): EvidenceQuestStage {
	return { id, label: STAGE_LABELS[id], phase };
}

function buildStages(input: EvidenceQuestInput): EvidenceQuestStage[] {
	const findDone = isFindDone(input.tools);
	const checkDone = isCheckDone(input.tools);
	const planDone = isPlanDone(input.tools, input.answerStarted);
	return [
		stage('ask', 'done'),
		stage('find', findDone ? 'done' : isFindActive(input.tools) ? 'active' : 'pending'),
		stage('check', checkDone ? 'done' : isCheckActive(input.tools) ? 'active' : 'pending'),
		stage('plan', planDone ? 'done' : isPlanActive(input.tools) ? 'active' : 'pending')
	];
}

function addToken(
	tokens: EvidenceQuestToken[],
	id: EvidenceQuestTokenKind,
	label: string
): void {
	tokens.push({ id, label, kind: id });
}

function buildTokens(tools: readonly ToolActivity[]): EvidenceQuestToken[] {
	const tokens: EvidenceQuestToken[] = [];
	if (hasToolPhase(tools, TOOL_NAMES.searchCorpus, 'done')) {
		addToken(tokens, 'corpus', 'corpus match');
	}
	if (hasToolPhase(tools, TOOL_NAMES.webSearch, 'done')) {
		addToken(tokens, 'web', 'web source');
	}
	if (hasToolPhase(tools, TOOL_NAMES.readOfficialSource, 'done')) {
		addToken(tokens, 'source', 'official source');
	}
	if (
		hasToolPhase(tools, TOOL_NAMES.createFundingBrief, 'running') ||
		hasToolPhase(tools, TOOL_NAMES.createFundingBrief, 'done')
	) {
		addToken(tokens, 'plan', 'plan building');
	}
	return tokens;
}

function resolveStatus(input: EvidenceQuestInput): string {
	if (input.answerStarted) {
		return 'answering from evidence';
	}
	if (hasToolPhase(input.tools, TOOL_NAMES.createFundingBrief, 'running')) {
		return 'building plan';
	}
	if (hasToolPhase(input.tools, TOOL_NAMES.readOfficialSource, 'running')) {
		return 'checking source';
	}
	if (isFindDone(input.tools) || isCheckDone(input.tools)) {
		return 'building evidence';
	}
	return 'checking evidence';
}

export function buildEvidenceQuestState(input: EvidenceQuestInput): EvidenceQuestState {
	return {
		status: resolveStatus(input),
		stages: buildStages(input),
		tokens: buildTokens(input.tools)
	};
}
