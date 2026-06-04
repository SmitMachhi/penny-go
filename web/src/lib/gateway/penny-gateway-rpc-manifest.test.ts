import { describe, expect, it } from 'vitest';

import {
	OPERATOR_ADMIN_SCOPE,
	OPERATOR_READ_SCOPE,
	OPERATOR_WRITE_SCOPE,
	PENNY_GATEWAY_OPERATOR_SCOPES,
	PENNY_GATEWAY_RPC_REQUIRED_SCOPES,
	pennyConnectScopesAuthorizeMethod
} from './penny-gateway-rpc-manifest.js';

describe('PENNY_GATEWAY_OPERATOR_SCOPES', () => {
	it('derives connect scopes from every RPC requirement', () => {
		const required = [...new Set(Object.values(PENNY_GATEWAY_RPC_REQUIRED_SCOPES))];
		expect(PENNY_GATEWAY_OPERATOR_SCOPES).toEqual(
			expect.arrayContaining(required)
		);
		expect(PENNY_GATEWAY_OPERATOR_SCOPES).toContain(OPERATOR_ADMIN_SCOPE);
	});

	it('authorizes every GatewayRpc method', () => {
		for (const method of Object.keys(PENNY_GATEWAY_RPC_REQUIRED_SCOPES)) {
			const auth = pennyConnectScopesAuthorizeMethod(
				method as keyof typeof PENNY_GATEWAY_RPC_REQUIRED_SCOPES,
				PENNY_GATEWAY_OPERATOR_SCOPES
			);
			expect(auth.allowed, method).toBe(true);
		}
	});

	it('fails sessions.delete without operator.admin', () => {
		const auth = pennyConnectScopesAuthorizeMethod('sessions.delete', [
			OPERATOR_READ_SCOPE,
			OPERATOR_WRITE_SCOPE
		]);
		expect(auth).toEqual({ allowed: false, missingScope: OPERATOR_ADMIN_SCOPE });
	});
});
