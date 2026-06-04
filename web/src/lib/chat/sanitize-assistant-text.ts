const EMBED_TAG_PATTERN = /\[embed\b[^\]]*]\s*/gi;
const MEDIA_PATH_LINE_PATTERN = /^MEDIA:\/.*$/gim;

/** Strip OpenClaw delivery tokens that should never appear in the chat UI. */
export function sanitizeAssistantDisplayText(text: string): string {
	return text.replace(EMBED_TAG_PATTERN, '').replace(MEDIA_PATH_LINE_PATTERN, '').trim();
}
