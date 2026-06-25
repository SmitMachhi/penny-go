export type PrivacyAuditAction = 'privacy.delete' | 'privacy.export';
export type PrivacyAuditStatus = 'failure' | 'success';

export type PrivacyAuditEvent = {
	action: PrivacyAuditAction;
	errorName?: string;
	sessionCount?: number;
	status: PrivacyAuditStatus;
	timestamp: string;
	userId: string;
};

type PrivacyAuditInput = Omit<PrivacyAuditEvent, 'timestamp'> & {
	now?: Date;
};

export function recordPrivacyAuditEvent(input: PrivacyAuditInput): void {
	const { now, ...event } = input;
	console.info(
		JSON.stringify({
			...event,
			timestamp: (now ?? new Date()).toISOString()
		} satisfies PrivacyAuditEvent)
	);
}

export function errorNameForAudit(error: unknown): string {
	return error instanceof Error ? error.name : 'UnknownError';
}
