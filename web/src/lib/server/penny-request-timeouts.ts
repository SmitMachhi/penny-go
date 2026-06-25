const MINUTE_MS = 60_000;

/** Client bootstrap/history fetch while gateway may be busy with a long run. */
export const BOOTSTRAP_FETCH_TIMEOUT_MS = 2 * MINUTE_MS;

/** Gateway RPC timeout for chat.history during long research runs. */
export const CHAT_HISTORY_RPC_TIMEOUT_MS = 3 * MINUTE_MS;

/** Default gateway RPC timeout for send/abort/ping. */
export const GATEWAY_DEFAULT_RPC_TIMEOUT_MS = 2 * MINUTE_MS;
