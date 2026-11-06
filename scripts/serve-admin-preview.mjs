// Local-only SPA preview of the exact Vercel build. API calls in browser tests are intercepted fixtures.
import { createServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const security = config.headers.find(row => row.source === '/(.*)').headers;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const handler = async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let path = resolve(root, '.' + pathname);
    if (!path.startsWith(root)) { res.writeHead(403).end(); return; }
    try { if (!(await stat(path)).isFile()) throw new Error(); }
    catch { path = root + (pathname.startsWith('/business') ? 'business/index.html' : 'index.html'); }
    for (const { key, value } of security) res.setHeader(key, value);
    // localhost uses HTTP; production's upgrade-insecure-requests would upgrade fixture requests.
    res.setHeader('Content-Security-Policy', res.getHeader('Content-Security-Policy').replace('; upgrade-insecure-requests', ''));
    res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
};
const server = process.env.NEXORA_PREVIEW_CERT ? createHttpsServer({ cert: await readFile(process.env.NEXORA_PREVIEW_CERT),
  key: await readFile(process.env.NEXORA_PREVIEW_KEY) }, handler) : createServer(handler);
server.listen(Number(process.env.NEXORA_PREVIEW_PORT || 8093), '127.0.0.1', () => console.log('Local built-app preview ready.'));
