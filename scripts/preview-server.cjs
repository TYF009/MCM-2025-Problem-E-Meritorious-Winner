const http = require('node:http');
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'dist');
const prefix = '/MCM-2025-Problem-E-Meritorious-Winner/';
const types = { '.html':'text/html; charset=utf-8', '.mjs':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.webp':'image/webp', '.jpeg':'image/jpeg', '.pdf':'application/pdf' };

async function startPreview(port = 0) {
  await fs.access(path.join(root,'artifact-manifest.json'));
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url,'http://localhost');
      if (url.pathname === '/' || url.pathname === prefix.slice(0,-1)) {
        response.writeHead(308, { Location:prefix }).end();
        return;
      }
      if (!url.pathname.startsWith(prefix)) return response.writeHead(404).end();
      const pathname = decodeURIComponent(url.pathname.slice(prefix.length));
      const file = path.resolve(root, pathname.endsWith('/') || !pathname ? pathname+'index.html' : pathname);
      if (!file.startsWith(root+path.sep)) return response.writeHead(404).end();
      const stat = await fs.stat(file).catch(() => null);
      if (!stat?.isFile()) return response.writeHead(404).end();
      response.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'text/plain; charset=utf-8' });
      if (request.method === 'HEAD') response.end();
      else createReadStream(file).pipe(response);
    } catch {
      if (!response.headersSent) response.writeHead(400);
      response.end();
    }
  });
  await new Promise((resolve, reject) => server.once('error',reject).listen(port,'127.0.0.1',resolve));
  return { server, base:'http://127.0.0.1:'+server.address().port+prefix };
}
module.exports = { startPreview };
