import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const DEEPSEEK_MODEL = 'deepseek/deepseek-v4-flash';
const DEEPSEEK_PROVIDER_TAG = 'deepseek';
const OPENCLAW_CONFIG_PATHS = [
	'config/openclaw.fly.json5',
	'config/openclaw.penny.example.json5'
] as const;
const OPENCLAW_NATIVE_SKILLS_DISABLED_PATTERN = /"nativeSkills"\s*:\s*false/;
const RUNTIME_SKILLS_KEY_PATTERN = /"skills"\s*:/;
const GENERIC_READ_TOOL_PATTERN = /"read"/;
const ARTIFACT_SKILL_POINTER_PATTERN = /penny-artifacts`?\s+skill|skills\/penny-artifacts/i;
const PUBLISH_TOOL_PATTERN = /publish_funding_brief/;
const RUNTIME_SKILL_SETUP_PATTERN = /agents\.defaults\.skills|openclaw skills list/i;

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

test('locked Penny OpenClaw configs do not depend on runtime skill reads', async () => {
	for (const configPath of OPENCLAW_CONFIG_PATHS) {
		const config = await readProjectFile(configPath);
		const hasRuntimeSkills = RUNTIME_SKILLS_KEY_PATTERN.test(config);
		const exposesReadTool = GENERIC_READ_TOOL_PATTERN.test(config);

		assert.equal(
			hasRuntimeSkills && !exposesReadTool,
			false,
			`${configPath} must not configure runtime skills unless generic read is allowed`
		);
	}
});

test('Penny OpenClaw configs disable native skill auto-loading', async () => {
	for (const configPath of OPENCLAW_CONFIG_PATHS) {
		const config = await readProjectFile(configPath);

		assert.match(config, OPENCLAW_NATIVE_SKILLS_DISABLED_PATTERN);
	}
});

test('Fly keeps Penny gateway warm instead of scale-to-zero', async () => {
	const config = await readProjectFile('fly.toml');

	assert.match(config, /auto_stop_machines\s*=\s*"off"/);
	assert.match(config, /min_machines_running\s*=\s*1/);
});

test('always-loaded Penny instructions contain artifact workflow without skill indirection', async () => {
	const agentRules = await readProjectFile('workspace/AGENTS.md');
	const voiceRules = await readProjectFile('workspace/SOUL.md');
	const alwaysLoadedRules = `${agentRules}\n${voiceRules}`;

	assert.match(alwaysLoadedRules, PUBLISH_TOOL_PATTERN);
	assert.doesNotMatch(alwaysLoadedRules, ARTIFACT_SKILL_POINTER_PATTERN);
});

test('setup docs do not reintroduce runtime skill loading', async () => {
	const localSetup = await readProjectFile('docs/penny-local-setup.md');

	assert.doesNotMatch(localSetup, RUNTIME_SKILL_SETUP_PATTERN);
});
