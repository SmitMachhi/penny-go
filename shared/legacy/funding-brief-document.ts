import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
	extractProgramPlaceholderIndices,
	renderBriefMarkdown,
	splitProgramPlaceholderMarkdown
} from './brief-markdown.ts';
import {
	escapeHtml,
	formatBusinessSnapshot,
	formatSourceLinkLabel
} from './funding-brief-html.ts';
import { renderProgramPlaybookHtml } from './funding-brief-playbook.ts';
import type { FundingBriefProgram, FundingBriefRecord } from './funding-brief-types.ts';
import { marked } from 'marked';

import { renderDocumentStyles } from './funding-brief-document-assets.ts';

const PAGE_BLOCK_CAPACITY = 72;
const BLOCK_WEIGHTS = {
	h1: 10,
	h2: 8,
	h3: 6,
	p: 4,
	list: 6,
	table: 14,
	program: 16,
	hr: 3,
	blockquote: 5,
	default: 5
} as const;

type ContentBlock = {
	html: string;
	weight: number;
};

function estimateBlockWeight(html: string): number {
	const trimmed = html.trim();
	if (!trimmed) {
		return 0;
	}
	if (trimmed.startsWith('<h1')) {
		return BLOCK_WEIGHTS.h1;
	}
	if (trimmed.startsWith('<h2')) {
		return BLOCK_WEIGHTS.h2;
	}
	if (trimmed.startsWith('<h3')) {
		return BLOCK_WEIGHTS.h3;
	}
	if (trimmed.startsWith('<article')) {
		return BLOCK_WEIGHTS.program;
	}
	if (trimmed.startsWith('<table') || trimmed.includes('brief-table-wrap')) {
		return BLOCK_WEIGHTS.table;
	}
	if (trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
		return BLOCK_WEIGHTS.list;
	}
	if (trimmed.startsWith('<hr')) {
		return BLOCK_WEIGHTS.hr;
	}
	if (trimmed.startsWith('<blockquote')) {
		return BLOCK_WEIGHTS.blockquote;
	}
	return BLOCK_WEIGHTS.default;
}

function splitHtmlIntoBlocks(html: string): string[] {
	const pattern =
		/(<h1[\s\S]*?<\/h1>|<h2[\s\S]*?<\/h2>|<h3[\s\S]*?<\/h3>|<h4[\s\S]*?<\/h4>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<table[\s\S]*?<\/table>|<div class="brief-table-wrap">[\s\S]*?<\/div>|<article[\s\S]*?<\/article>|<blockquote[\s\S]*?<\/blockquote>|<hr\s*\/?>|<p[\s\S]*?<\/p>)/gi;
	const blocks = html.match(pattern)?.map((block) => block.trim()).filter(Boolean) ?? [];
	if (blocks.length > 0) {
		return blocks;
	}
	return html.trim() ? [html.trim()] : [];
}

function toContentBlocks(htmlBlocks: string[]): ContentBlock[] {
	return htmlBlocks.flatMap((html) => {
		const weight = estimateBlockWeight(html);
		return weight > 0 ? [{ html, weight }] : [];
	});
}

function paginateBlocks(blocks: ContentBlock[]): ContentBlock[][] {
	const pages: ContentBlock[][] = [];
	let currentPage: ContentBlock[] = [];
	let usedWeight = 0;

	for (const block of blocks) {
		if (usedWeight + block.weight > PAGE_BLOCK_CAPACITY && currentPage.length > 0) {
			pages.push(currentPage);
			currentPage = [];
			usedWeight = 0;
		}
		currentPage.push(block);
		usedWeight += block.weight;
	}

	if (currentPage.length > 0) {
		pages.push(currentPage);
	}

	return pages.length > 0 ? pages : [[{ html: '<p></p>', weight: BLOCK_WEIGHTS.default }]];
}

function renderProgramBlock(program: FundingBriefProgram): string {
	return renderProgramPlaybookHtml(program);
}

