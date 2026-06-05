import { containsActionableLoanLikeLanguage } from '@penny/shared/funding-benefit-scope';

const EMBED_TAG_PATTERN = /\[embed\b[^\]]*]\s*/gi;
const MEDIA_PATH_LINE_PATTERN = /^MEDIA:\/.*$/gim;
const ARTIFACT_MARKDOWN_LINK_PATTERN =
	/\[([^\]]*)\]\((?:https?:\/\/[^/]+)?\/api\/artifacts\/[^)]+\)/gi;
const ARTIFACT_RAW_URL_PATTERN = /(?:https?:\/\/[^\s)>"]+)?\/api\/artifacts\/[^\s)>"]+/gi;
const FUNDING_SCOPE_CORRECTION_TEXT =
	'I caught a scope issue in my draft: one program I was about to describe does not fit your non-loan requirement. I need to rerun the search and return only verified non-loan options.';

/** Strip OpenClaw delivery tokens that should never appear in the chat UI. */
export function sanitizeAssistantDisplayText(text: string): string {
	const cleaned = text
		.replace(EMBED_TAG_PATTERN, '')
		.replace(MEDIA_PATH_LINE_PATTERN, '')
		.replace(ARTIFACT_MARKDOWN_LINK_PATTERN, '$1')
		.replace(ARTIFACT_RAW_URL_PATTERN, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	return containsActionableLoanLikeLanguage(cleaned) ? FUNDING_SCOPE_CORRECTION_TEXT : cleaned;
}
