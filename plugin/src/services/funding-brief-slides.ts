import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CONFIDENCE_BADGE_STYLES } from '@penny/shared/penny-brand';
import type { FundingBriefRecord } from '@penny/shared/funding-brief';

import { escapeHtml, formatBusinessSnapshot } from '../domain/funding-brief.js';
import { renderDeckScript, renderDeckStyles } from './funding-brief-deck-assets.js';

async function loadLogoMarkup(repoRoot: string): Promise<string> {
	const logoPath = join(repoRoot, 'shared', 'assets', 'penny-logo.svg');
	const svg = await readFile(logoPath, 'utf8');
	return svg.replace('<svg', '<svg class="logo"');
}

function renderList(label: string, items: string[]): string {
	if (items.length === 0) {
		return '';
	}
	const listItems = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
	return `<section><h3>${escapeHtml(label)}</h3><ul>${listItems}</ul></section>`;
}

function renderProgramSlide(program: FundingBriefRecord['programs'][number], index: number): string {
	const badge = CONFIDENCE_BADGE_STYLES[program.confidence];
	return `
<section class="slide program-slide" data-slide="${index}">
  <header class="slide-header">
    <p class="eyebrow">Program ${index}</p>
    <h2>${escapeHtml(program.name)}</h2>
    <span class="badge" style="background:${badge.background};color:${badge.foreground};border-color:${badge.border}">${escapeHtml(badge.label)}</span>
  </header>
  ${renderList('Why it fits', [program.whyFit])}
  ${renderList('Why it might not', [program.whyNot])}
  <div class="meta-grid">
    <div><strong>Benefit type</strong><p>${escapeHtml(program.benefitType)}</p></div>
    <div><strong>Intake status</strong><p>${escapeHtml(program.intakeStatus)}</p></div>
    <div><strong>Next step</strong><p>${escapeHtml(program.nextStep)}</p></div>
  </div>
  <p class="official-url"><a href="${escapeHtml(program.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(program.officialUrl)}</a></p>
</section>`;
}

export async function renderFundingBriefSlidesHtml(
	record: FundingBriefRecord,
	repoRoot: string
): Promise<string> {
	const logoMarkup = await loadLogoMarkup(repoRoot);
	const businessLines = formatBusinessSnapshot(record.business);
	const programSlides = record.programs
		.map((program, index) => renderProgramSlide(program, index + 2))
		.join('\n');
	const verifiedUrls = record.verification.urlsChecked
		.map((url) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></li>`)
		.join('');

	const slideCount = record.programs.length + 2;

	return `<!DOCTYPE html>
<html lang="en">
<head>
	  <meta charset="utf-8" />
	  <meta name="viewport" content="width=device-width, initial-scale=1" />
	  <title>${escapeHtml(record.title)}</title>
	  <style>
	    ${renderDeckStyles()}
	  </style>
</head>
<body>
  <div class="deck">
    <div class="toolbar">
      ${logoMarkup}
      <div class="toolbar-meta">${escapeHtml(record.title)} · v${record.version}</div>
    </div>
    <div class="stage">
      <section class="slide active" data-slide="0">
        <p class="eyebrow">Funding brief</p>
        <div class="slide-header"><h1>${escapeHtml(record.title)}</h1></div>
        ${renderList('Business snapshot', businessLines)}
        <p>Prepared ${escapeHtml(new Date(record.updatedAt).toLocaleString('en-CA', { timeZone: 'UTC' }))} UTC</p>
      </section>
      <section class="slide" data-slide="1">
        <p class="eyebrow">Executive summary</p>
        <div class="slide-header"><h2>Top matches</h2></div>
        <ul>
          ${record.programs.map((program) => `<li><strong>${escapeHtml(program.name)}</strong> — ${escapeHtml(program.benefitType)}</li>`).join('')}
        </ul>
        <section>
          <h3>Verification</h3>
          <p>Checked on ${escapeHtml(record.verification.verifiedAt)}</p>
          <ul>${verifiedUrls}</ul>
          ${record.verification.notes ? `<p>${escapeHtml(record.verification.notes)}</p>` : ''}
        </section>
      </section>
      ${programSlides}
    </div>
    <div class="controls">
      <button type="button" id="prevBtn" aria-label="Previous slide">Previous</button>
      <span id="counter" aria-live="polite">1 / ${slideCount}</span>
      <button type="button" id="nextBtn" class="primary" aria-label="Next slide">Next</button>
    </div>
	  </div>
	  <script>
	    ${renderDeckScript()}
	  </script>
</body>
</html>`;
}
