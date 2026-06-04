import { markPennyTiming, measurePennyTiming } from '$lib/chat/performance-metrics.js';

export function markArtifactPanelOpen(): void {
	markPennyTiming('artifact_panel_open');
}

export function markFirstMessagePaint(): void {
	markPennyTiming('first_message_paint');
}

export function markSendStart(): void {
	markPennyTiming('send_start');
}

export function markSessionSwitchStart(): void {
	markPennyTiming('session_switch_start');
}

export function measureSessionSwitch(): void {
	markPennyTiming('session_switch_end');
	measurePennyTiming('session_switch', {
		startMark: 'session_switch_start',
		endMark: 'session_switch_end'
	});
}

export function measureSendToFirstToken(): void {
	markPennyTiming('first_token');
	measurePennyTiming('send_to_first_token', {
		startMark: 'send_start',
		endMark: 'first_token'
	});
}
