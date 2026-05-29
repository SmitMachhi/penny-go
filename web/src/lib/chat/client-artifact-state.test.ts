import { describe, expect, it, vi } from 'vitest';

import type { ArtifactSummary } from './artifacts.js';
import {
	applyLoadedArtifacts,
	snapshotArtifactVersions,
	syncChangedLatestArtifact
} from './client-artifact-state.js';
import { ChatClient } from './client.svelte.js';
import { createInitialChatState } from './client-state.js';

const SESSION_A = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';
const SESSION_B = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';

function artifact(artifactId: string, version: number): ArtifactSummary {
	return {
		artifactId,
		programCount: 1,
		title: `Brief ${artifactId}`,
		updatedAt: '2026-05-29T00:00:00.000Z',
		version
	};
}

describe('client artifact state', () => {
	it('does not link an unchanged existing artifact to a new reply', () => {
		const state = createInitialChatState();
		applyLoadedArtifacts(state, [artifact('existing', 1)]);
		const snapshot = snapshotArtifactVersions(state.artifacts);
		const pendingIds: string[] = [];

		syncChangedLatestArtifact(state, pendingIds, snapshot);

		expect(pendingIds).toEqual([]);
	});

	it('links the latest artifact when the run changes its version', () => {
		const state = createInitialChatState();
		applyLoadedArtifacts(state, [artifact('brief', 1)]);
		const snapshot = snapshotArtifactVersions(state.artifacts);
		applyLoadedArtifacts(state, [artifact('brief', 2)]);
		const pendingIds: string[] = [];

		syncChangedLatestArtifact(state, pendingIds, snapshot);

		expect(pendingIds).toEqual(['brief']);
	});

	it('ignores stale artifact responses after the active session changes', async () => {
		let resolveFirstLoad: (response: Response) => void = () => {};
		const firstLoad = new Promise<Response>((resolve) => {
			resolveFirstLoad = resolve;
		});
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = String(input);
			if (path.includes(encodeURIComponent(SESSION_A))) {
				return firstLoad;
			}
			return Response.json({ artifacts: [artifact('session-b', 1)] });
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_A;
		const staleLoad = client.loadArtifacts();
		client.state.sessionKey = SESSION_B;
		await client.loadArtifacts();
		resolveFirstLoad(Response.json({ artifacts: [artifact('session-a', 1)] }));
		await staleLoad;

		expect(client.state.artifacts.map((entry) => entry.artifactId)).toEqual(['session-b']);
		vi.unstubAllGlobals();
	});
});
