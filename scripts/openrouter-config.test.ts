import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const DEEPSEEK_MODEL = 'deepseek/deepseek-v4-flash';
const DEEPSEEK_PROVIDER_TAG = 'deepseek';

async function readProjectFile(path: string): Promise<string> {
	return readFile(path, 'utf8');
}

test('penny openclaw config defaults to deepseek v4 flash', async () => {
	const config = await readProjectFile('config/openclaw.penny.example.json5');

	assert.match(config, new RegExp(`"primary": "${DEEPSEEK_MODEL}"`));
});

test('penny deepseek config pins first party provider with high reasoning effort', async () => {
	const config = await readProjectFile('config/openclaw.penny.example.json5');

	assert.match(config, new RegExp(`"${DEEPSEEK_MODEL}":\\s*\\{`));
	assert.match(config, new RegExp(`"order":\\s*\\["${DEEPSEEK_PROVIDER_TAG}"\\]`));
	assert.match(config, /"allow_fallbacks":\s*false/);
	assert.match(config, /"reasoning":\s*\{\s*"effort":\s*"high"\s*\}/);
	assert.match(config, /"max_tokens":\s*16384/);
});

test('root env example asks for deepseek key and keeps openrouter key visible', async () => {
	const envExample = await readProjectFile('.env.example');

	assert.match(envExample, /^OPENROUTER_API_KEY=$/m);
	assert.match(envExample, /^DEEPSEEK_API_KEY=$/m);
});

test('setup docs document deepseek default', async () => {
	const readme = await readProjectFile('README.md');
	const localSetup = await readProjectFile('docs/penny-local-setup.md');

	for (const doc of [readme, localSetup]) {
		assert.match(doc, new RegExp(DEEPSEEK_MODEL));
		assert.match(doc, /DEEPSEEK_API_KEY/);
	}
});
