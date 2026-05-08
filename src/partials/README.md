# HTML Partials

Edit the `.html` files in this folder when changing the page structure.

The matching `.js` files are generated wrappers used so `src/index.html` can
still be opened directly from disk without a local HTTP server. After editing an
`.html` partial, run:

```powershell
node app/tools/sync-html-partials.js
```
