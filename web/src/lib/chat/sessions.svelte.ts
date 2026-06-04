import { isLabelInUseMessage, uniqueSessionLabel } from '@penny/shared/session-label-unique';
import { titleFromFirstMessage } from '@penny/shared/session-title';

import { forgetSessionThreadCache } from '$lib/chat/session-thread-cache.js';
import { apiJson } from '$lib/chat/api-client.js';
import { formatClientError } from '$lib/chat/format-error.js';
import {
	bumpSessionInList,
	mergeSessionListFromServer,
	replaceSessionView,
	upsertSessionView
} from '$lib/chat/session-list-patch.js';
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
	sidebarCollapsed: boolean;
};

type RefreshOptions = {
	silent?: boolean;
};

const LABEL_PATCH_RETRY_LIMIT = 3;
const DEFAULT_SESSION_TITLE = 'New chat';
const SESSION_INDEX_PATH = '/api/sessions/index';

export function createInitialSessionState(): SessionClientState {
	return {
		sessions: [],
		loading: false,
		error: null,
		sidebarOpen: false,
		sidebarCollapsed: false
	};
}

function revertOptimisticTitle(
	sessions: PennySession[],
	key: string,
	title: string,
	previousSession: PennySession | null
): PennySession[] {
	return sessions.flatMap((session) => {
		if (session.key !== key || session.title !== title) {
			return [session];
		}
		return previousSession ? [previousSession] : [];
	});
}

export class SessionClient {
	state = $state<SessionClientState>(createInitialSessionState());
	private titledSessions = new Set<string>();

	async initSidebar(): Promise<void> {
		await this.refresh();
	}

	async refresh(options?: RefreshOptions): Promise<void> {
		const silent = options?.silent === true;
		const priorSessions = this.state.sessions;
		if (!silent && priorSessions.length === 0) {
			this.state.loading = true;
		}
		try {
			const payload = await apiJson<SessionsResponse>(SESSION_INDEX_PATH);
			this.state.sessions = mergeSessionListFromServer(payload.sessions ?? [], priorSessions);
			this.state.error = null;
		} catch (error) {
			this.state.error = formatClientError(error, 'failed to load sessions');
		} finally {
			if (!silent) {
				this.state.loading = false;
			}
		}
	}

	bumpActiveSession(key: string): void {
		this.state.sessions = bumpSessionInList(this.state.sessions, key);
	}

	setTitleFromFirstMessage(key: string, firstMessage: string): void {
		const trimmed = firstMessage.trim();
		if (!trimmed || this.titledSessions.has(key)) {
			return;
		}

		const session = this.state.sessions.find((entry) => entry.key === key);
		if (session && session.title !== DEFAULT_SESSION_TITLE) {
			return;
		}

		const title = uniqueSessionLabel(
			titleFromFirstMessage(trimmed),
			this.takenLabelsExcept(key)
		);
		const previousSession = session ?? null;
		this.titledSessions.add(key);
		this.state.sessions = upsertSessionView(this.state.sessions, {
			key,
			title,
			titleStatus: 'loading',
			updatedAt: Date.now(),
			isLegacy: session?.isLegacy ?? false
		});
		void this.persistTitle(key, title, previousSession);
	}

	private takenLabelsExcept(excludeKey: string): string[] {
		return this.state.sessions
			.filter((session) => session.key !== excludeKey)
			.map((session) => session.title);
	}

	private async patchSessionLabel(key: string, desiredLabel: string): Promise<string> {
		const taken = new Set(this.takenLabelsExcept(key));
		let candidate = uniqueSessionLabel(desiredLabel, taken);

		for (let attempt = 0; attempt < LABEL_PATCH_RETRY_LIMIT; attempt += 1) {
			try {
				await apiJson(`/api/sessions/${encodeURIComponent(key)}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ label: candidate })
				});
				return candidate;
			} catch (error) {
				const message = formatClientError(error, '');
				if (!isLabelInUseMessage(message)) {
					throw error;
				}
				taken.add(candidate);
				candidate = uniqueSessionLabel(desiredLabel, taken);
			}
		}

		throw new Error('failed to save session title');
	}

	private async persistTitle(
		key: string,
		title: string,
		previousSession: PennySession | null
	): Promise<void> {
		try {
			const savedTitle = await this.patchSessionLabel(key, title);
			if (savedTitle !== title) {
				this.state.sessions = upsertSessionView(this.state.sessions, {
					key,
					title: savedTitle,
					titleStatus: 'ready',
					updatedAt: Date.now(),
					isLegacy:
						this.state.sessions.find((session) => session.key === key)?.isLegacy ?? false
				});
			}
			this.state.error = null;
		} catch (error) {
			this.titledSessions.delete(key);
			this.state.sessions = revertOptimisticTitle(
				this.state.sessions,
				key,
				title,
				previousSession
			);
			this.state.error = formatClientError(error, 'failed to save session title');
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
			this.state.sessions = upsertSessionView(this.state.sessions, session);
			return session;
		} catch (error) {
			this.state.error = formatClientError(error, 'failed to create session');
			return null;
		}
	}

	async renameSession(key: string, label: string): Promise<boolean> {
		const trimmed = label.trim();
		if (!trimmed) {
			return false;
		}

		const uniqueLabel = uniqueSessionLabel(trimmed, this.takenLabelsExcept(key));
		const session = this.state.sessions.find((entry) => entry.key === key);
		const previousSession = session ?? null;

		if (session) {
			this.state.sessions = upsertSessionView(this.state.sessions, {
				...session,
				title: uniqueLabel,
				titleStatus: 'loading',
				updatedAt: Date.now()
			});
		}

		try {
			const savedLabel = await this.patchSessionLabel(key, uniqueLabel);
			if (savedLabel !== uniqueLabel && session) {
				this.state.sessions = upsertSessionView(this.state.sessions, {
					...session,
					title: savedLabel,
					titleStatus: 'ready',
					updatedAt: Date.now()
				});
			}
			this.titledSessions.add(key);
			this.state.error = null;
			return true;
		} catch (error) {
			if (previousSession) {
				this.state.sessions = replaceSessionView(this.state.sessions, previousSession);
			}
			this.state.error = formatClientError(error, 'failed to rename session');
			return false;
		}
	}

	async deleteSession(key: string): Promise<boolean> {
		const previousSessions = this.state.sessions;
		const wasTitled = this.titledSessions.has(key);
		this.state.sessions = previousSessions.filter((session) => session.key !== key);
		this.titledSessions.delete(key);
		forgetSessionThreadCache(key);
		try {
			await apiJson(`/api/sessions/${encodeURIComponent(key)}`, {
				method: 'DELETE'
			});
			this.state.error = null;
			return true;
		} catch (error) {
			this.state.sessions = previousSessions;
			if (wasTitled) {
				this.titledSessions.add(key);
			}
			this.state.error = formatClientError(error, 'failed to delete session');
			return false;
		}
	}
}
