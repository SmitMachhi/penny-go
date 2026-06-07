const ALLOWED_TAGS = new Set([
	'a',
	'blockquote',
	'br',
	'code',
	'div',
	'em',
	'h1',
	'h2',
	'h3',
	'h4',
	'hr',
	'li',
	'ol',
	'p',
	'pre',
	'strong',
	'span',
	'table',
	'tbody',
	'td',
	'th',
	'thead',
	'tr',
	'ul'
]);

const ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'class']);

function escapeHtmlAttribute(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function sanitizeAttributes(tagName: string, rawAttrs: string): string {
	if (!rawAttrs.trim()) {
		return '';
	}

	const attrs: string[] = [];
	const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
	for (const match of rawAttrs.matchAll(attrPattern)) {
		const name = match[1]?.toLowerCase();
		if (!name || !ALLOWED_ATTRS.has(name)) {
			continue;
		}
		const value = match[3] ?? match[4] ?? match[5] ?? '';
		if (name === 'href' && !/^https?:\/\//i.test(value)) {
			continue;
		}
		attrs.push(`${name}="${escapeHtmlAttribute(value)}"`);
	}

	if (tagName === 'a' && !attrs.some((attr) => attr.startsWith('target='))) {
		attrs.push('target="_blank"', 'rel="noopener noreferrer"');
	}

	return attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
}

function sanitizeHtml(html: string): string {
	return html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, tagName: string, rawAttrs: string) => {
		const lowerTag = tagName.toLowerCase();
		if (!ALLOWED_TAGS.has(lowerTag)) {
			return '';
		}
		if (full.startsWith('</')) {
			return `</${lowerTag}>`;
		}
		if (lowerTag === 'br' || lowerTag === 'hr') {
			return `<${lowerTag}>`;
		}
		return `<${lowerTag}${sanitizeAttributes(lowerTag, rawAttrs)}>`;
	});
}

function formatPrintCheckboxes(html: string): string {
	return html.replace(/<input\b[^>]*\btype="checkbox"[^>]*>/gi, '<span class="task-checkbox"></span>');
}

function wrapMarkdownTables(html: string): string {
	if (!/<table\b/i.test(html)) {
		return html;
	}
	return html
		.replace(/<table\b/g, '<div class="brief-table-wrap"><table')
		.replace(/<\/table>/g, '</table></div>');
}

function renderLink(href: string | null | undefined, title: string | null | undefined, text: string): string {
	const safeHref = escapeHtmlAttribute(href ?? '');
	const titleAttr = title ? ` title="${escapeHtmlAttribute(title)}"` : '';
	return `<a href="${safeHref}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
}

export const PROGRAM_PLACEHOLDER_PATTERN = /\{\{program:(\d+)\}\}/g;

export function extractProgramPlaceholderIndices(markdown: string): number[] {
	const indices: number[] = [];
	for (const match of markdown.matchAll(PROGRAM_PLACEHOLDER_PATTERN)) {
		const index = Number.parseInt(match[1] ?? '', 10);
		if (!Number.isNaN(index)) {
			indices.push(index);
		}
	}
	return indices;
}

export function splitProgramPlaceholderMarkdown(
	markdown: string
): Array<{ type: 'markdown'; value: string } | { type: 'program'; index: number }> {
	const segments: Array<{ type: 'markdown'; value: string } | { type: 'program'; index: number }> = [];
	let lastIndex = 0;
	for (const match of markdown.matchAll(PROGRAM_PLACEHOLDER_PATTERN)) {
		const matchIndex = match.index ?? 0;
		if (matchIndex > lastIndex) {
			segments.push({ type: 'markdown', value: markdown.slice(lastIndex, matchIndex) });
		}
		const programIndex = Number.parseInt(match[1] ?? '', 10);
		if (!Number.isNaN(programIndex)) {
			segments.push({ type: 'program', index: programIndex });
		}
		lastIndex = matchIndex + match[0].length;
	}
	if (lastIndex < markdown.length) {
		segments.push({ type: 'markdown', value: markdown.slice(lastIndex) });
	}
	return segments;
}

export function renderBriefMarkdown(source: string, marked: typeof import('marked').marked): string {
	if (!source.trim()) {
		return '';
	}

	marked.setOptions({ gfm: true, breaks: true });
	marked.use({
		renderer: {
			link({ href, title, text }) {
				return renderLink(href, title, text);
			}
		}
	});

	const html = marked.parse(source, { async: false }) as string;
	return sanitizeHtml(formatPrintCheckboxes(wrapMarkdownTables(html)));
}
