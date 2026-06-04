import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';

import type { GatewayConfig } from './config.js';
import { parseGatewayFrame, type PendingRequest } from './client-helpers.js';
import { buildConnectParams } from './connect-params.js';
import type { GatewayEventListener, GatewayFrame } from './types.js';

export class GatewayClient {
	private ws: WebSocket | null = null;
	private connectSent = false;
	private connectPromise: Promise<void> | null = null;
	private connected = false;
	private readonly pending = new Map<string, PendingRequest>();
	private readonly listeners = new Set<GatewayEventListener>();
	private readonly disconnectListeners = new Set<() => void>();

	constructor(private readonly config: GatewayConfig) {}

	onDisconnect(listener: () => void): () => void {
		this.disconnectListeners.add(listener);
		return () => this.disconnectListeners.delete(listener);
	}

	onEvent(listener: GatewayEventListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	async connect(): Promise<void> {
		if (this.ws?.readyState === WebSocket.OPEN) {
			return;
		}
		if (this.connectPromise) {
			return this.connectPromise;
		}

		this.connectPromise = new Promise((resolve, reject) => {
			const ws = new WebSocket(this.config.url);
			this.ws = ws;
			this.connectSent = false;
			this.connected = false;

			const fail = (error: Error) => {
				this.connectPromise = null;
				reject(error);
			};

			ws.on('message', (data) => {
				this.handleMessage(String(data), resolve, fail);
			});
			ws.on('error', () => fail(new Error('gateway websocket error')));
			ws.on('close', (code, reason) => {
				if (this.ws !== ws) {
					return;
				}
				this.connectPromise = null;
				this.ws = null;
				this.connected = false;
				this.flushPending(new Error(`gateway closed (${code}): ${reason.toString()}`));
				for (const listener of this.disconnectListeners) {
					listener();
				}
			});
		});

		return this.connectPromise;
	}

	async request(method: string, params?: unknown): Promise<unknown> {
		await this.connect();
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error('gateway not connected');
		}

		const id = randomUUID();
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`gateway request timed out: ${method}`));
			}, this.config.requestTimeoutMs);

			this.pending.set(id, {
				resolve,
				reject,
				timer
			});

			const frame: GatewayFrame = { type: 'req', id, method, params };
			this.ws!.send(JSON.stringify(frame));
		});
	}

	private handleMessage(
		raw: string,
		resolveConnect: () => void,
		rejectConnect: (error: Error) => void
	): void {
		const frame = parseGatewayFrame(raw);
		if (!frame) {
			return;
		}

		if (frame.type === 'event') {
			if (frame.event === 'connect.challenge') {
				this.sendConnect(resolveConnect, rejectConnect);
				return;
			}

			for (const listener of this.listeners) {
				listener(frame.event, frame.payload ?? {});
			}
			return;
		}

		if (frame.type === 'res') {
			const pending = this.pending.get(frame.id);
			if (pending) {
				clearTimeout(pending.timer);
				this.pending.delete(frame.id);
				if (frame.ok) {
					pending.resolve(frame.payload);
				} else {
					pending.reject(new Error(JSON.stringify(frame.error ?? 'gateway request failed')));
				}
			}
		}
	}

	private sendConnect(resolveConnect: () => void, rejectConnect: (error: Error) => void): void {
		if (this.connectSent || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
			return;
		}
		this.connectSent = true;
		const id = randomUUID();
		const timer = setTimeout(() => {
			this.pending.delete(id);
			rejectConnect(new Error('gateway connect timed out'));
		}, this.config.requestTimeoutMs);

		this.pending.set(id, {
			resolve: () => {
				this.connected = true;
				this.connectPromise = null;
				resolveConnect();
			},
			reject: rejectConnect,
			timer
		});

		const params = buildConnectParams(this.config.token);
		this.ws.send(
			JSON.stringify({
				type: 'req',
				id,
				method: 'connect',
				params
			})
		);
	}

	private flushPending(error: Error): void {
		for (const pending of this.pending.values()) {
			clearTimeout(pending.timer);
			pending.reject(error);
		}
		this.pending.clear();
	}
}
