import { chromium } from 'playwright';

const SESSION_URL =
	'http://localhost:5173/c/e6b05229-41df-4641-ba28-96b52e5b5bac';
const PILL_TEXT = 'View in panel';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
	await page.goto(SESSION_URL, { waitUntil: 'networkidle', timeout: 60_000 });
	await page.waitForTimeout(3000);

	const retry = page.getByRole('button', { name: 'Retry' });
	if (await retry.isVisible().catch(() => false)) {
		await retry.click();
		await page.waitForTimeout(2000);
	}

	await page
		.getByText('clean energy business', { exact: false })
		.first()
		.waitFor({ timeout: 60_000 });

	const pill = page.getByRole('button', { name: new RegExp(PILL_TEXT) });
	await pill.scrollIntoViewIfNeeded();
	await pill.click();
	await page.waitForTimeout(2000);

	const panel = page.locator('.artifact-panel-aside');
	const panelVisible = await panel.isVisible();
	const embed = page.locator('embed[title="Funding memo preview"]');
	const iframe = page.locator('iframe[title="Funding memo preview"]');
	const hasEmbed = (await embed.count()) > 0;
	const hasIframe = (await iframe.count()) > 0;
	const viewer = hasEmbed ? embed : iframe;
	const viewerBox = hasEmbed || hasIframe ? await viewer.first().boundingBox() : null;
	const panelText = panelVisible ? (await panel.innerText()).slice(0, 200) : '';
	const loadingMemo = await page.getByText('Loading memo…').isVisible().catch(() => false);
	const pdfError = await page.getByText('Could not load PDF').isVisible().catch(() => false);

	await page.screenshot({ path: '/tmp/penny-playwright-panel.png', fullPage: true });

	const pdfResponse = await page.request.get(
		'http://localhost:5173/api/artifacts/0b5f050d-7f44-49a0-8c31-c085a8a5faea?sessionKey=agent%3Amain%3Apenny%3Ae6b05229-41df-4641-ba28-96b52e5b5bac&preview=pdf&version=1'
	);

	console.log(
		JSON.stringify(
			{
				panelVisible,
				panelText,
				hasEmbed,
				hasIframe,
				viewerHeight: viewerBox?.height ?? 0,
				viewerWidth: viewerBox?.width ?? 0,
				loadingMemo,
				pdfError,
				pdfApiStatus: pdfResponse.status(),
				pdfApiType: pdfResponse.headers()['content-type']
			},
			null,
			2
		)
	);

	if (!panelVisible) {
		throw new Error('artifact_panel_not_visible_after_pill_click');
	}
	if (pdfError) {
		throw new Error('pdf_preview_error_shown');
	}
	if (!hasEmbed && !hasIframe) {
		throw new Error('pdf_viewer_element_missing');
	}
	if ((viewerBox?.height ?? 0) < 100) {
		throw new Error('pdf_viewer_too_short');
	}
} finally {
	await browser.close();
}
