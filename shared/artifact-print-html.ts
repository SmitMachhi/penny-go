import { marked } from 'marked';

const COVER_FACT_LABELS = ['Business', 'Stage', 'Target', 'Strategy'] as const;
const COVER_FACT_LABEL_PATTERN = COVER_FACT_LABELS.join('|');
const COVER_FACT_P_PATTERN = new RegExp(
	`<p>(\\s*<strong>(${COVER_FACT_LABEL_PATTERN}):<\\/strong>[^<]*)<\\/p>`,
	'gi'
);

const VERDICT_PATTERN = /<p><strong>Verdict:<\/strong>\s*([^<]*)<\/p>/gi;
const NEXT_STEP_PATTERN = /<p><strong>Next step:<\/strong>\s*([^<]*)<\/p>/gi;
const PROGRAM_OR_SECTION_BOUNDARY_PATTERN = /<h3>(\d+\.\s*[^<]*)<\/h3>|<h2>/gi;

const VERDICT_CLASS_BY_VALUE: Record<string, string> = {
	'pursue now': 'artifact-verdict artifact-verdict--pursue',
	explore: 'artifact-verdict artifact-verdict--explore',
	defer: 'artifact-verdict artifact-verdict--defer',
	skip: 'artifact-verdict artifact-verdict--skip'
};

function verdictClassForText(text: string): string {
	const normalized = text.trim().toLowerCase();
	return VERDICT_CLASS_BY_VALUE[normalized] ?? 'artifact-verdict';
}

function wrapVerdictAndNextStepParagraphs(html: string): string {
	let result = html.replace(VERDICT_PATTERN, (_match, verdictText: string) => {
		const verdictClass = verdictClassForText(verdictText);
		return `<p class="${verdictClass}"><strong>Verdict:</strong> ${verdictText}</p>`;
	});
	result = result.replace(
		NEXT_STEP_PATTERN,
		(_match, stepText: string) =>
			`<p class="artifact-next-step"><strong>Next step:</strong> ${stepText}</p>`
	);
	return result;
}

function wrapProgramHeadings(html: string): string {
	const parts: string[] = [];
	let lastIndex = 0;
	let programOpen = false;
	let foundProgram = false;

	for (const match of html.matchAll(PROGRAM_OR_SECTION_BOUNDARY_PATTERN)) {
		const start = match.index ?? 0;
		if (start > lastIndex) {
			parts.push(html.slice(lastIndex, start));
		}
		if (match[0] === '<h2>') {
			if (programOpen) {
				parts.push('</section>');
				programOpen = false;
			}
			parts.push(match[0]);
			lastIndex = start + match[0].length;
			continue;
		}
		if (programOpen) {
			parts.push('</section>');
		}
		foundProgram = true;
		programOpen = true;
		parts.push('<section class="program-block">');
		parts.push(match[0]);
		lastIndex = start + match[0].length;
	}

	if (!foundProgram) {
		return html;
	}

	parts.push(html.slice(lastIndex));
	if (programOpen) {
		parts.push('</section>');
	}
	return parts.join('');
}

/** Split inline cover facts so each **Label:** starts its own markdown block. */
export function splitInlineCoverFacts(markdown: string): string {
	const labelAlternation = COVER_FACT_LABELS.join('|');
	return markdown.replace(
		new RegExp(`(\\S)\\s+(\\*\\*(?:${labelAlternation}):\\*\\*)`, 'gi'),
		'$1\n\n$2'
	);
}

function styleCoverFactParagraphs(html: string): string {
	return html.replace(
		COVER_FACT_P_PATTERN,
		(_match, inner: string) => `<p class="memo-cover__fact">${inner}</p>`
	);
}

