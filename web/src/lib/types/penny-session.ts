export type SessionTitleStatus = 'loading' | 'ready';

export type PennySessionView = {
	key: string;
	title: string;
	titleStatus: SessionTitleStatus;
	updatedAt: number | null;
	isLegacy: boolean;
};
