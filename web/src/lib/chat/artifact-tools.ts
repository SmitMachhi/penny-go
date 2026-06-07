export const CREATE_FUNDING_BRIEF_TOOL = 'create_funding_brief';
export const PUBLISH_FUNDING_BRIEF_TOOL = 'publish_funding_brief';

export function isFundingBriefTool(name: string): boolean {
	return name === CREATE_FUNDING_BRIEF_TOOL || name === PUBLISH_FUNDING_BRIEF_TOOL;
}
