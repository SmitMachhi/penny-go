# Sleek Evidence Quest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Penny's hidden/unused live working UI with sleek inline evidence-quest elements driven by real stream and tool events.

**Architecture:** Put route/token derivation in a pure chat helper, render it through one focused Svelte component, then wire the component into the active turn. Composer feedback stays local to the composer and CSS. Existing stream events remain the authority; no server changes are needed.

**Tech Stack:** Svelte 5, SvelteKit, TypeScript, Vitest, Tailwind v4 CSS utilities, existing `@lucide/svelte` icons only where already used.

---

### Task 1: Evidence Quest State

**Files:**
- Create: `web/src/lib/chat/evidence-quest.ts`
- Create: `web/src/lib/chat/evidence-quest.test.ts`

- [ ] **Step 1: Write failing tests**

Create `web/src/lib/chat/evidence-quest.test.ts` with tests for initial route state, completed tool tokens, web-search token, plan-building token, and status text.

- [ ] **Step 2: Run red test**

Run: `npm --prefix web test -- src/lib/chat/evidence-quest.test.ts`

Expected: fails because `evidence-quest.ts` does not exist.

- [ ] **Step 3: Implement helper**

Create `web/src/lib/chat/evidence-quest.ts` with:

- `EvidenceQuestStageId = 'ask' | 'find' | 'check' | 'plan'`
- `EvidenceQuestStage`
- `EvidenceQuestToken`
- `buildEvidenceQuestState({ tools, answerStarted })`

The helper maps real tool phases to route stage phases and short lowercase tokens.

- [ ] **Step 4: Run green test**

Run: `npm --prefix web test -- src/lib/chat/evidence-quest.test.ts`

Expected: test file passes.

- [ ] **Step 5: Commit**

Stage only the helper and test, then commit with a lowercase ironic message.

### Task 2: Inline Active Quest Component

**Files:**
- Create: `web/src/lib/components/chat/EvidenceQuest.svelte`
- Modify: `web/src/lib/components/chat/PennyActiveTurn.svelte`
- Delete: `web/src/lib/components/chat/PennyWorkSteps.svelte`
- Delete: `web/src/lib/chat/work-steps.ts`
- Delete: `web/src/lib/chat/work-steps.test.ts`

- [ ] **Step 1: Wire component**

Create `EvidenceQuest.svelte` using `buildEvidenceQuestState`. It must use `/penny-icon.png`, small route dots, hairline rails, and evidence tokens.

- [ ] **Step 2: Replace live thinking panel**

Modify `PennyActiveTurn.svelte` so the active run renders `EvidenceQuest` before the streaming `MessageBubble`; remove the live `ThinkingPanel` import and usage.

- [ ] **Step 3: Remove unused work steps**

Delete `PennyWorkSteps.svelte`, `work-steps.ts`, and `work-steps.test.ts`; verify no imports remain.

- [ ] **Step 4: Run focused checks**

Run: `npm --prefix web test -- src/lib/chat/evidence-quest.test.ts`

Expected: focused tests pass.

- [ ] **Step 5: Commit**

Stage only the active-turn/component/removal files and commit with a lowercase ironic message.

### Task 3: Motion And Composer Feedback

**Files:**
- Modify: `web/src/lib/components/chat/ChatComposer.svelte`
- Modify: `web/src/app.css`

- [ ] **Step 1: Add composer classes**

Add stable classes to the composer shell and buttons so CSS can animate send confirmation and stop state without changing behavior.

- [ ] **Step 2: Add CSS motion**

Add transform/opacity-only keyframes for quest enter, token pop, route pulse, route collapse while answering, and composer sweep. Include `prefers-reduced-motion` overrides.

- [ ] **Step 3: Run checks**

Run: `npm --prefix web run check`

Expected: Svelte and TypeScript checks pass.

- [ ] **Step 4: Commit**

Stage only `ChatComposer.svelte` and `app.css`, then commit with a lowercase ironic message.

### Task 4: Final Verification

**Files:**
- No new files unless verification exposes a defect.

- [ ] **Step 1: Run web checks**

Run: `npm --prefix web run check`

Expected: exits 0.

- [ ] **Step 2: Run web tests**

Run: `npm --prefix web test`

Expected: exits 0.

- [ ] **Step 3: Inspect diff**

Run: `git status --short --branch` and `git diff --stat HEAD~3..HEAD`.

Expected: only intended files are changed by the implementation commits.
