const BLOCKED_FLY_HOSTNAME = 'penny-go.fly.dev';

export function isBlockedHost(host: string): boolean {
	return hostnameFromHostHeader(host) === BLOCKED_FLY_HOSTNAME;
}

function hostnameFromHostHeader(host: string): string {
	return host.trim().toLowerCase().replace(/:\d+$/, '');
}
