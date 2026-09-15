import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Dev-only middleware: the page POSTs { filename, dataUrl } to /api/save-sprite
// and we write the decoded PNG straight to disk under output/ — lets the
// browser-driven render harness batch-generate many sprites without any
// manual copy/paste or blocked in-page download.
function saveSpritePlugin() {
  return {
    name: 'save-sprite',
    configureServer(server) {
      server.middlewares.use('/api/save-sprite', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const { filename, dataUrl } = JSON.parse(body);
            const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
            const outDir = path.resolve(process.cwd(), 'output');
            fs.mkdirSync(outDir, { recursive: true });
            const outPath = path.join(outDir, filename);
            fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: outPath }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: e.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [saveSpritePlugin()],
});
