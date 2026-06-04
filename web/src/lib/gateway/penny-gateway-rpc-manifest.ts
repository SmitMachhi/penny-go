/** OpenClaw operator scopes used by the Penny BFF gateway client. */
export const OPERATOR_READ_SCOPE = 'operator.read' as const;
export const OPERATOR_WRITE_SCOPE = 'operator.write' as const;
export const OPERATOR_ADMIN_SCOPE = 'operator.admin' as const;

export type OperatorScope =
	| typeof OPERATOR_READ_SCOPE
	| typeof OPERATOR_WRITE_SCOPE
	| typeof OPERATOR_ADMIN_SCOPE;

/**
 * Gateway RPC methods invoked by `GatewayRpc` and the OpenClaw scope each requires.
 * Keep in sync with OpenClaw `core-descriptors.ts` when upgrading the gateway.
 */
export const PENNY_GATEWAY_RPC_REQUIRED_SCOPES = {
	'chat.history': OPERATOR_READ_SCOPE,
	'sessions.list': OPERATOR_READ_SCOPE,
	'chat.send': OPERATOR_WRITE_SCOPE,
	'chat.abort': OPERATOR_WRITE_SCOPE,
	'sessions.create': OPERATOR_WRITE_SCOPE,
	'sessions.patch': OPERATOR_ADMIN_SCOPE,
	'sessions.delete': OPERATOR_ADMIN_SCOPE
} as const satisfies Record<string, OperatorScope>;

export type PennyGatewayRpcMethod = keyof typeof PENNY_GATEWAY_RPC_REQUIRED_SCOPES;

/** Scopes declared on gateway `connect` for the local Penny BFF (token stays server-side). */
export const PENNY_GATEWAY_OPERATOR_SCOPES: readonly OperatorScope[] = [
	OPERATOR_READ_SCOPE,
	OPERATOR_WRITE_SCOPE,
	OPERATOR_ADMIN_SCOPE
];

/** Mirrors OpenClaw `authorizeOperatorScopesForMethod` for Penny's static RPC set. */
export function pennyConnectScopesAuthorizeMethod(
	method: PennyGatewayRpcMethod,
	connectScopes: readonly string[]
): { allowed: true } | { allowed: false; missingScope: OperatorScope } {
	if (connectScopes.includes(OPERATOR_ADMIN_SCOPE)) {
		return { allowed: true };
	}

	const requiredScope = PENNY_GATEWAY_RPC_REQUIRED_SCOPES[method];
	if (requiredScope === OPERATOR_READ_SCOPE) {
		if (
			connectScopes.includes(OPERATOR_READ_SCOPE) ||
			connectScopes.includes(OPERATOR_WRITE_SCOPE)
		) {
			return { allowed: true };
		}
		return { allowed: false, missingScope: OPERATOR_READ_SCOPE };
	}

	if (connectScopes.includes(requiredScope)) {
		return { allowed: true };
	}

	return { allowed: false, missingScope: requiredScope };
}
