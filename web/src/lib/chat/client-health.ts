import { fetchHealth } from '$lib/chat/client-api.js';
import type { ChatClientState } from '$lib/chat/client-state.js';
import { formatClientError } from '$lib/chat/format-error.js';

const GATEWAY_OFFLINE_MESSAGE = 'OpenClaw gateway is unavailable';

type RefreshGatewayHealthInput = {
	state: ChatClientState;
	wasConnected: boolean;
	onRecovered: (() => void) | null;
	ensureStreamConnected: () => void;
};

export async function refreshGatewayHealth(input: RefreshGatewayHealthInput): Promise<void> {
	try {
		const payload = await fetchHealth();
		input.state.connected = payload.ok === true;
		if (input.state.connected) {
			input.state.connectionError = null;
			if (!input.wasConnected) {
				input.onRecovered?.();
			}
			input.ensureStreamConnected();
			return;
		}
		input.state.connectionError = payload.message ?? GATEWAY_OFFLINE_MESSAGE;
	} catch (error) {
		input.state.connected = false;
		input.state.connectionError = formatClientError(error, GATEWAY_OFFLINE_MESSAGE);
	}
}
