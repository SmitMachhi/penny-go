import { marked } from 'marked';

import { renderBriefMarkdown } from './brief-markdown.ts';

const PRINT_CSP = "default-src 'none'; style-src 'unsafe-inline'";

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

export function renderMarkdownToPrintHtml(markdown: string, title: string): string {
	const bodyHtml = renderBriefMarkdown(markdown, marked);
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
