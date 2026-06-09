import { describe, expect, it } from 'vitest';

import {
	buildFundingCheckpointAnswer,
	extractVerifiedFundingEvidence
} from './funding-evidence-recovery.js';

const USER_PROMPT =
	'We run a 42-person precision parts manufacturer near Laval, Quebec. We want robotics equipment and operator training.';

function rawToolResult(payload: unknown): unknown {
	return {
		type: 'message',
		message: {
			role: 'toolResult',
			content: [{ type: 'text', text: JSON.stringify(payload) }]
		}
	};
}

describe('funding evidence recovery', () => {
	it('extracts verified official reads from raw OpenClaw tool results', () => {
		const evidence = extractVerifiedFundingEvidence([
			rawToolResult({
				success: false,
				url: 'https://www.revenuquebec.ca/blocked',
				reader: 'blocked',
				verification_source: 'unverified_blocked'
			}),
			rawToolResult({
				success: true,
				url: 'https://lavaleconomique.com/programme/virage-techno-manufacturier/',
				reader: 'firecrawl_scrape',
				verification_source: 'firecrawl_official_scrape',
				summary: 'Retrieved official page content via Firecrawl.',
				markdown:
					'# Virage techno manufacturier\nSubvention allant jusqu a 50 000 $ pour automatisation et robotisation.'
			})
		]);

		expect(evidence.verified).toHaveLength(1);
		expect(evidence.blocked).toEqual(['https://www.revenuquebec.ca/blocked']);
		expect(evidence.verified[0]).toMatchObject({
			reader: 'firecrawl_scrape',
			title: 'Virage techno manufacturier',
			url: 'https://lavaleconomique.com/programme/virage-techno-manufacturier/'
		});
	});

	it('keeps ruled-out benefit scope out of actionable verified fits', () => {
		const evidence = extractVerifiedFundingEvidence([
			rawToolResult({
				success: true,
				url: 'https://www.canada.ca/en/repayable-program',
				reader: 'firecrawl_scrape',
				verification_source: 'firecrawl_official_scrape',
				markdown: '# Regional Tariff Response Initiative\nRepayable contribution may apply.',
				benefit_scope: {
					scope_verdict: 'ruled_out',
					scope_reason: 'repayable_contribution_detected'
				}
			})
		]);

		expect(evidence.verified).toEqual([]);
		expect(evidence.ruledOut).toEqual(['https://www.canada.ca/en/repayable-program']);
	});

	it('builds an honest checkpoint answer from verified evidence', () => {
		const answer = buildFundingCheckpointAnswer({
			userText: USER_PROMPT,
			evidence: {
				verified: [
					{
						reader: 'firecrawl_scrape',
						summary:
							'Subvention allant jusqu a 50 000 $ pour automatisation et robotisation.',
						title: 'Virage techno manufacturier',
						url: 'https://lavaleconomique.com/programme/virage-techno-manufacturier/'
					}
				],
				blocked: ['https://www.revenuquebec.ca/blocked'],
				ruledOut: []
			}
		});

		expect(answer).toContain('Penny verified these before the run was interrupted');
		expect(answer).toContain('Virage techno manufacturier');
		expect(answer).toContain('firecrawl_scrape');
		expect(answer).toContain('Blocked or not verified');
	});
});
