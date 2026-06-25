import { ValidationError } from '$lib/server/api-error.js';
import { withApiJsonEvent } from '$lib/server/api-handler.js';
import {
	ownershipRegistryForEvent,
	requireUser
} from '$lib/server/auth-context.js';
import {
	errorNameForAudit,
	recordPrivacyAuditEvent
} from '$lib/server/privacy-audit.js';
import { deletePennyPrivacyData } from '$lib/server/privacy-data.js';

const DELETE_CONFIRMATION = 'DELETE_MY_PENNY_DATA';

type PrivacyDeleteRequest = {
	confirm?: string;
};

async function readPrivacyDeleteRequest(request: Request): Promise<PrivacyDeleteRequest> {
	const body = (await request.json().catch(() => ({}))) as Partial<PrivacyDeleteRequest>;
	return {
		confirm: typeof body.confirm === 'string' ? body.confirm : undefined
	};
}

export async function POST(event) {
	return withApiJsonEvent(
		event,
		async (requestEvent) => {
			const user = requireUser(requestEvent);
			const body = await readPrivacyDeleteRequest(requestEvent.request);
			if (body.confirm !== DELETE_CONFIRMATION) {
				throw new ValidationError('privacy deletion confirmation is required');
			}
			const registry = ownershipRegistryForEvent(requestEvent);
			try {
				const deleted = await deletePennyPrivacyData({
					registry,
					userId: user.id
				});
				recordPrivacyAuditEvent({
					action: 'privacy.delete',
					sessionCount: deleted.deletedSessionCount,
					status: 'success',
					userId: user.id
				});
				return deleted;
			} catch (error) {
				recordPrivacyAuditEvent({
					action: 'privacy.delete',
					errorName: errorNameForAudit(error),
					status: 'failure',
					userId: user.id
				});
				throw error;
			}
		},
		'failed to delete privacy data',
		{ timingName: 'privacy_delete' }
	);
}
