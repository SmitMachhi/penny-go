import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const FIREWORKS_PRIMARY_MODEL = 'fireworks/accounts/fireworks/models/deepseek-v4-flash';
const FIREWORKS_FALLBACK_MODEL = 'fireworks/accounts/fireworks/models/kimi-k2p7-code';
const MAX_OUTPUT_TOKENS = 16384;
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

test('penny openclaw config defaults to Fireworks DeepSeek V4 Flash', async () => {
	const config = await readProjectFile('config/openclaw.penny.example.json5');

	assert.match(config, new RegExp(`"primary": "${FIREWORKS_PRIMARY_MODEL}"`));
});

test('penny Fireworks configs keep Kimi K2.7 Code as fallback with bounded output', async () => {
	for (const configPath of OPENCLAW_CONFIG_PATHS) {
		const config = await readProjectFile(configPath);

		assert.match(config, new RegExp(`"${FIREWORKS_PRIMARY_MODEL}":\\s*\\{`));
		assert.match(config, new RegExp(`"${FIREWORKS_FALLBACK_MODEL}":\\s*\\{`));
		assert.match(config, new RegExp(`"fallbacks":\\s*\\["${FIREWORKS_FALLBACK_MODEL}"\\]`));
		assert.match(config, /"reasoning":\s*\{\s*"effort":\s*"high"\s*\}/);
		assert.match(config, new RegExp(`"max_tokens":\\s*${MAX_OUTPUT_TOKENS}`));
		assert.match(config, /"allow":\s*\["fireworks",\s*"exa",\s*"penny-tools"\]/);
	}
});

test('root env example asks for Fireworks key without legacy model-provider keys', async () => {
	const envExample = await readProjectFile('.env.example');

	assert.match(envExample, /^FIREWORKS_API_KEY=$/m);
	assert.doesNotMatch(envExample, /^OPENROUTER_API_KEY=$/m);
	assert.doesNotMatch(envExample, /^DEEPSEEK_API_KEY=$/m);
});

test('setup docs document Fireworks primary fallback and compliance posture', async () => {
	const readme = await readProjectFile('README.md');
	const localSetup = await readProjectFile('docs/penny-local-setup.md');

	for (const doc of [readme, localSetup]) {
		assert.match(doc, new RegExp(FIREWORKS_PRIMARY_MODEL));
		assert.match(doc, new RegExp(FIREWORKS_FALLBACK_MODEL));
		assert.match(doc, /FIREWORKS_API_KEY/);
		assert.match(doc, /Zero Data Retention/);
		assert.match(doc, /SOC 2 Type II/);
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
