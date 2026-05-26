import { apiJson } from '$lib/chat/api-client.js';
import { formatClientError } from '$lib/chat/format-error.js';
import type { ChatClient } from '$lib/chat/client.svelte.js';
import type { PennySessionView } from '$lib/types/penny-session.js';

export type PennySession = PennySessionView;

type SessionsResponse = {
	sessions?: PennySession[];
};

type CreateSessionResponse = {
	session?: PennySession;
};

export type SessionClientState = {
	sessions: PennySession[];
	loading: boolean;
	error: string | null;
	sidebarOpen: boolean;
};

export function createInitialSessionState(): SessionClientState {
	return {
		sessions: [],
		loading: false,
		error: null,
		sidebarOpen: false
	};
}

function upsertSession(sessions: PennySession[], session: PennySession): PennySession[] {
	const withoutSession = sessions.filter((entry) => entry.key !== session.key);
	return [session, ...withoutSession];
}

export class SessionClient {
	state = $state<SessionClientState>(createInitialSessionState());

	async initSidebar(): Promise<void> {
		await this.refresh();
	}

	async refresh(): Promise<void> {
		this.state.loading = true;
		try {
			const payload = await apiJson<SessionsResponse>('/api/sessions');
			this.state.sessions = payload.sessions ?? [];
			this.state.error = null;
		} catch (error) {
			this.state.error = formatClientError(error, 'failed to load sessions');
		} finally {
			this.state.loading = false;
		}
	}

	async createSession(): Promise<PennySession | null> {
		try {
			const payload = await apiJson<CreateSessionResponse>('/api/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			if (!payload.session) {
				throw new Error('failed to create session');
			}
			const session = payload.session;
			await this.refresh();
			if (!this.state.sessions.some((entry) => entry.key === session.key)) {
				this.state.sessions = upsertSession(this.state.sessions, session);
			}
			return session;
		} catch (error) {
			this.state.error = formatClientError(error, 'failed to create session');
			return null;
		}
	}

	async renameSession(key: string, label: string): Promise<boolean> {
		try {
			await apiJson(`/api/sessions/${encodeURIComponent(key)}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ label })
			});
			await this.refresh();
			return true;
		} catch (error) {
			this.state.error = formatClientError(error, 'failed to rename session');
			return false;
		}
	}

	async deleteSession(key: string): Promise<boolean> {
		try {
			await apiJson(`/api/sessions/${encodeURIComponent(key)}`, {
				method: 'DELETE'
			});
			this.state.sessions = this.state.sessions.filter((session) => session.key !== key);
			await this.refresh();
			return true;
		} catch (error) {
			this.state.error = formatClientError(error, 'failed to delete session');
			return false;
		}
	}
}
