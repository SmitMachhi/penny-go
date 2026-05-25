import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
	CONFIDENCE_BADGE_STYLES,
	pennyBrandCssVariables
} from '@penny/shared/penny-brand';
import type { FundingBriefRecord } from '@penny/shared/funding-brief';

import { escapeHtml, formatBusinessSnapshot } from '../domain/funding-brief.js';

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
    :root { ${pennyBrandCssVariables()}; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--penny-bg);
      color: var(--penny-fg);
    }
    .deck { min-height: 100vh; display: flex; flex-direction: column; }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--penny-border);
      background: var(--penny-card);
    }
    .toolbar .logo { height: 28px; width: auto; }
    .toolbar-meta { color: var(--penny-muted-fg); font-size: 0.875rem; }
    .stage {
      flex: 1;
      display: grid;
      place-items: center;
      padding: 1.5rem;
    }
    .slide {
      display: none;
      width: min(960px, 100%);
      background: var(--penny-card);
      color: var(--penny-card-fg);
      border: 1px solid var(--penny-border);
      border-radius: 1rem;
      padding: 2rem;
      box-shadow: 0 12px 40px color-mix(in oklch, var(--penny-primary) 12%, transparent);
    }
    .slide.active { display: block; }
    .slide-header h1, .slide-header h2 { margin: 0.25rem 0 0.75rem; color: var(--penny-primary); }
    .eyebrow {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.75rem;
      color: var(--penny-muted-fg);
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border-radius: 999px;
      border: 1px solid;
      font-size: 0.75rem;
      font-weight: 600;
    }
    section { margin-top: 1rem; }
    h3 { margin: 0 0 0.5rem; font-size: 0.95rem; }
    ul { margin: 0; padding-left: 1.25rem; }
    li + li { margin-top: 0.35rem; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .meta-grid p { margin: 0.25rem 0 0; }
    .official-url { margin-top: 1.25rem; word-break: break-word; }
    a { color: var(--penny-primary); }
    .controls {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      padding: 1rem;
      border-top: 1px solid var(--penny-border);
      background: var(--penny-card);
    }
    button {
      border: 1px solid var(--penny-border);
      background: var(--penny-accent);
      color: var(--penny-fg);
      border-radius: 999px;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font: inherit;
    }
    button.primary {
      background: var(--penny-primary);
      color: var(--penny-primary-fg);
      border-color: transparent;
    }
    @media print {
      .toolbar, .controls { display: none; }
      .slide { display: block !important; page-break-after: always; box-shadow: none; }
      .stage { display: block; padding: 0; }
    }
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
    (function () {
      const slides = Array.from(document.querySelectorAll('.slide'));
      const counter = document.getElementById('counter');
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      let index = 0;

      function render() {
        slides.forEach((slide, slideIndex) => {
          slide.classList.toggle('active', slideIndex === index);
        });
        counter.textContent = String(index + 1) + ' / ' + String(slides.length);
      }

      function move(delta) {
        index = Math.max(0, Math.min(slides.length - 1, index + delta));
        render();
      }

      prevBtn.addEventListener('click', () => move(-1));
      nextBtn.addEventListener('click', () => move(1));
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') move(-1);
        if (event.key === 'ArrowRight') move(1);
      });
      render();
    })();
  </script>
</body>
</html>`;
}
