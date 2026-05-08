const partials = [
  { key: 'splash', target: '#splash-slot', url: './partials/splash.html' },
  { key: 'shell-frame', target: '#shell-frame-slot', url: './partials/shell-frame.html' },
  { key: 'command-sheet', target: '#command-sheet-slot', url: './partials/command-sheet.html' },
  { key: 'save-load-sheet', target: '#save-load-sheet-slot', url: './partials/save-load-sheet.html' },
  { key: 'map-sheet', target: '#map-sheet-slot', url: './partials/map-sheet.html' },
  { key: 'credits-sheet', target: '#credits-sheet-slot', url: './partials/credits-sheet.html' },
  { key: 'settings-sheet', target: '#settings-sheet-slot', url: './partials/settings-sheet.html' },
  { key: 'confirm-sheet', target: '#confirm-sheet-slot', url: './partials/confirm-sheet.html' },
];

const legacyScripts = [
  './ui-framework.js',
  './parser.js',
  './vm-core.js',
  './quetzal-storage.js',
  './map-data.js',
  './map-discovery.js',
  './map-renderer.js',
  './io.js',
  './bundled-story.js',
  './map-snow-layer.js',
  './app.js',
];

async function loadPartials() {
  await Promise.all(partials.map(async ({ key, target, url }) => {
    const slot = document.querySelector(target);
    if (!slot) {
      throw new Error(`Missing partial slot: ${target}`);
    }
    let html = window.LhHtmlPartials && window.LhHtmlPartials[key];
    if (typeof html !== 'string') {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Could not load ${url}: ${response.status}`);
      }
      html = await response.text();
    }
    slot.outerHTML = html;
  }));
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.appendChild(script);
  });
}

async function boot() {
  await loadPartials();
  for (const src of legacyScripts) {
    await loadScript(src);
  }
}

boot().catch(error => {
  console.error(error);
  const status = document.getElementById('splash-status');
  if (status) {
    status.textContent = 'Could not load application files.';
    status.classList.add('error');
  }
});
