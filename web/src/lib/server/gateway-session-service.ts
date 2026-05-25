import { getGatewayClient } from '$lib/server/gateway-client.js';

const SESSION_LIST_LIMIT = 50;
export const MAIN_AGENT_ID = 'main';

export type GatewaySessionRow = {
	key: string;
	label?: string;
	derivedTitle?: string;
	lastMessagePreview?: string;
	updatedAt: number | null;
};

type SessionsListResult = {
	sessions?: GatewaySessionRow[];
};

export async function listGatewaySessions(): Promise<GatewaySessionRow[]> {
	const client = getGatewayClient();
	const payload = (await client.request('sessions.list', {
		agentId: MAIN_AGENT_ID,
		includeDerivedTitles: true,
		includeLastMessage: true,
		limit: SESSION_LIST_LIMIT,
		includeGlobal: false,
		includeUnknown: false
	})) as SessionsListResult;

	return payload.sessions ?? [];
}

export async function createGatewaySession(input: {
	key: string;
	label?: string;
}): Promise<void> {
	const client = getGatewayClient();
	await client.request('sessions.create', {
		key: input.key,
		agentId: MAIN_AGENT_ID,
		...(input.label ? { label: input.label } : {})
	});
}

export async function patchGatewaySession(input: {
	key: string;
	label: string;
}): Promise<void> {
	const client = getGatewayClient();
	await client.request('sessions.patch', { key: input.key, label: input.label });
}

export async function deleteGatewaySession(input: {
	key: string;
	deleteTranscript: boolean;
}): Promise<void> {
	const client = getGatewayClient();
	await client.request('sessions.delete', {
		key: input.key,
		deleteTranscript: input.deleteTranscript
	});
}
