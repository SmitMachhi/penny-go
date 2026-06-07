import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { connect, onDisconnect, onEvent } = vi.hoisted(() => ({
	connect: vi.fn(),
	onDisconnect: vi.fn(),
	onEvent: vi.fn()
}));

vi.mock('$lib/server/gateway-rpc.js', () => ({
	getGatewayRpc: () => ({
		connect,
		onDisconnect,
		onEvent
	})
}));

import { ensureGatewayEventBus, resetGatewayEventBusForTests } from './gateway-events-service.js';

const RECONNECT_DELAY_MS = 1_000;

describe('gateway event bus', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		resetGatewayEventBusForTests();
		connect.mockReset();
		onDisconnect.mockReset();
		onEvent.mockReset();
		connect.mockResolvedValue(undefined);
		onDisconnect.mockReturnValue(() => undefined);
		onEvent.mockReturnValue(() => undefined);
	});

	afterEach(() => {
		resetGatewayEventBusForTests();
		vi.useRealTimers();
	});

	it('retries failed background connects without leaking the rejection', async () => {
		connect.mockRejectedValueOnce(new Error('gateway down')).mockResolvedValue(undefined);

		ensureGatewayEventBus({
			onEvent: vi.fn(),
			shouldReconnect: () => true
		});

		expect(connect).toHaveBeenCalledTimes(1);
		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

		expect(connect).toHaveBeenCalledTimes(2);
	});

	it('does not retry failed background connects after shutdown', async () => {
		connect.mockRejectedValueOnce(new Error('gateway down'));

		ensureGatewayEventBus({
			onEvent: vi.fn(),
			shouldReconnect: () => false
		});

		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

		expect(connect).toHaveBeenCalledTimes(1);
	});
});
