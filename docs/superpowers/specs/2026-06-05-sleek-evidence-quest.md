# Sleek Evidence Quest

## Goal

Make Penny feel playful, responsive, and visibly active while it works, without adding a large status card or fake progress.

The working state should feel like Penny is collecting evidence on the user's behalf. The answer remains the main event; the live elements are small, sleek, and woven into the chat thread.

## Current Baseline

- `PennyWorkSteps` exists but is not rendered in the active chat path.
- `ThinkingPanel` exists, but its useful tool details are hidden behind expansion and do not create a satisfying visible working state.
- `ChatComposer` switches from send to stop during a run, but does not provide a clear prompt-accepted moment.

These unused or ineffective working-state components should be removed or replaced by the new inline evidence quest.

## Design

### Inline Evidence Quest

After the user sends a prompt, Penny shows a compact inline working element directly below the latest user message:

- real Penny header icon from `/penny-icon.png`
- short live status text, such as `checking evidence`
- a small route made from dots and hairline rails
- small evidence tokens, such as `corpus match`, `official source`, and `eligibility next`

This element must not be wrapped in a large card. It should align with the assistant side of the chat and use the same calm visual system as the rest of Penny.

### Route States

The route is not a percentage meter. It is a lightweight mission trail:

1. `Ask` is complete once the prompt is accepted.
2. `Find` is active when corpus or web search starts.
3. `Check` is active when official-source verification starts.
4. `Plan` is active when the funding plan or artifact is being prepared.

Unknown or skipped steps stay quiet. The UI must only reflect real client state from existing stream/tool/artifact events.

### Evidence Tokens

Tokens appear from real milestones:

- `search_corpus` done -> `corpus match`
- `read_official_source` done -> `official source`
- `web_search` done -> `web source`
- `create_funding_brief` running or artifact creation -> `plan building`

Tokens should be short and lowercase. Avoid fake program names, fake counts, fake percentages, or decorative achievements.

## Motion

Motion should feel precise and satisfying, not loud.

1. Send confirmation: the composer button compresses and the composer border performs one quick thin sweep.
2. Quest enter: the inline quest fades and slides in under the user prompt.
3. Evidence collect: each new token pops in with a small transform/opacity animation, and the route advances.
4. Answer resolve: when the final answer arrives, the route dots collapse or fade away. Evidence tokens either become a tiny source trail above the final answer or disappear if they add clutter.

All animations must use `transform` and `opacity`, respect `prefers-reduced-motion`, and avoid layout-shifting height changes where possible.

## Component Plan

- Remove `PennyWorkSteps.svelte` if no longer used after this change.
- Replace the live `ThinkingPanel`-first active turn with a new inline evidence quest component.
- Keep historical thinking traces available only where they are still useful and visible.
- Reuse `/penny-icon.png` instead of placeholder letter marks.
- Keep `ToolStrip` only if it remains used somewhere meaningful; otherwise remove it with its unused CSS.

## Data Flow

Use existing client state:

- `chat.state.sending` controls whether the live quest is present.
- `chat.state.tools` drives route and token state.
- `chat.state.streamingAnswerText` controls the transition from working to answering.
- artifact creation/update events can add the `plan building` token and open/refresh the artifact panel as today.

No new server events are required for the first version.

## Accessibility

- The working state should have one polite live region.
- Decorative route dots and token motion should be hidden from screen readers when redundant.
- Status text should remain understandable without animation.
- Stop response behavior must remain available while Penny is working.

## Testing

Add focused tests for:

- route state derived from tool phases
- token list derived from tool phases and artifacts
- active turn behavior before streaming, while streaming, and after finalization
- reduced-motion CSS path if covered by existing frontend test patterns

Run the existing web checks before implementation is considered complete.
