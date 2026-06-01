export const SESSION_TITLE_MAX_CHARS = 60;

export function titleFromFirstMessage(firstMessage: string): string {
	const source = firstMessage.replace(/\s+/g, ' ').trim();
	if (!source) {
		return 'New chat';
	}
	if (source.length <= SESSION_TITLE_MAX_CHARS) {
		return source;
	}
	return `${source.slice(0, SESSION_TITLE_MAX_CHARS - 1)}…`;
}
