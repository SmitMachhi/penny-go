const themeToggle = document.querySelector('[data-mode-toggle]');
const densityToggle = document.querySelector('[data-density-toggle]');
const dossierButton = document.querySelector('[data-open-dossier]');
const sessionRows = Array.from(document.querySelectorAll('[data-session]'));

function announceDossierOpen() {
	if (!dossierButton) {
		return;
	}
	dossierButton.textContent = 'PDF ready';
	window.setTimeout(() => {
		dossierButton.textContent = 'Open PDF';
	}, 1400);
}

themeToggle?.addEventListener('click', () => {
	document.documentElement.classList.toggle('dark');
});

densityToggle?.addEventListener('click', () => {
	document.documentElement.classList.toggle('dense');
});

dossierButton?.addEventListener('click', announceDossierOpen);

for (const row of sessionRows) {
	row.addEventListener('click', () => {
		for (const sessionRow of sessionRows) {
			sessionRow.classList.remove('active');
		}
		row.classList.add('active');
	});
}
