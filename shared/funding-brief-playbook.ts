import type { FundingBriefProgram } from './funding-brief-types.ts';
import { CONFIDENCE_BADGE_STYLES, VERDICT_BADGE_STYLES } from './penny-brand.ts';
import { escapeHtml, formatSourceLinkLabel } from './funding-brief-html.ts';

function renderBulletList(items: string[], className?: string): string {
	if (items.length === 0) {
		return '';
	}
	const classAttr = className ? ` class="${className}"` : '';
	const listItems = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
	return `<ul${classAttr}>${listItems}</ul>`;
}

function renderNumberedSteps(steps: string[]): string {
	if (steps.length === 0) {
		return '';
	}
	const listItems = steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
	return `<ol class="playbook-steps">${listItems}</ol>`;
}

function renderPlaybookSection(title: string, bodyHtml: string): string {
	if (!bodyHtml.trim()) {
		return '';
	}
	return `<section class="playbook-section"><h4>${escapeHtml(title)}</h4>${bodyHtml}</section>`;
}

function renderSummary(program: FundingBriefProgram): string {
	if (program.plainTerms?.trim()) {
		return renderPlaybookSection('In plain terms', `<p>${escapeHtml(program.plainTerms.trim())}</p>`);
	}
	const parts: string[] = [];
	if (program.whyFit?.trim()) {
		parts.push(`<p>${escapeHtml(program.whyFit.trim())}</p>`);
	}
	if (program.whyNot?.trim()) {
		parts.push(renderPlaybookSection('Watch out for', `<p>${escapeHtml(program.whyNot.trim())}</p>`));
	}
	return parts.join('\n');
}

function renderActionSection(program: FundingBriefProgram): string {
	if (program.steps && program.steps.length > 0) {
		return renderPlaybookSection('Steps', renderNumberedSteps(program.steps));
	}
	if (program.nextStep?.trim()) {
		return renderPlaybookSection('Next step', `<p>${escapeHtml(program.nextStep.trim())}</p>`);
	}
	return '';
}

export function renderProgramPlaybookHtml(program: FundingBriefProgram): string {
	const confidence = CONFIDENCE_BADGE_STYLES[program.confidence];
	const verdictBadge = program.verdict
		? (() => {
				const verdict = VERDICT_BADGE_STYLES[program.verdict];
				return `<span class="badge verdict-badge" style="background:${verdict.background};color:${verdict.foreground};border-color:${verdict.border}">${escapeHtml(verdict.label)}</span>`;
			})()
		: '';

	const metaBlocks = [
		{ label: 'Benefit type', value: program.benefitType },
		{ label: 'Intake status', value: program.intakeStatus },
		...(program.timeline?.trim() ? [{ label: 'Typical timeline', value: program.timeline.trim() }] : [])
	]
		.map(
			(entry) =>
				`<div><strong>${escapeHtml(entry.label)}</strong><p>${escapeHtml(entry.value)}</p></div>`
		)
		.join('');

	const sections = [
		renderSummary(program),
		program.prerequisites?.length
			? renderPlaybookSection('Before you apply', renderBulletList(program.prerequisites))
			: '',
		renderActionSection(program),
		program.documents?.length
			? renderPlaybookSection('Documents to prepare', renderBulletList(program.documents))
			: '',
		program.fallback?.trim()
			? renderPlaybookSection('If this doesn\u2019t work', `<p>${escapeHtml(program.fallback.trim())}</p>`)
			: ''
	]
		.filter(Boolean)
		.join('\n');

	return `
<article class="program-block playbook-block">
  <header>
    <h3>${escapeHtml(program.name)}</h3>
    <div class="playbook-badges">
      ${verdictBadge}
      <span class="badge" style="background:${confidence.background};color:${confidence.foreground};border-color:${confidence.border}">${escapeHtml(confidence.label)}</span>
    </div>
  </header>
  ${sections}
  <div class="program-meta">${metaBlocks}</div>
  <p class="program-url"><a href="${escapeHtml(program.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(formatSourceLinkLabel(program.officialUrl))}</a></p>
</article>`;
}
