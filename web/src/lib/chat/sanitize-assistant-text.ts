const EMBED_TAG_PATTERN = /\[embed\b[^\]]*]\s*/gi;
const MEDIA_PATH_LINE_PATTERN = /^MEDIA:\/.*$/gim;
const ARTIFACT_MARKDOWN_LINK_PATTERN =
	/\[([^\]]*)\]\((?:https?:\/\/[^/]+)?\/api\/artifacts\/[^)]+\)/gi;
const ARTIFACT_RAW_URL_PATTERN = /(?:https?:\/\/[^\s)>"]+)?\/api\/artifacts\/[^\s)>"]+/gi;

/** Strip OpenClaw delivery tokens that should never appear in the chat UI. */
export function sanitizeAssistantDisplayText(text: string): string {
	return text
		.replace(EMBED_TAG_PATTERN, '')
		.replace(MEDIA_PATH_LINE_PATTERN, '')
		.replace(ARTIFACT_MARKDOWN_LINK_PATTERN, '$1')
		.replace(ARTIFACT_RAW_URL_PATTERN, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
