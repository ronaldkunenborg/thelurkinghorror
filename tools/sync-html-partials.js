const fs = require('fs');
const path = require('path');

const partialsDir = path.resolve(__dirname, '../src/partials');

for (const entry of fs.readdirSync(partialsDir)) {
  if (!entry.endsWith('.html')) {
    continue;
  }
  const key = path.basename(entry, '.html');
  const htmlPath = path.join(partialsDir, entry);
  const jsPath = path.join(partialsDir, `${key}.js`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const source = [
    'window.LhHtmlPartials = window.LhHtmlPartials || {};',
    `window.LhHtmlPartials[${JSON.stringify(key)}] = ${JSON.stringify(html)};`,
    '',
  ].join('\n');
  fs.writeFileSync(jsPath, source, 'utf8');
}
