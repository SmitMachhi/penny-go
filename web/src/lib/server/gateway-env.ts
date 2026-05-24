import { env } from '$env/dynamic/private';

import { loadGatewayConfig, type GatewayConfig } from '$lib/gateway/config.js';

export function getGatewayConfig(): GatewayConfig {
	return loadGatewayConfig(env as unknown as NodeJS.ProcessEnv);
}
