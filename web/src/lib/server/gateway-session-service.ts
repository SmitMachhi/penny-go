import type { GatewaySessionRow, ListGatewaySessionsInput } from '$lib/gateway/types.js';
import { getGatewayRpc } from '$lib/server/gateway-rpc.js';

export type { GatewaySessionRow, ListGatewaySessionsInput };

export async function listGatewaySessions(
	input: ListGatewaySessionsInput
): Promise<GatewaySessionRow[]> {
	return getGatewayRpc().sessionsList(input);
}

export async function createGatewaySession(input: {
	key: string;
	agentId: string;
	label?: string;
}): Promise<void> {
	await getGatewayRpc().sessionsCreate(input);
}

export async function patchGatewaySession(input: {
	key: string;
	label: string;
}): Promise<void> {
	await getGatewayRpc().sessionsPatch(input);
}

export async function deleteGatewaySession(input: {
	key: string;
	deleteTranscript: boolean;
}): Promise<void> {
	await getGatewayRpc().sessionsDelete(input);
}