function renderProgramsAppendix(programs: FundingBriefProgram[]): string {
	if (programs.length === 0) {
		return '';
	}
	const cards = programs.map((program) => renderProgramBlock(program)).join('\n');
	return `<h2>Program playbooks</h2>${cards}`;
}

function resolveBodyMarkdown(record: FundingBriefRecord): string {
	if (record.bodyMarkdown?.trim()) {
		return record.bodyMarkdown.trim();
	}

	const businessLines = formatBusinessSnapshot(record.business ?? {});
	const businessSection =
		businessLines.length > 0 ? `\n\n${businessLines.map((line) => `- ${line}`).join('\n')}` : '';
	const programList = record.programs.map((program) => `- **${program.name}** — ${program.benefitType}`).join('\n');

	return `# ${record.title}${businessSection}

## Summary

${programList}

## Program playbooks

${record.programs.map((_, index) => `{{program:${index}}}`).join('\n\n')}`;
}

function renderBodyHtml(record: FundingBriefRecord): string {
	const markdown = resolveBodyMarkdown(record);
	const segments = splitProgramPlaceholderMarkdown(markdown);
	const placeholderIndices = extractProgramPlaceholderIndices(markdown);
	const htmlParts: string[] = [];

	for (const segment of segments) {
		if (segment.type === 'markdown') {
			htmlParts.push(renderBriefMarkdown(segment.value, marked));
			continue;
		}
		const program = record.programs[segment.index];
		if (program) {
			htmlParts.push(renderProgramBlock(program));
		}
	}

	if (placeholderIndices.length === 0) {
		htmlParts.push(renderProgramsAppendix(record.programs));
	}

	return htmlParts.join('\n');
}

function renderVerificationFooter(record: FundingBriefRecord): string {
	const sourceCount = record.verification.urlsChecked.length;
	const verifiedUrls = record.verification.urlsChecked
		.map(
			(url) =>
				`<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(formatSourceLinkLabel(url))}</a></li>`
		)
		.join('');
	const notes = record.verification.notes
		? `<p>${escapeHtml(record.verification.notes)}</p>`
		: '';

	return `
<div class="document-footer">
  <p>Prepared ${escapeHtml(new Date(record.updatedAt).toLocaleString('en-CA', { timeZone: 'UTC' }))} UTC · Verified ${escapeHtml(record.verification.verifiedAt)} · ${sourceCount} official source${sourceCount === 1 ? '' : 's'}</p>
  <ul class="source-links">${verifiedUrls}</ul>
  ${notes}
</div>`;
}

async function loadLogoMarkup(repoRoot: string): Promise<string> {
	const logoPath = join(repoRoot, 'shared', 'assets', 'penny-logo.svg');
	const svg = await readFile(logoPath, 'utf8');
	return svg.replace('<svg', '<svg class="logo"');
}

function renderPages(bodyHtml: string, footerHtml: string): string {
	const blocks = toContentBlocks(splitHtmlIntoBlocks(bodyHtml));
	const footerBlock: ContentBlock = { html: footerHtml, weight: BLOCK_WEIGHTS.h3 };
	const pages = paginateBlocks([...blocks, footerBlock]);

	return pages
		.map(
			(pageBlocks, index) => `
<section class="page" data-page="${index + 1}">
  <div class="page-content brief-body">
    ${pageBlocks.map((block) => block.html).join('\n')}
  </div>
</section>`
		)
		.join('\n');
}

export async function renderFundingBriefDocumentHtml(
	record: FundingBriefRecord,
	repoRoot: string
): Promise<string> {
	const logoMarkup = await loadLogoMarkup(repoRoot);
	const bodyHtml = renderBodyHtml(record);
	const footerHtml = renderVerificationFooter(record);
	const pagesHtml = renderPages(bodyHtml, footerHtml);

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(record.title)}</title>
  <style>${renderDocumentStyles()}</style>
</head>
<body>
  <div class="document-shell">
    <div class="document-toolbar">
      ${logoMarkup}
      <div>${escapeHtml(record.title)} · v${record.version}</div>
    </div>
    <div class="page-stack">
      ${pagesHtml}
    </div>
  </div>
</body>
</html>`;
}
