import { withApiJsonEvent } from '$lib/server/api-handler.js';
import {
	ownershipRegistryForEvent,
	requireUser
} from '$lib/server/auth-context.js';
import {
	errorNameForAudit,
	recordPrivacyAuditEvent
} from '$lib/server/privacy-audit.js';
import { exportPennyPrivacyData } from '$lib/server/privacy-data.js';

export async function GET(event) {
	return withApiJsonEvent(
		event,
		async (requestEvent) => {
			const user = requireUser(requestEvent);
			const registry = ownershipRegistryForEvent(requestEvent);
			try {
				const exported = await exportPennyPrivacyData({
					registry,
					userId: user.id
				});
				recordPrivacyAuditEvent({
					action: 'privacy.export',
					sessionCount: exported.sessions.length,
					status: 'success',
					userId: user.id
				});
				return exported;
			} catch (error) {
				recordPrivacyAuditEvent({
					action: 'privacy.export',
					errorName: errorNameForAudit(error),
					status: 'failure',
					userId: user.id
				});
				throw error;
			}
		},
		'failed to export privacy data',
		{ timingName: 'privacy_export' }
	);
}
