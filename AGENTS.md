## Code Rules
1. Strict TS: no `any`, unchecked casts, `var`, unused vars, or unsorted imports; default to `const`. 
2. Keep files ≤200 LOC, functions ≤50 LOC, complexity ≤10, nesting ≤3, and logic DRY.
3. No secrets in code, logs, or commits; validate external input at boundaries.
4. No magic numbers: name every numeric literal with a semantic constant.
5. Penny stays agentic: reasoning, context, evidence, tools, and model output drives decisions; deterministic code only frames tools, safety gates, and evidence constraints.

## Commit Rules — MANDATORY, NO EXCEPTIONS
1. Auto-commit each verified logical change immediately.
2. Stage files explicitly by name; never use `git add .` or `git add -A`.
3. Commit messages: lowercase, ≤6 words, ironic sounding.
4. No trailers: never add `Co-Authored-By`, `Signed-off-by`, or similar lines.

## Source Code Reference
- `opensrc` is installed globally at `/opt/homebrew/bin/opensrc`.
- Source code for dependencies is cached at `~/.opensrc/` unless `OPENSRC_HOME` is set.
- Use `opensrc path` inside shell commands to inspect dependency source:

```bash
rg "pattern" $(opensrc path <package>)
cat $(opensrc path <package>)/path/to/file
```
- OpenClaw source is cached for both repo and npm package lookup:

```bash
opensrc path openclaw/openclaw
opensrc path openclaw
```
- Composio source is cached for the repo and Python package lookup; use the repo path for TypeScript SDK source because `@composio/core` lacks repository metadata for `opensrc`:

```bash
opensrc path composiohq/composio
opensrc path pypi:composio
```
- QMD source is cached for both repo and npm package lookup:

```bash
opensrc path tobi/qmd
opensrc path @tobilu/qmd
```
- Browser Harness source is cached for repo lookup:

```bash
opensrc path browser-use/browser-harness
```
