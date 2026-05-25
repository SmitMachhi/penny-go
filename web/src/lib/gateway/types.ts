export const GATEWAY_PROTOCOL_VERSION = 4;

export type GatewayFrame =
	| { type: 'req'; id: string; method: string; params?: unknown }
	| { type: 'res'; id: string; ok: boolean; payload?: unknown; error?: unknown }
	| { type: 'event'; event: string; payload?: unknown; seq?: number };

export type GatewayEventListener = (event: string, payload: unknown) => void;

export type ChatHistoryResult = {
	messages: unknown[];
	sessionId?: string;
	thinkingLevel?: string;
};

export type ChatSendResult = {
	status: string;
	runId?: string;
};

export type ChatEventPayload = {
	state?: string;
	runId?: string;
	sessionKey?: string;
	deltaText?: string;
	replace?: boolean;
	message?: unknown;
	error?: string;
};

export type AgentEventPayload = {
	stream?: string;
	runId?: string;
	sessionKey?: string;
	data?: {
		tool?: string;
		name?: string;
		phase?: string;
		status?: string;
	};
};

export type GatewaySessionRow = {
	key: string;
	label?: string;
	derivedTitle?: string;
	lastMessagePreview?: string;
	updatedAt: number | null;
};

export type ListGatewaySessionsInput = {
	agentId: string;
	limit: number;
	includeDerivedTitles: boolean;
	includeLastMessage: boolean;
	includeGlobal: boolean;
	includeUnknown: boolean;
};
