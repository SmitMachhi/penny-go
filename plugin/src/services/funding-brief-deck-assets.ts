import { pennyBrandCssVariables } from '@penny/shared/penny-brand';

export function renderDeckStyles(): string {
	return `
    :root { ${pennyBrandCssVariables()}; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--penny-bg);
      color: var(--penny-fg);
    }
    .deck { min-height: 100vh; display: flex; flex-direction: column; }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--penny-border);
      background: var(--penny-card);
    }
    .toolbar .logo { height: 28px; width: auto; }
    .toolbar-meta { color: var(--penny-muted-fg); font-size: 0.875rem; }
    .stage {
      flex: 1;
      display: grid;
      place-items: center;
      padding: 1.5rem;
    }
    .slide {
      display: none;
      width: min(960px, 100%);
      background: var(--penny-card);
      color: var(--penny-card-fg);
      border: 1px solid var(--penny-border);
      border-radius: 1rem;
      padding: 2rem;
      box-shadow: 0 12px 40px color-mix(in oklch, var(--penny-primary) 12%, transparent);
    }
    .slide.active { display: block; }
    .slide-header h1, .slide-header h2 { margin: 0.25rem 0 0.75rem; color: var(--penny-primary); }
    .eyebrow {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.75rem;
      color: var(--penny-muted-fg);
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border-radius: 999px;
      border: 1px solid;
      font-size: 0.75rem;
      font-weight: 600;
    }
    section { margin-top: 1rem; }
    h3 { margin: 0 0 0.5rem; font-size: 0.95rem; }
    ul { margin: 0; padding-left: 1.25rem; }
    li + li { margin-top: 0.35rem; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .meta-grid p { margin: 0.25rem 0 0; }
    .official-url { margin-top: 1.25rem; word-break: break-word; }
    a { color: var(--penny-primary); }
    .controls {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      padding: 1rem;
      border-top: 1px solid var(--penny-border);
      background: var(--penny-card);
    }
    button {
      border: 1px solid var(--penny-border);
      background: var(--penny-accent);
      color: var(--penny-fg);
      border-radius: 999px;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font: inherit;
    }
    button.primary {
      background: var(--penny-primary);
      color: var(--penny-primary-fg);
      border-color: transparent;
    }
    @media print {
      .toolbar, .controls { display: none; }
      .slide { display: block !important; page-break-after: always; box-shadow: none; }
      .stage { display: block; padding: 0; }
    }`;
}

export function renderDeckScript(): string {
	return `
    (function () {
      const slides = Array.from(document.querySelectorAll('.slide'));
      const counter = document.getElementById('counter');
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      let index = 0;

      function render() {
        slides.forEach((slide, slideIndex) => {
          slide.classList.toggle('active', slideIndex === index);
        });
        counter.textContent = String(index + 1) + ' / ' + String(slides.length);
      }

      function move(delta) {
        index = Math.max(0, Math.min(slides.length - 1, index + delta));
        render();
      }

      prevBtn.addEventListener('click', () => move(-1));
      nextBtn.addEventListener('click', () => move(1));
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') move(-1);
        if (event.key === 'ArrowRight') move(1);
      });
      render();
    })();`;
}
