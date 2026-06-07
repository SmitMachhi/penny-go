import { pennyBrandCssVariables } from '../penny-brand.ts';

const LETTER_WIDTH_IN = 8.5;
const LETTER_HEIGHT_IN = 11;
const PAGE_MARGIN_IN = 0.75;
const PAGE_GAP_REM = 1.25;

export function renderDocumentStyles(): string {
	return `
    :root { ${pennyBrandCssVariables()}; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--penny-muted);
      color: var(--penny-fg);
    }
    .document-shell {
      min-height: 100%;
      padding: 1.5rem 1rem ${PAGE_GAP_REM}rem;
    }
    .document-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      max-width: calc(${LETTER_WIDTH_IN}in + 2rem);
      margin: 0 auto 1rem;
      padding: 0 0.5rem;
      color: var(--penny-muted-fg);
      font-size: 0.875rem;
    }
    .document-toolbar .logo { height: 24px; width: auto; }
    .page-stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: ${PAGE_GAP_REM}rem;
    }
    .page {
      width: ${LETTER_WIDTH_IN}in;
      min-height: ${LETTER_HEIGHT_IN}in;
      padding: ${PAGE_MARGIN_IN}in;
      background: var(--penny-card);
      color: var(--penny-card-fg);
      border: 1px solid var(--penny-border);
      box-shadow: 0 1px 2px color-mix(in oklch, var(--penny-fg) 6%, transparent),
        0 10px 30px color-mix(in oklch, var(--penny-fg) 4%, transparent);
    }
    .page-content > :first-child { margin-top: 0; }
    .page-content > :last-child { margin-bottom: 0; }
    .brief-body :is(h1, h2, h3, h4) {
      margin: 1.25rem 0 0.75rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--penny-fg);
    }
    .brief-body h1 { font-size: 1.5rem; margin-top: 0; }
    .brief-body h2 { font-size: 1.125rem; }
    .brief-body h3 { font-size: 1rem; }
    .brief-body p,
    .brief-body li {
      font-size: 0.9375rem;
      line-height: 1.65;
    }
    .brief-body p { margin: 0 0 0.85rem; }
    .brief-body :is(ul, ol) {
      margin: 0 0 0.85rem;
      padding-left: 1.25rem;
    }
    .brief-body li + li { margin-top: 0.25rem; }
    .brief-body a {
      color: var(--penny-fg);
      font-weight: 500;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .brief-body hr {
      border: 0;
      border-top: 1px solid var(--penny-border);
      margin: 1.25rem 0;
    }
    .brief-body blockquote {
      margin: 0 0 0.85rem;
      padding-left: 0.875rem;
      border-left: 2px solid var(--penny-border);
      color: var(--penny-muted-fg);
    }
    .brief-body code {
      border-radius: 0.25rem;
      background: var(--penny-muted);
      padding: 0.1rem 0.35rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.85em;
    }
    .brief-table-wrap {
      overflow-x: auto;
      margin: 0 0 1rem;
      border: 1px solid var(--penny-border);
      border-radius: 0.75rem;
    }
    .brief-body table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .brief-body th,
    .brief-body td {
      border-bottom: 1px solid color-mix(in oklch, var(--penny-border) 80%, transparent);
      padding: 0.65rem 0.85rem;
      text-align: left;
      vertical-align: top;
    }
    .brief-body thead th {
      background: color-mix(in oklch, var(--penny-muted) 80%, transparent);
      font-weight: 600;
    }
    .program-block {
      margin: 1rem 0;
      padding: 1rem;
      border: 1px solid var(--penny-border);
      border-radius: 0.75rem;
      background: color-mix(in oklch, var(--penny-muted) 35%, var(--penny-card));
      break-inside: avoid;
    }
    .program-block header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
      margin-bottom: 0.75rem;
    }
    .program-block h3 {
      margin: 0;
      font-size: 1rem;
    }
    .playbook-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.5rem;
    }
    .playbook-section {
      margin: 0.75rem 0;
    }
    .playbook-section h4 {
      margin: 0 0 0.35rem;
      font-size: 0.8125rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--penny-muted-fg);
      font-weight: 600;
    }
    .playbook-section p {
      margin: 0;
    }
    .playbook-steps {
      margin: 0;
      padding-left: 1.25rem;
    }
    .playbook-steps li + li {
      margin-top: 0.35rem;
    }
    .task-checkbox {
      display: inline-block;
      width: 0.85em;
      height: 0.85em;
      border: 1.5px solid var(--penny-fg);
      border-radius: 0.15em;
      margin-right: 0.4em;
      vertical-align: -0.08em;
      flex-shrink: 0;
    }
    .brief-body li:has(.task-checkbox) {
      list-style: none;
      margin-left: -1.25rem;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      border: 1px solid;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .program-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      gap: 0.75rem;
      margin: 0.75rem 0;
    }
    .program-meta strong {
      display: block;
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--penny-muted-fg);
      margin-bottom: 0.15rem;
    }
    .program-meta p {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    .program-url {
      margin: 0.75rem 0 0;
      font-size: 0.8125rem;
      word-break: break-word;
    }
    .document-footer {
      margin-top: 1.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--penny-border);
      font-size: 0.75rem;
      color: var(--penny-muted-fg);
    }
    .document-footer .source-links {
      margin: 0.5rem 0 0;
      padding-left: 1rem;
    }
    .document-footer .source-links li + li {
      margin-top: 0.2rem;
    }
    @media print {
      html, body { background: white; }
      .document-shell { padding: 0; }
      .document-toolbar { display: none; }
      .page-stack { gap: 0; }
      .page {
        width: auto;
        min-height: auto;
        border: 0;
        box-shadow: none;
        page-break-after: always;
      }
      .page:last-child { page-break-after: auto; }
    }
    @page {
      size: letter;
      margin: ${PAGE_MARGIN_IN}in;
    }`;
}

export function renderEmbeddedDocumentStyles(): string {
	return `
    html, body { height: 100%; margin: 0; background: var(--penny-muted); }
    .document-shell { min-height: 100%; height: 100%; padding: 1rem 0.75rem; overflow: auto; }
    .document-toolbar { display: none; }
    .page {
      width: min(${LETTER_WIDTH_IN}in, calc(100vw - 1.5rem));
      min-height: auto;
    }`;
}
