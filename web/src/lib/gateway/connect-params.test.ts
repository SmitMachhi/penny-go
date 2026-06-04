import { describe, expect, it } from 'vitest';

import { buildConnectParams } from './connect-params.js';

describe('buildConnectParams', () => {
	it('requests least-privilege operator chat scopes', () => {
		const params = buildConnectParams('test-token');
		expect(params.scopes).toEqual(['operator.read', 'operator.write']);
	});
});
