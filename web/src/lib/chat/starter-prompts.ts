/** Primary consultation entry paths on home and empty chat canvas. */
export type ConsultationStarter = {
	readonly id: 'opportunity_backed' | 'aspiration_first';
	readonly label: string;
	readonly description: string;
	readonly prompt: string;
};

export const CONSULTATION_STARTERS: readonly ConsultationStarter[] = [
	{
		id: 'opportunity_backed',
		label: 'Align my business to funding',
		description:
			'Verified grants and ITCs for your business, with a plan aligned to qualify.',
		prompt: `I have an existing business.

- Province or territory: [province or territory]
- Sector or industry: [sector or industry]
- What we sell or do: [what you sell or do]
- Project to fund: [hiring, equipment, expansion, R&D, etc.]

Help me find verified Canadian grants and ITCs that fit us and how to align our operating plan to qualify.`
	},
	{
		id: 'aspiration_first',
		label: 'Explore an idea',
		description:
			'Verified funding for your industry and region, plus a business shape to build toward.',
		prompt: `I'm exploring a new business idea.

- Industry or type of business: [industry or type of business]
- Province or territory: [province or territory]
- Stage: [idea / planning / already operating]
- Constraints: [budget, team size, timeline, etc.]

Find verified non-loan government funding and propose a business shape I can build toward.`
	}
] as const;

export type ExampleStarter = {
	readonly chip: string;
	readonly prompt: string;
};

/** Filled examples for “Or try an example” (match consultation starter shapes). */
export const EXAMPLE_STARTERS: readonly ExampleStarter[] = [
	{
		chip: 'Clean energy business · Ontario',
		prompt: `I have an existing business.

- Province or territory: Ontario
- Sector or industry: Clean energy technology
- What we sell or do: Battery storage software and integration for utilities and commercial sites
- Project to fund: Pilot with a utility partner and two engineering hires in the next year

Help me find verified Canadian grants and ITCs that fit us and how to align our operating plan to qualify.`
	},
	{
		chip: 'Community solar idea · Alberta',
		prompt: `I'm exploring a new business idea.

- Industry or type of business: Community solar installation and maintenance
- Province or territory: Alberta
- Stage: planning
- Constraints: Founding team of two, first projects within 12 months, subcontract labor at first

Find verified non-loan government funding and propose a business shape I can build toward.`
	}
] as const;

export const CHAT_PLACEHOLDER = 'Message Penny';

export const CHAT_DISCLAIMER =
	'Penny can make mistakes. Verify grants and deadlines with official sources.';

export const HOME_HEADLINE = 'Let’s map what’s possible';
export const HOME_SUBHEAD =
	'Funding-aligned plans for Canadian businesses — align what you have, or explore a new idea.';

export const CANVAS_EMPTY_HEADLINE = 'Your canvas is open';
export const CANVAS_EMPTY_SUBHEAD =
	'Pick a path below or share context — stage, sector, province, timeline.';
