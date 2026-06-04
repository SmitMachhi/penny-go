type PendingFirstMessageRouteState = {
	loadedRouteId: string | null;
	targetRouteId: string;
	currentRouteId: string;
	currentSessionKey: string;
	targetSessionKey: string;
};

export function isPendingFirstMessageRouteCurrent(state: PendingFirstMessageRouteState): boolean {
	return (
		state.loadedRouteId === state.targetRouteId &&
		state.currentRouteId === state.targetRouteId &&
		state.currentSessionKey === state.targetSessionKey
	);
}
