<script lang="ts">
	import { onMount } from 'svelte';

	import {
		blockStatusTransitionText,
		WORKING_STATUS_LINES
	} from '$lib/chat/block-status-transition.js';

	type Props = {
		active?: boolean;
		status: string;
	};

	const STATUS_HOLD_MS = 2400;
	const TRANSITION_FRAME_MS = 140;
	const TRANSITION_STEPS = 10;
	const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
	const FIRST_INDEX = 0;

	let { active = true, status }: Props = $props();

	let displayedStatus = $state('');
	let reduceMotion = $state(false);
	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let transitionTimer: ReturnType<typeof setInterval> | null = null;

	function clearTimers(): void {
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}
		if (transitionTimer) {
			clearInterval(transitionTimer);
			transitionTimer = null;
		}
	}

	function nextStatusLine(current: string): string {
		const options = WORKING_STATUS_LINES.filter((line) => line !== current);
		const index = Math.floor(Math.random() * options.length);
		return options[index] ?? WORKING_STATUS_LINES[FIRST_INDEX];
	}

	function beginTransition(): void {
		const from = displayedStatus;
		const to = nextStatusLine(from);
		let step = 0;

		transitionTimer = setInterval(() => {
			step += 1;
			displayedStatus = blockStatusTransitionText({
				from,
				to,
				step,
				totalSteps: TRANSITION_STEPS
			});

			if (step >= TRANSITION_STEPS) {
				clearTimers();
				displayedStatus = to;
				scheduleNextTransition();
			}
		}, TRANSITION_FRAME_MS);
	}

	function scheduleNextTransition(): void {
		holdTimer = setTimeout(beginTransition, STATUS_HOLD_MS);
	}

	onMount(() => {
		const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
		const updateMotion = () => {
			reduceMotion = motionQuery.matches;
		};
		updateMotion();
		motionQuery.addEventListener('change', updateMotion);

		return () => {
			clearTimers();
			motionQuery.removeEventListener('change', updateMotion);
		};
	});

	$effect(() => {
		clearTimers();
		if (!active || reduceMotion) {
			displayedStatus = status;
			return;
		}

		displayedStatus = status;
		scheduleNextTransition();
	});
</script>

<span class="penny-evidence-quest__status">{displayedStatus}</span>
