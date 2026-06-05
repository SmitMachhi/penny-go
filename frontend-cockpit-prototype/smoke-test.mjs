import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const prototypeDir = dirname(fileURLToPath(import.meta.url));

async function readPrototypeFile(name) {
	return readFile(join(prototypeDir, name), 'utf8');
}

function assertIncludes(source, expected, label) {
	if (!source.includes(expected)) {
		throw new Error(`${label} missing: ${expected}`);
	}
}

const index = await readPrototypeFile('index.html');
const styles = [
	await readPrototypeFile('styles.css'),
	await readPrototypeFile('workspace.css'),
	await readPrototypeFile('dossier.css')
].join('\n');
const script = await readPrototypeFile('app.js');

assertIncludes(index, 'Penny operations cockpit', 'document title');
assertIncludes(index, 'class="workbench-grid"', 'main cockpit grid');
assertIncludes(index, 'class="brief-intake"', 'brief intake panel');
assertIncludes(index, 'class="evidence-rail"', 'evidence rail');
assertIncludes(index, 'class="plan-dossier"', 'plan dossier');
assertIncludes(index, 'class="source-ledger"', 'source ledger');
assertIncludes(index, 'class="queue-panel"', 'session queue');
assertIncludes(index, 'data-mode-toggle', 'theme toggle control');

assertIncludes(styles, 'Plus Jakarta Sans Variable', 'existing sans font');
assertIncludes(styles, 'Sora Variable', 'existing display font');
assertIncludes(styles, 'JetBrains Mono Variable', 'existing mono font');
assertIncludes(styles, '--penny-brand: oklch(0.578 0.213 265.1)', 'brand color token');
assertIncludes(styles, '@media (max-width: 980px)', 'tablet responsive collapse');
assertIncludes(styles, '@media (max-width: 680px)', 'mobile responsive collapse');
assertIncludes(styles, '@media (prefers-reduced-motion: reduce)', 'reduced motion support');

assertIncludes(script, 'document.documentElement.classList.toggle', 'dark mode toggle');
assertIncludes(script, 'data-density-toggle', 'density toggle');
assertIncludes(script, 'data-open-dossier', 'dossier interaction');

console.log('frontend cockpit prototype smoke test passed');
