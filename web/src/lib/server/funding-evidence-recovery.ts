import { extractMessageText, type ChatMessage } from '$lib/chat/messages.js';

type OfficialReader = 'crawl4ai' | 'firecrawl_scrape';

type RawRecord = Record<string, unknown>;

type OfficialSourcePayload = {
	benefit_scope?: {
		scope_reason?: unknown;
		scope_verdict?: unknown;
	};
	markdown?: unknown;
	reader?: unknown;
	summary?: unknown;
	success?: unknown;
	url?: unknown;
	verification_source?: unknown;
};

export type VerifiedFundingEvidence = {
	reader: OfficialReader;
	summary: string;
	title: string;
	url: string;
};

export type FundingEvidenceRecovery = {
	blocked: string[];
	ruledOut: string[];
	verified: VerifiedFundingEvidence[];
};

const MAX_RECOVERY_ITEMS = 4;
const SUMMARY_MAX_CHARS = 220;
const TITLE_MAX_CHARS = 80;

function isRecord(value: unknown): value is RawRecord {
	return value !== null && typeof value === 'object';
}

function messageRecord(raw: unknown): RawRecord | null {
	if (!isRecord(raw)) {
		return null;
	}
	const nested = raw.message;
	return isRecord(nested) ? nested : raw;
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isOfficialReader(value: unknown): value is OfficialReader {
	return value === 'crawl4ai' || value === 'firecrawl_scrape';
}

function parseJsonPayload(text: string): OfficialSourcePayload | null {
	try {
		const parsed = JSON.parse(text) as unknown;
		return isRecord(parsed) ? (parsed as OfficialSourcePayload) : null;
	} catch {
		return null;
	}
}

function contentText(record: RawRecord): string {
	return extractMessageText(record).trim();
}

function firstHeading(markdown: string): string | null {
	for (const line of markdown.split('\n')) {
		const trimmed = line.trim();
		if (trimmed.startsWith('# ')) {
			return trimmed.replace(/^#\s+/, '').slice(0, TITLE_MAX_CHARS);
		}
	}
	return null;
}

function hostnameTitle(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, '').slice(0, TITLE_MAX_CHARS);
	} catch {
		return url.slice(0, TITLE_MAX_CHARS);
	}
}

function evidenceTitle(payload: OfficialSourcePayload, url: string): string {
	const markdown = readString(payload.markdown);
	if (!markdown) {
		return hostnameTitle(url);
	}
	return firstHeading(markdown) ?? hostnameTitle(url);
}

function compactSummary(payload: OfficialSourcePayload): string {
	const summary = readString(payload.summary);
	if (summary && summary !== 'Retrieved official page content via Firecrawl.') {
		return summary.slice(0, SUMMARY_MAX_CHARS);
	}
	const markdown = readString(payload.markdown);
	if (!markdown) {
		return 'Official page content was retrieved successfully.';
	}
	return markdown.replace(/\s+/g, ' ').trim().slice(0, SUMMARY_MAX_CHARS);
}

function isToolResult(record: RawRecord): boolean {
	return record.role === 'toolResult' || typeof record.toolCallId === 'string';
}

export function extractLatestUserText(rawMessages: readonly unknown[]): string | null {
	for (let index = rawMessages.length - 1; index >= 0; index -= 1) {
		const record = messageRecord(rawMessages[index]);
		if (!record || record.role !== 'user') {
			continue;
		}
		const text = contentText(record);
		if (text) {
			return text;
		}
	}
	return null;
}

export function extractVerifiedFundingEvidence(
	rawMessages: readonly unknown[]
): FundingEvidenceRecovery {
	const blocked = new Set<string>();
	const ruledOut = new Set<string>();
	const verified = new Map<string, VerifiedFundingEvidence>();

	for (const raw of rawMessages) {
		const record = messageRecord(raw);
		if (!record || !isToolResult(record)) {
			continue;
		}
		const payload = parseJsonPayload(contentText(record));
		const url = readString(payload?.url);
		if (!payload || !url) {
			continue;
		}
		if (payload.reader === 'blocked' || payload.success === false) {
			blocked.add(url);
			continue;
		}
		if (payload.benefit_scope?.scope_verdict === 'ruled_out') {
			ruledOut.add(url);
			continue;
		}
		if (payload.success !== true || !isOfficialReader(payload.reader)) {
			continue;
		}
		verified.set(url, {
			reader: payload.reader,
			summary: compactSummary(payload),
			title: evidenceTitle(payload, url),
			url
		});
	}

	return {
		blocked: [...blocked],
		ruledOut: [...ruledOut],
		verified: [...verified.values()]
	};
}

export function hasCompletedAssistantAfterLastUser(messages: readonly ChatMessage[]): boolean {
	let lastUserIndex = -1;
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index]?.role === 'user') {
			lastUserIndex = index;
			break;
		}
	}
	if (lastUserIndex === -1) {
		return messages.some(
			(message) =>
				message.role === 'assistant' && message.phase !== 'commentary' && message.text.trim()
		);
	}
	return messages
		.slice(lastUserIndex + 1)
		.some(
			(message) =>
				message.role === 'assistant' && message.phase !== 'commentary' && message.text.trim()
		);
}

export function buildFundingCheckpointAnswer(input: {
	evidence: FundingEvidenceRecovery;
	userText: string;
}): string | null {
	const verified = input.evidence.verified.slice(0, MAX_RECOVERY_ITEMS);
	if (verified.length === 0) {
		return null;
	}
	const lines = [
		'Penny verified these before the run was interrupted. This checkpoint preserves the official-page evidence already retrieved, so the work is not lost.',
		'',
		'## Snapshot',
		input.userText.trim(),
		'',
		'## Verified fits'
	];

	for (const item of verified) {
		lines.push(`- ${item.title}: ${item.summary} Source: ${item.url} (${item.reader}).`);
	}

	if (input.evidence.blocked.length > 0) {
		lines.push('', '## Blocked or not verified');
		for (const url of input.evidence.blocked.slice(0, MAX_RECOVERY_ITEMS)) {
			lines.push(`- ${url}`);
		}
	}

	if (input.evidence.ruledOut.length > 0) {
		lines.push('', '## Ruled out by scope');
		for (const url of input.evidence.ruledOut.slice(0, MAX_RECOVERY_ITEMS)) {
			lines.push(`- ${url}`);
		}
	}

	lines.push(
		'',
		'## Next step',
		'Use these verified leads first. Penny can continue deeper from this checkpoint instead of restarting from zero.'
	);
	return lines.join('\n');
}
