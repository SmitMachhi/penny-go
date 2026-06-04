import {
	Database,
	FileText,
	Globe,
	ShieldCheck,
	Wrench,
	type IconProps
} from '@lucide/svelte';
import type { Component } from 'svelte';

import type { ToolActivity } from '$lib/chat/messages.js';

export type ToolPresentation = {
	label: string;
	Icon: Component<IconProps, object, ''>;
	capsuleRunning: string;
	capsuleDone: string;
	capsuleError: string;
	iconRunning: string;
	iconDone: string;
	spinWhenRunning?: boolean;
};

const TOOL_PRESENTATIONS: Record<string, ToolPresentation> = {
	search_corpus: {
		label: 'Searching funding corpus',
		Icon: Database,
		capsuleRunning:
			'border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/45 dark:text-amber-100',
		capsuleDone:
			'border-amber-200/70 bg-amber-50/70 text-amber-900/80 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200/80',
		capsuleError:
			'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/15',
		iconRunning: 'text-amber-600 dark:text-amber-400',
		iconDone: 'text-amber-500/80 dark:text-amber-500/70'
	},
	read_official_source: {
		label: 'Verifying official source',
		Icon: ShieldCheck,
		capsuleRunning:
			'border-emerald-200/90 bg-emerald-50 text-emerald-950 dark:border-emerald-800/80 dark:bg-emerald-950/45 dark:text-emerald-100',
		capsuleDone:
			'border-emerald-200/70 bg-emerald-50/70 text-emerald-900/80 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200/80',
		capsuleError:
			'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/15',
		iconRunning: 'text-emerald-600 dark:text-emerald-400',
		iconDone: 'text-emerald-500/80 dark:text-emerald-500/70'
	},
	web_search: {
		label: 'Searching the web (Exa)',
		Icon: Globe,
		spinWhenRunning: true,
		capsuleRunning:
			'border-sky-200/90 bg-sky-50 text-sky-950 dark:border-sky-800/80 dark:bg-sky-950/45 dark:text-sky-100',
		capsuleDone:
			'border-sky-200/70 bg-sky-50/70 text-sky-900/80 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-200/80',
		capsuleError:
			'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/15',
		iconRunning: 'text-sky-600 dark:text-sky-400',
		iconDone: 'text-sky-500/80 dark:text-sky-500/70'
	},
	create_funding_brief: {
		label: 'Building funding plan',
		Icon: FileText,
		capsuleRunning:
			'border-stone-300/90 bg-stone-100 text-stone-900 dark:border-stone-700/80 dark:bg-stone-900/55 dark:text-stone-100',
		capsuleDone:
			'border-stone-300/70 bg-stone-100/70 text-stone-800/80 dark:border-stone-800/60 dark:bg-stone-900/30 dark:text-stone-200/80',
		capsuleError:
			'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/15',
		iconRunning: 'text-stone-600 dark:text-stone-300',
		iconDone: 'text-stone-500/80 dark:text-stone-400/70'
	}
};

const DEFAULT_PRESENTATION: ToolPresentation = {
	label: 'Working',
	Icon: Wrench,
	capsuleRunning:
		'border-border bg-muted text-foreground dark:border-border dark:bg-muted dark:text-foreground',
	capsuleDone: 'border-border/80 bg-muted/70 text-muted-foreground',
	capsuleError:
		'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/15',
	iconRunning: 'text-muted-foreground',
	iconDone: 'text-muted-foreground/70'
};

export function getToolPresentation(name: string): ToolPresentation {
	const known = TOOL_PRESENTATIONS[name];
	if (known) {
		return known;
	}
	return { ...DEFAULT_PRESENTATION, label: name };
}

export function toolLabel(name: string): string {
	return getToolPresentation(name).label;
}

export function capsuleClass(presentation: ToolPresentation, phase: ToolActivity['phase']): string {
	switch (phase) {
		case 'running':
			return presentation.capsuleRunning;
		case 'error':
			return presentation.capsuleError;
		default:
			return presentation.capsuleDone;
	}
}

export function iconClass(presentation: ToolPresentation, phase: ToolActivity['phase']): string {
	switch (phase) {
		case 'running':
			return presentation.iconRunning;
		case 'error':
			return 'text-destructive';
		default:
			return presentation.iconDone;
	}
}

const PHASE_RANK: Record<ToolActivity['phase'], number> = {
	running: 0,
	error: 1,
	done: 2
};

export function sortToolsForDisplay(tools: ToolActivity[]): ToolActivity[] {
	return [...tools].sort((left, right) => PHASE_RANK[left.phase] - PHASE_RANK[right.phase]);
}

export function hasRunningTools(tools: ToolActivity[]): boolean {
	return tools.some((tool) => tool.phase === 'running');
}
