import { parsePennySessionUuid } from '@penny/shared/session-key';

import type { PennySessionView } from '$lib/types/penny-session.js';
import type { PennySessionOwnershipRegistry } from '$lib/server/penny-session-ownership.js';

type QueryError = {
	message: string;
};

type QueryResult<T> = {
	data: T | null;
	error: QueryError | null;
};

type MutationResult = {
	error: QueryError | null;
};

type OwnedSessionRow = {
	session_key: string;
	title: string;
	updated_at: string;
};

type OwnedSessionInsert = {
	session_key: string;
	session_uuid: string;
	title: string;
	updated_at: string;
};

type OwnedSessionUpdate = {
	title?: string;
	updated_at: string;
};

type SelectBuilder<T> = {
	eq(column: 'session_key', value: string): {
		maybeSingle(): Promise<QueryResult<T>>;
	};
	order(column: 'updated_at', options: { ascending: boolean }): Promise<QueryResult<T[]>>;
};

type UpdateBuilder = {
	eq(column: 'session_key', value: string): Promise<MutationResult>;
};

export type PennySessionsTableClient = {
	from(table: 'penny_sessions'): {
		delete(): UpdateBuilder;
		insert(row: OwnedSessionInsert): Promise<MutationResult>;
		select<T extends OwnedSessionRow>(columns: string): SelectBuilder<T>;
		update(row: OwnedSessionUpdate): UpdateBuilder;
	};
};

function throwOnQueryError(error: QueryError | null): void {
	if (error) {
		throw new Error(error.message);
	}
}

function toUpdatedAt(value: number | null): string {
	return new Date(value ?? Date.now()).toISOString();
}

function toView(row: OwnedSessionRow): PennySessionView {
	return {
		key: row.session_key,
		title: row.title,
		titleStatus: 'ready',
		updatedAt: Date.parse(row.updated_at),
		isLegacy: false
	};
}

export function createSupabasePennySessionOwnershipStore(
	client: PennySessionsTableClient
): PennySessionOwnershipRegistry {
	return {
		async hasSession(sessionKey: string): Promise<boolean> {
			const result = await client
				.from('penny_sessions')
				.select<OwnedSessionRow>('session_key')
				.eq('session_key', sessionKey)
				.maybeSingle();
			throwOnQueryError(result.error);
			return Boolean(result.data);
		},

		async listSessions(): Promise<PennySessionView[]> {
			const result = await client
				.from('penny_sessions')
				.select<OwnedSessionRow>('session_key,title,updated_at')
				.order('updated_at', { ascending: false });
			throwOnQueryError(result.error);
			return (result.data ?? []).map(toView);
		},

		async createSession(session: PennySessionView): Promise<void> {
			const sessionUuid = parsePennySessionUuid(session.key);
			if (!sessionUuid) {
				throw new Error('invalid_session_key');
			}
			const result = await client.from('penny_sessions').insert({
				session_key: session.key,
				session_uuid: sessionUuid,
				title: session.title,
				updated_at: toUpdatedAt(session.updatedAt)
			});
			throwOnQueryError(result.error);
		},

		async updateSession(session: PennySessionView): Promise<void> {
			const result = await client
				.from('penny_sessions')
				.update({
					title: session.title,
					updated_at: toUpdatedAt(session.updatedAt)
				})
				.eq('session_key', session.key);
			throwOnQueryError(result.error);
		},

		async deleteSession(sessionKey: string): Promise<void> {
			const result = await client
				.from('penny_sessions')
				.delete()
				.eq('session_key', sessionKey);
			throwOnQueryError(result.error);
		}
	};
}
