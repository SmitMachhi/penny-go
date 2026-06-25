const SECURITY_HEADERS: readonly [string, string][] = [
	['Cross-Origin-Opener-Policy', 'same-origin'],
	['Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=()'],
	['Referrer-Policy', 'strict-origin-when-cross-origin'],
	['X-Content-Type-Options', 'nosniff'],
	['X-Frame-Options', 'DENY']
];

export function applySecurityHeaders(response: Response): Response {
	for (const [name, value] of SECURITY_HEADERS) {
		if (!response.headers.has(name)) {
			response.headers.set(name, value);
		}
	}
	return response;
}