function enhancePrintDocumentHtml(html: string): string {
	return wrapProgramHeadings(
		styleCoverFactParagraphs(wrapVerdictAndNextStepParagraphs(html))
	);
}

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
	'section',
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
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #1a1a1a;
  }
  .memo-cover {
    margin: 0 0 20pt;
    padding-bottom: 12pt;
    border-bottom: 1pt solid #d4d4d4;
  }
  .memo-cover__title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 22pt;
    font-weight: 600;
    margin: 0 0 8pt;
    line-height: 1.2;
  }
  .memo-cover__meta {
    font-size: 10pt;
    color: #525252;
    margin: 0;
  }
  .memo-cover__fact {
    font-size: 10pt;
    color: #525252;
    margin: 0 0 4pt;
  }
  .memo-cover__fact strong {
    color: #1a1a1a;
  }
  .memo-cover__change {
    font-size: 10pt;
    font-style: italic;
    color: #525252;
    margin: 6pt 0 0;
  }
  h1 { font-size: 20pt; margin: 0 0 12pt; font-family: Georgia, "Times New Roman", serif; }
  h2 { font-size: 14pt; margin: 18pt 0 8pt; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 14pt 0 6pt; page-break-after: avoid; }
  p, li { margin: 0 0 8pt; }
  ul, ol { margin: 0 0 10pt; padding-left: 20pt; }
  .program-block {
    margin: 0 0 16pt;
    padding: 0 0 12pt;
    border-bottom: 0.5pt solid #e5e5e5;
  }
  .artifact-next-step {
    margin: 8pt 0 10pt;
    padding: 8pt 10pt;
    border-left: 3pt solid #1d4ed8;
    background: #f0f4ff;
  }
  .artifact-verdict {
    display: inline-block;
    margin: 0 0 8pt;
    padding: 3pt 8pt;
    border-radius: 4pt;
    font-size: 10pt;
    font-weight: 600;
  }
  .artifact-verdict--pursue { background: #dcfce7; color: #166534; }
  .artifact-verdict--explore { background: #fef3c7; color: #92400e; }
  .artifact-verdict--defer { background: #f5f5f5; color: #525252; }
  .artifact-verdict--skip { background: #f5f5f5; color: #737373; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 12pt; font-size: 9.5pt; table-layout: fixed; }
  th, td { border: 1px solid #d4d4d4; padding: 6pt 8pt; text-align: left; vertical-align: top; word-wrap: break-word; }
  th { background: #f5f5f5; font-weight: 600; width: 28%; }
  a { color: #1a1a1a; text-decoration: underline; word-break: break-word; }
  hr { border: 0; border-top: 1px solid #d4d4d4; margin: 16pt 0; }
  .verification-section { font-size: 9pt; color: #525252; page-break-before: always; }
  .verification-section h2 { font-size: 12pt; }
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

export type PrintHtmlOptions = {
	title: string;
	version: number;
	preparedAt: string;
	changeSummary?: string | undefined;
};

function escapeHtmlAttribute(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function escapeHtmlText(value: string): string {
	return escapeHtmlAttribute(value);
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

function formatPreparedDate(isoTimestamp: string): string {
	const parsed = new Date(isoTimestamp);
	if (Number.isNaN(parsed.getTime())) {
		return isoTimestamp;
	}
	return parsed.toLocaleDateString('en-CA', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

function buildCoverHtml(options: PrintHtmlOptions): string {
	const preparedLabel = formatPreparedDate(options.preparedAt);
	const versionLine = `v${options.version} · Prepared ${preparedLabel}`;
	const changeLine = options.changeSummary?.trim()
		? `<p class="memo-cover__change">${escapeHtmlText(options.changeSummary.trim())}</p>`
		: '';

	return `<header class="memo-cover">
  <h1 class="memo-cover__title">${escapeHtmlText(options.title)}</h1>
  <p class="memo-cover__meta">${escapeHtmlText(versionLine)}</p>
  ${changeLine}
</header>`;
}

function markVerificationSection(html: string): string {
	const marker = '<h2>Verification</h2>';
	if (!html.includes(marker)) {
		return html;
	}
	return html.replace(marker, '<section class="verification-section">' + marker);
}

export function renderMarkdownToPrintHtml(markdown: string, options: PrintHtmlOptions): string;
export function renderMarkdownToPrintHtml(markdown: string, title: string): string;
export function renderMarkdownToPrintHtml(
	markdown: string,
	titleOrOptions: string | PrintHtmlOptions
): string {
	const options: PrintHtmlOptions =
		typeof titleOrOptions === 'string'
			? { title: titleOrOptions, version: 1, preparedAt: new Date().toISOString() }
			: titleOrOptions;

	marked.setOptions({ gfm: true, breaks: false });
	marked.use({
		renderer: {
			link({ href, title, text }) {
				return renderLink(href, title, text);
			}
		}
	});
	const parsed = sanitizePrintHtml(
		formatPrintCheckboxes(parseMarkdown(splitInlineCoverFacts(markdown)))
	);
	const bodyHtml = markVerificationSection(enhancePrintDocumentHtml(parsed));
	const safeTitle = escapeHtmlText(options.title);

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="${PRINT_CSP}" />
  <title>${safeTitle}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
${buildCoverHtml(options)}
${bodyHtml}
</body>
</html>`;
}
