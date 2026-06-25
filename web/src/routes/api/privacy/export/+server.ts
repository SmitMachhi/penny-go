import { withApiJsonEvent } from '$lib/server/api-handler.js';
import {
	ownershipRegistryForEvent,
	requireUser
} from '$lib/server/auth-context.js';
import { exportPennyPrivacyData } from '$lib/server/privacy-data.js';

export async function GET(event) {
	return withApiJsonEvent(
		event,
		async (requestEvent) => {
			const user = requireUser(requestEvent);
			const registry = ownershipRegistryForEvent(requestEvent);
			return exportPennyPrivacyData({
				registry,
				userId: user.id
			});
		},
		'failed to export privacy data',
		{ timingName: 'privacy_export' }
	);
}
