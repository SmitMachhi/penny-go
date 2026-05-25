import { getGatewayClient } from '$lib/server/gateway-client.js';

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

export type ListGatewaySessionsInput = {
	agentId: string;
	limit: number;
	includeDerivedTitles: boolean;
	includeLastMessage: boolean;
	includeGlobal: boolean;
	includeUnknown: boolean;
};

export async function listGatewaySessions(
	input: ListGatewaySessionsInput
): Promise<GatewaySessionRow[]> {
	const client = getGatewayClient();
	const payload = (await client.request('sessions.list', input)) as SessionsListResult;

	return payload.sessions ?? [];
}

export async function createGatewaySession(input: {
	key: string;
	agentId: string;
	label?: string;
}): Promise<void> {
	const client = getGatewayClient();
	await client.request('sessions.create', {
		key: input.key,
		agentId: input.agentId,
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
