import { describe, expect, it } from 'vitest';

import { buildConnectParams } from './connect-params.js';

describe('buildConnectParams', () => {
	it('requests admin scope for session delete and rename', () => {
		const params = buildConnectParams('test-token');
		expect(params.scopes).toEqual(['operator.admin', 'operator.read', 'operator.write']);
	});
});
