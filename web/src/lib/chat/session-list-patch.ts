import type { PennySessionView } from '$lib/types/penny-session.js';

const DEFAULT_SESSION_TITLE = 'New chat';

export function mergeSessionListFromServer(
	serverSessions: PennySessionView[],
	localSessions: PennySessionView[]
): PennySessionView[] {
	const localTitleByKey = new Map(
		localSessions
			.filter((session) => session.title !== DEFAULT_SESSION_TITLE)
			.map((session) => [session.key, session] as const)
	);

	return serverSessions.map((serverSession) => {
		const localTitle = localTitleByKey.get(serverSession.key);
		if (localTitle && serverSession.title === DEFAULT_SESSION_TITLE) {
			return localTitle;
		}
		return serverSession;
	});
}

export function bumpSessionInList(sessions: PennySessionView[], key: string): PennySessionView[] {
	const index = sessions.findIndex((session) => session.key === key);
	if (index === -1) {
		return sessions;
	}

	const current = sessions[index];
	const bumped: PennySessionView = {
		...current,
		updatedAt: Date.now()
	};
	const rest = sessions.filter((_, sessionIndex) => sessionIndex !== index);
	return [bumped, ...rest];
}

export function upsertSessionView(
	sessions: PennySessionView[],
	session: PennySessionView
): PennySessionView[] {
	const rest = sessions.filter((entry) => entry.key !== session.key);
	return [session, ...rest];
}

export function replaceSessionView(
	sessions: PennySessionView[],
	session: PennySessionView
): PennySessionView[] {
	const index = sessions.findIndex((entry) => entry.key === session.key);
	if (index === -1) {
		return sessions;
	}

	return sessions.map((entry, entryIndex) => (entryIndex === index ? session : entry));
}
