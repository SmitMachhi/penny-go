import { describe, expect, it } from 'vitest';

import { buildConnectParams } from './connect-params.js';
import { PENNY_GATEWAY_OPERATOR_SCOPES } from './penny-gateway-rpc-manifest.js';

describe('buildConnectParams', () => {
	it('requests operator scopes required by GatewayRpc', () => {
		const params = buildConnectParams('test-token');
		expect(params.scopes).toEqual([...PENNY_GATEWAY_OPERATOR_SCOPES]);
	});
});
