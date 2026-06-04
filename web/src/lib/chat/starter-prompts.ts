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
		label: 'I have a business',
		description: 'Find verified grants and ITCs that fit, with a plan to qualify.',
		prompt:
			'I have an existing Canadian business. Help me find verified grants and ITCs that fit us and how to align our operating plan to qualify.'
	},
	{
		id: 'aspiration_first',
		label: "I'm exploring an idea",
		description: 'Funding for your industry and region, plus a business shape to build toward.',
		prompt:
			"I'm exploring a new business idea in Canada. Find verified non-loan government funding and propose a business shape I can build toward."
	}
] as const;

export type ExampleStarter = {
	readonly chip: string;
	readonly prompt: string;
};

/** Filled examples for empty chat only (one-tap send). */
export const EXAMPLE_STARTERS: readonly ExampleStarter[] = [
	{
		chip: 'Clean energy · Ontario',
		prompt:
			'We run a clean energy business in Ontario (battery storage software for utilities). We want grants for a utility pilot and two engineering hires.'
	},
	{
		chip: 'Community solar · Alberta',
		prompt:
			"I'm exploring community solar installation in Alberta (planning stage, team of two, first projects within 12 months)."
	}
] as const;

export const CHAT_PLACEHOLDER = 'Message Penny';

export const CHAT_DISCLAIMER =
	'Penny can make mistakes. Verify grants and deadlines with official sources.';

export const HOME_HEADLINE = 'Let’s map what’s possible';
export const HOME_SUBHEAD =
	'Funding-aligned plans for Canadian businesses — align what you have, or explore a new idea.';
