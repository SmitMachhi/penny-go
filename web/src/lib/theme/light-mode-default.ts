export const MODE_WATCHER_STORAGE_KEY = 'mode-watcher-mode';
export const PENNY_DEFAULT_MODE = 'light';
export const PENNY_TRACK_SYSTEM_MODE = false;

export const LIGHT_MODE_BOOTSTRAP_SCRIPT = [
	'try {',
	`localStorage.removeItem(${JSON.stringify(MODE_WATCHER_STORAGE_KEY)});`,
	'document.documentElement.classList.remove("dark");',
	'document.documentElement.style.colorScheme = "light";',
	'} catch {}'
].join('');

export const LIGHT_MODE_BOOTSTRAP_TAG = `<script>${LIGHT_MODE_BOOTSTRAP_SCRIPT}</script>`;
