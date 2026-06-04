export const SESSION_TITLE_MAX_CHARS = 48;

const MARKDOWN_STRIP_PATTERN = /[*_`#>[\]]+/g;
const FIRST_LINE_MAX_CHARS = SESSION_TITLE_MAX_CHARS;

export function titleFromFirstMessage(firstMessage: string): string {
	const firstLine = firstMessage.split(/\r?\n/)[0] ?? '';
	const source = firstLine.replace(MARKDOWN_STRIP_PATTERN, '').replace(/\s+/g, ' ').trim();
	if (!source) {
		return 'New chat';
	}
	if (source.length <= FIRST_LINE_MAX_CHARS) {
		return source;
	}
	return `${source.slice(0, FIRST_LINE_MAX_CHARS - 1)}…`;
}
