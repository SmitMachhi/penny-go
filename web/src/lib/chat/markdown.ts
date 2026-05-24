import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

const MARKDOWN_SANITIZE_OPTIONS = {
	USE_PROFILES: { html: true },
	ADD_ATTR: ['target', 'rel']
};

marked.setOptions({
	gfm: true,
	breaks: true
});

marked.use({
	renderer: {
		link({ href, title, text }) {
			const titleAttr = title ? ` title="${title}"` : '';
			return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
		}
	}
});

export function renderMarkdown(source: string): string {
	if (!source.trim()) {
		return '';
	}

	const html = marked.parse(source, { async: false }) as string;
	return DOMPurify.sanitize(wrapMarkdownTables(html), MARKDOWN_SANITIZE_OPTIONS);
}

const TABLE_TAG_PATTERN = /<table\b/i;

export function wrapMarkdownTables(html: string): string {
	if (!TABLE_TAG_PATTERN.test(html)) {
		return html;
	}

	return html.replace(/<table\b/g, '<div class="penny-markdown-table-wrap"><table').replace(/<\/table>/g, '</table></div>');
}
