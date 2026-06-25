const INVESTISSEMENT_QUEBEC_HOST = 'investquebec.com';
const REVENU_QUEBEC_HOST = 'revenuquebec.ca';

export function recoveryHintForBlockedUrl(url: string): string | undefined {
	let hostname: string;
	try {
		hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
	} catch {
		return defaultRecoveryHint();
	}

	if (hostname.endsWith(INVESTISSEMENT_QUEBEC_HOST)) {
		return (
			'Marketing page unreadable. Search for the official Quebec cadre normatif PDF on ' +
			'cdn-contenu.quebec.ca, then read_official_source on that PDF.'
		);
	}

	if (hostname.endsWith(REVENU_QUEBEC_HOST)) {
		return (
			'Page unreadable. Search for the same program on quebec.ca or an official Revenu ' +
			'Québec PDF, then read_official_source on the candidate.'
		);
	}

	return defaultRecoveryHint();
}

function defaultRecoveryHint(): string {
	return (
		'Page unreadable. Run a targeted web_search on the official government domain for a ' +
		'policy PDF or mirror page, then read_official_source on the result.'
	);
}
