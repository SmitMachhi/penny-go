import { pingGateway } from '$lib/server/gateway-chat-service.js';

export async function checkPennyHealth() {
	return pingGateway();
}
