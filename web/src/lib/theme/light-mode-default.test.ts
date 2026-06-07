import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

import {
	LIGHT_MODE_BOOTSTRAP_SCRIPT,
	MODE_WATCHER_STORAGE_KEY,
	PENNY_DEFAULT_MODE,
	PENNY_TRACK_SYSTEM_MODE
} from './light-mode-default.js';

describe('light mode default', () => {
	it('configures Penny to start in light mode without system tracking', () => {
		expect(PENNY_DEFAULT_MODE).toBe('light');
		expect(PENNY_TRACK_SYSTEM_MODE).toBe(false);
	});

	it('clears persisted dark mode before ModeWatcher starts', () => {
		const removedKeys: string[] = [];
		const classes = new Set(['dark']);
		const context = {
			document: {
				documentElement: {
					classList: {
						remove: (...names: string[]) => {
							for (const name of names) {
								classes.delete(name);
							}
						}
					},
					style: {
						colorScheme: 'dark'
					}
				}
			},
			localStorage: {
				removeItem: (key: string) => {
					removedKeys.push(key);
				}
			}
		};

		vm.runInNewContext(LIGHT_MODE_BOOTSTRAP_SCRIPT, context);

		expect(removedKeys).toEqual([MODE_WATCHER_STORAGE_KEY]);
		expect(classes.has('dark')).toBe(false);
		expect(context.document.documentElement.style.colorScheme).toBe('light');
	});
});
