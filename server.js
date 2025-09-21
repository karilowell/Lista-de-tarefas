const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');

const PORT = process.env.PORT ? Number(process.env.PORT) : 5500;
const ROOT = process.cwd();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function safePath(p) {
  const decoded = decodeURIComponent(p);
  const pathname = decoded.replace(/\\/g, '/');
  const full = path.join(ROOT, pathname);
  if (!full.startsWith(ROOT)) return null; // prevent traversal
  return full;
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body && (body instanceof Buffer || typeof body === 'string')) res.end(body);
  else res.end();
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || '/');
  const pathname = parsed.pathname === '/' ? '/index.html' : (parsed.pathname || '/');
  const target = safePath(pathname);
  if (!target) return send(res, 400, { 'Content-Type': 'text/plain' }, 'Bad Request');

  fs.stat(target, (err, stat) => {
    if (err) {
      // Try without rewrite: serve 404
      return send(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
    }
    if (stat.isDirectory()) {
      const indexFile = path.join(target, 'index.html');
      return fs.stat(indexFile, (e2, st2) => {
        if (e2) return send(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
        streamFile(indexFile, st2, req, res);
      });
    }
    streamFile(target, stat, req, res);
  });
});

function streamFile(filePath, stat, req, res) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const etag = `W/"${stat.size}-${Number(stat.mtimeMs).toString(16)}"`;
  if (etag && req && req.headers && req.headers['if-none-match'] === etag) {
    return send(res, 304, { ETag: etag }, null);
  }
  const noCache = /\.(html|htm|jsx|js|mjs|css)$/i.test(ext);
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'ETag': etag,
    'Cache-Control': noCache ? 'no-cache' : 'public, max-age=3600'
  });
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => send(res, 500, { 'Content-Type': 'text/plain' }, 'Internal Server Error'));
  stream.pipe(res);
}

server.listen(PORT, () => {
  const urlStr = `http://localhost:${PORT}/`;
  console.log(`Serving ${ROOT} at ${urlStr}`);
  // Try to open the default browser
  const cmd = process.platform === 'win32'
    ? `start "" ${urlStr}`
    : process.platform === 'darwin'
      ? `open ${urlStr}`
      : `xdg-open ${urlStr}`;
  exec(cmd, () => {});
});
