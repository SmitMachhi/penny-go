import { marked } from 'marked';

const PRINT_CSP = "default-src 'none'; style-src 'unsafe-inline'";
const ALLOWED_TAGS = new Set([
	'a',
	'blockquote',
	'br',
	'code',
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

const PRINT_CSS = `
  @page { size: letter; margin: 0.75in; }
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #1a1a1a;
  }
  h1 { font-size: 20pt; margin: 0 0 12pt; }
  h2 { font-size: 14pt; margin: 18pt 0 8pt; }
  h3 { font-size: 12pt; margin: 14pt 0 6pt; }
  p, li { margin: 0 0 8pt; }
  ul, ol { margin: 0 0 10pt; padding-left: 20pt; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 12pt; font-size: 10pt; }
  th, td { border: 1px solid #d4d4d4; padding: 6pt 8pt; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 600; }
  a { color: #1a1a1a; text-decoration: underline; }
  hr { border: 0; border-top: 1px solid #d4d4d4; margin: 16pt 0; }
  .task-checkbox {
    display: inline-block;
    width: 10pt;
    height: 10pt;
    border: 1.2pt solid #1a1a1a;
    margin-right: 6pt;
    vertical-align: -1pt;
  }
  li:has(.task-checkbox) { list-style: none; margin-left: -20pt; }
`;

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

function sanitizePrintHtml(html: string): string {
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

function renderLink(href: string | null | undefined, title: string | null | undefined, text: string): string {
	const safeHref = escapeHtmlAttribute(href ?? '');
	const titleAttr = title ? ` title="${escapeHtmlAttribute(title)}"` : '';
	return `<a href="${safeHref}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
}

function parseMarkdown(markdown: string): string {
	const parsed = marked.parse(markdown, { async: false });
	if (typeof parsed !== 'string') {
		throw new Error('unexpected async markdown render');
	}
	return parsed;
}

export function renderMarkdownToPrintHtml(markdown: string, title: string): string {
	marked.setOptions({ gfm: true, breaks: false });
	marked.use({
		renderer: {
			link({ href, title, text }) {
				return renderLink(href, title, text);
			}
		}
	});
	const bodyHtml = sanitizePrintHtml(formatPrintCheckboxes(parseMarkdown(markdown)));
	const safeTitle = title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

	return `<!DOCTYPE html>
	<html lang="en">
	<head>
	  <meta charset="utf-8" />
	  <meta http-equiv="Content-Security-Policy" content="${PRINT_CSP}" />
	  <title>${safeTitle}</title>
	  <style>${PRINT_CSS}</style>
	</head>
<body>${bodyHtml}</body>
</html>`;
}
