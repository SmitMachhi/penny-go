import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

import { isPreviewableHref } from '$lib/chat/link-previewable.js';
import { renderPreviewLinkHtml } from '$lib/chat/link-preview-markup.js';

const MARKDOWN_SANITIZE_OPTIONS = {
	USE_PROFILES: { html: true },
	ADD_ATTR: ['target', 'rel', 'class', 'data-preview-url', 'aria-label', 'aria-hidden']
};

marked.setOptions({
	gfm: true,
	breaks: true
});

marked.use({
	renderer: {
		link({ href, title, text }) {
			const safeHref = escapeHtmlAttribute(href ?? '');
			const titleAttr = title ? ` title="${escapeHtmlAttribute(title)}"` : '';
			const linkText = escapeHtmlAttribute(text);

			if (isPreviewableHref(href)) {
				return renderPreviewLinkHtml(href, text, title);
			}

			if (href?.includes('/api/artifacts/')) {
				return `<a href="${safeHref}"${titleAttr}>${linkText}</a>`;
			}

			return `<a href="${safeHref}"${titleAttr} target="_blank" rel="noopener noreferrer">${linkText}</a>`;
		}
	}
});

function escapeHtmlAttribute(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

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
