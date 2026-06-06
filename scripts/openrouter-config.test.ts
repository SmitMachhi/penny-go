import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const OPENROUTER_MODEL = 'openrouter/moonshotai/kimi-k2.6';
const OPENROUTER_PROVIDER_TAG = 'wandb/fp4';
const DEEPSEEK_MODEL = 'deepseek/deepseek-v4-flash';

async function readProjectFile(path: string): Promise<string> {
	return readFile(path, 'utf8');
}

test('penny openclaw config defaults to openrouter kimi k2.6', async () => {
	const config = await readProjectFile('config/openclaw.penny.example.json5');

	assert.match(config, new RegExp(`"primary": "${OPENROUTER_MODEL}"`));
	assert.match(config, new RegExp(DEEPSEEK_MODEL));
});

test('penny openrouter config pins wandb fp4 with high reasoning effort', async () => {
	const config = await readProjectFile('config/openclaw.penny.example.json5');

	assert.match(config, new RegExp(`"${OPENROUTER_MODEL}":\\s*\\{`));
	assert.match(config, new RegExp(`"order":\\s*\\["${OPENROUTER_PROVIDER_TAG}"\\]`));
	assert.match(config, /"allow_fallbacks":\s*false/);
	assert.match(config, /"reasoning":\s*\{\s*"effort":\s*"high"\s*\}/);
	assert.match(config, /"max_tokens":\s*16384/);
});

test('root env example asks for openrouter key and keeps deepseek fallback visible', async () => {
	const envExample = await readProjectFile('.env.example');

	assert.match(envExample, /^OPENROUTER_API_KEY=$/m);
	assert.match(envExample, /^DEEPSEEK_API_KEY=$/m);
});

test('setup docs document openrouter default and deepseek fallback', async () => {
	const readme = await readProjectFile('README.md');
	const localSetup = await readProjectFile('docs/penny-local-setup.md');

	for (const doc of [readme, localSetup]) {
		assert.match(doc, new RegExp(OPENROUTER_MODEL));
		assert.match(doc, /OPENROUTER_API_KEY/);
		assert.match(doc, new RegExp(DEEPSEEK_MODEL));
	}
});
