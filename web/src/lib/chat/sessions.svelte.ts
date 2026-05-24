import {
	clearActiveSessionKey,
	pickBootstrapSessionKey,
	readActiveSessionKey,
	writeActiveSessionKey
} from '$lib/chat/active-session.js';
import type { ChatClient } from '$lib/chat/client.svelte.js';

export type PennySession = {
	key: string;
	title: string;
	preview: string | null;
	updatedAt: number | null;
	isLegacy: boolean;
};

type SessionsResponse = {
	sessions?: PennySession[];
	error?: string;
};

type CreateSessionResponse = {
	session?: PennySession;
	error?: string;
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

export class SessionClient {
	state = $state<SessionClientState>(createInitialSessionState());

	async bootstrap(chat: ChatClient): Promise<string | null> {
		await this.refresh();
		let activeKey = pickBootstrapSessionKey(readActiveSessionKey(), this.state.sessions);

		if (!activeKey && !this.state.error) {
			const created = await this.createSession();
			activeKey = created?.key ?? null;
		}

		if (activeKey) {
			writeActiveSessionKey(activeKey);
			await chat.switchSession(activeKey);
		} else {
			chat.state.loading = false;
		}

		return activeKey;
	}

	async refresh(): Promise<void> {
		this.state.loading = true;
		try {
			const response = await fetch('/api/sessions');
			const payload = (await response.json()) as SessionsResponse;
			if (!response.ok) {
				throw new Error(payload.error ?? 'failed to load sessions');
			}
			this.state.sessions = payload.sessions ?? [];
			this.state.error = null;
		} catch (error) {
			this.state.error = error instanceof Error ? error.message : 'failed to load sessions';
		} finally {
			this.state.loading = false;
		}
	}

	async createSession(): Promise<PennySession | null> {
		try {
			const response = await fetch('/api/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			const payload = (await response.json()) as CreateSessionResponse;
			if (!response.ok || !payload.session) {
				throw new Error(payload.error ?? 'failed to create session');
			}
			await this.refresh();
			return payload.session;
		} catch (error) {
			this.state.error = error instanceof Error ? error.message : 'failed to create session';
			return null;
		}
	}

	async switchSession(chat: ChatClient, key: string): Promise<void> {
		writeActiveSessionKey(key);
		await chat.switchSession(key);
		this.state.sidebarOpen = false;
	}

	async renameSession(key: string, label: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/sessions/${encodeURIComponent(key)}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ label })
			});
			const payload = (await response.json()) as { error?: string };
			if (!response.ok) {
				throw new Error(payload.error ?? 'failed to rename session');
			}
			await this.refresh();
			return true;
		} catch (error) {
			this.state.error = error instanceof Error ? error.message : 'failed to rename session';
			return false;
		}
	}

	async deleteSession(key: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/sessions/${encodeURIComponent(key)}`, {
				method: 'DELETE'
			});
			const payload = (await response.json()) as { error?: string };
			if (!response.ok) {
				throw new Error(payload.error ?? 'failed to delete session');
			}
			this.state.sessions = this.state.sessions.filter((session) => session.key !== key);
			await this.refresh();
			return true;
		} catch (error) {
			this.state.error = error instanceof Error ? error.message : 'failed to delete session';
			return false;
		}
	}

	async handleDeletedActiveSession(chat: ChatClient, deletedKey: string): Promise<void> {
		if (chat.state.sessionKey !== deletedKey) {
			return;
		}

		const fallback = this.state.sessions.find((session) => session.key !== deletedKey);
		if (fallback) {
			await this.switchSession(chat, fallback.key);
			return;
		}

		const created = await this.createSession();
		if (created) {
			await this.switchSession(chat, created.key);
			return;
		}

		chat.dispose();
		clearActiveSessionKey();
		chat.state.sessionKey = '';
		chat.state.sessionId = null;
		chat.state.messages = [];
		chat.state.streamText = '';
		chat.state.tools = [];
		chat.state.loading = false;
		chat.state.sending = false;
	}
}
