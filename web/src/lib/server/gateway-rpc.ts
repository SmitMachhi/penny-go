import type { ChatSendResult, GatewayEventListener, GatewaySessionRow, ListGatewaySessionsInput } from '$lib/gateway/types.js';
import { getGatewayClient } from '$lib/server/gateway-client.js';

type ChatHistoryPayload = {
	messages?: unknown[];
	sessionId?: string;
};

type SessionsListResult = {
	sessions?: GatewaySessionRow[];
};

export class GatewayRpc {
	async chatHistory(input: { sessionKey: string; limit: number; maxChars: number }) {
		const payload = (await getGatewayClient().request('chat.history', input)) as ChatHistoryPayload;
		return {
			sessionKey: input.sessionKey,
			sessionId: payload.sessionId,
			messages: payload.messages ?? []
		};
	}

	async chatSend(input: {
		sessionKey: string;
		message: string;
		sessionId?: string;
		deliver: boolean;
		idempotencyKey: string;
	}) {
		const response = (await getGatewayClient().request('chat.send', {
			sessionKey: input.sessionKey,
			...(input.sessionId ? { sessionId: input.sessionId } : {}),
			message: input.message,
			deliver: input.deliver,
			idempotencyKey: input.idempotencyKey
		})) as ChatSendResult;

		return {
			runId: response.runId ?? input.idempotencyKey,
			sessionKey: input.sessionKey
		};
	}

	async chatAbort(input: { sessionKey: string; runId?: string }) {
		await getGatewayClient().request(
			'chat.abort',
			input.runId ? { sessionKey: input.sessionKey, runId: input.runId } : { sessionKey: input.sessionKey }
		);
	}

	async sessionsList(input: ListGatewaySessionsInput): Promise<GatewaySessionRow[]> {
		const payload = (await getGatewayClient().request('sessions.list', input)) as SessionsListResult;
		return payload.sessions ?? [];
	}

	async sessionsCreate(input: { key: string; agentId: string; label?: string }) {
		await getGatewayClient().request('sessions.create', {
			key: input.key,
			agentId: input.agentId,
			...(input.label ? { label: input.label } : {})
		});
	}

	async sessionsPatch(input: { key: string; label: string }) {
		await getGatewayClient().request('sessions.patch', { key: input.key, label: input.label });
	}

	async sessionsDelete(input: { key: string; deleteTranscript: boolean }) {
		await getGatewayClient().request('sessions.delete', {
			key: input.key,
			deleteTranscript: input.deleteTranscript
		});
	}

	async connect() {
		await getGatewayClient().connect();
	}

	onEvent(listener: GatewayEventListener): () => void {
		return getGatewayClient().onEvent(listener);
	}

	onDisconnect(listener: () => void): () => void {
		return getGatewayClient().onDisconnect(listener);
	}
}

let sharedRpc: GatewayRpc | null = null;

export function getGatewayRpc(): GatewayRpc {
	if (!sharedRpc) {
		sharedRpc = new GatewayRpc();
	}
	return sharedRpc;
}

export function resetGatewayRpcForTests(): void {
	sharedRpc = null;
}

export type { GatewaySessionRow, ListGatewaySessionsInput };
