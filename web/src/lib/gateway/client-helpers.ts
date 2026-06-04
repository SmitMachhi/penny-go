import type { GatewayFrame } from './types.js';

export type PendingRequest = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
};

export function parseGatewayFrame(raw: string): GatewayFrame | null {
	try {
		return JSON.parse(raw) as GatewayFrame;
	} catch {
		return null;
	}
}
