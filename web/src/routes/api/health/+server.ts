import { withApiJson } from '$lib/server/api-handler.js';
import { pingGateway } from '$lib/server/gateway-chat-service.js';

export async function GET() {
	return withApiJson(() => pingGateway(), 'gateway unavailable');
}
