import { describe, expect, it } from 'vitest';

import {
	buildConnectParams,
	PENNY_GATEWAY_TOOL_EVENTS_CAP
} from './connect-params.js';
import { PENNY_GATEWAY_OPERATOR_SCOPES } from './penny-gateway-rpc-manifest.js';

describe('buildConnectParams', () => {
	it('requests operator scopes required by GatewayRpc', () => {
		const params = buildConnectParams('test-token');
		expect(params.scopes).toEqual([...PENNY_GATEWAY_OPERATOR_SCOPES]);
	});

	it('advertises tool-events so chat.send registers for live tool SSE', () => {
		const params = buildConnectParams('test-token');
		expect(params.caps).toEqual([PENNY_GATEWAY_TOOL_EVENTS_CAP]);
	});
});
