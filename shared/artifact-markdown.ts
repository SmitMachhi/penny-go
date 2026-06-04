import type { ArtifactMetaRecord } from './artifact-types.ts';

export function formatSourceLinkLabel(url: string): string {
	try {
		const parsed = new URL(url);
		const path =
			parsed.pathname.length > 36 ? `${parsed.pathname.slice(0, 33)}…` : parsed.pathname;
		return `${parsed.hostname}${path === '/' ? '' : path}`;
	} catch {
		return url;
	}
}

export function buildVerificationAppendix(meta: Pick<ArtifactMetaRecord, 'updatedAt' | 'verification'>): string {
	const sourceCount = meta.verification.urlsChecked.length;
	const links = meta.verification.urlsChecked
		.map((url) => `- [${formatSourceLinkLabel(url)}](${url})`)
		.join('\n');
	const notes = meta.verification.notes?.trim()
		? `\n\n${meta.verification.notes.trim()}`
		: '';

	return `---

## Verification

Prepared ${meta.updatedAt} · Verified ${meta.verification.verifiedAt} · ${sourceCount} official source${sourceCount === 1 ? '' : 's'}

${links}${notes}`;
}

const OUT_OF_SCOPE_HEADING_PATTERN = /^##\s+what\s+this\s+plan\s+does\s+not\s+include\s*$/i;

/** Removes boilerplate scope disclaimers Penny sometimes adds; not part of the deliverable memo. */
export function stripOutOfScopeDisclaimerSection(markdown: string): string {
	const lines = markdown.split('\n');
	const kept: string[] = [];
	let skipping = false;

	for (const line of lines) {
		if (OUT_OF_SCOPE_HEADING_PATTERN.test(line.trim())) {
			skipping = true;
			continue;
		}
		if (skipping && /^##\s+/.test(line)) {
			skipping = false;
		}
		if (!skipping) {
			kept.push(line);
		}
	}

	return kept.join('\n').trim();
}

export function composePdfMarkdown(documentMarkdown: string, meta: ArtifactMetaRecord): string {
	const body = stripOutOfScopeDisclaimerSection(documentMarkdown.trim());
	const appendix = buildVerificationAppendix(meta);
	return `${body}\n\n${appendix}\n`;
}
