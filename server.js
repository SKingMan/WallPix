// ============================================================
// WallPix 服务器：静态文件 + SPA fallback + 反代内网 PB
// 纯 Node 内置模块，零依赖
//
// 架构：
//   浏览器 → :18082 (主机) → 容器内 :80 (本服务)
//                                  ├─ /api/* / /_/*  → 反代 host.docker.internal:8090
//                                  └─ 其他           → dist/ 静态文件（SPA fallback）
//
// PB 在宿主机监听 0.0.0.0:8090，容器通过 host.docker.internal 走内网访问
// 浏览器看到的请求全是同源（同一 IP:PORT），零 CORS 问题
// ============================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '80', 10);

// 反代目标：宿主机 PB（容器内走内网）
const PB_HOST = process.env.POCKETBASE_HOST || 'host.docker.internal';
const PB_PORT = parseInt(process.env.POCKETBASE_PORT || '8090', 10);

// 前端 PB 连接地址（构建时注入），决定前端用相对路径还是绝对路径
const PB_BASE = process.env.PB_BASE_PATH || '/';

// ============================================================
// MIME 类型
// ============================================================
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico':  'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.eot':   'application/vnd.ms-fontobject',
  '.otf':   'font/otf',
  '.txt':   'text/plain; charset=utf-8',
};

const GZIP_TYPES = new Set([
  'text/html', 'text/css', 'text/javascript', 'text/plain',
  'application/javascript', 'application/json', 'image/svg+xml', 'font/woff2',
]);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options':        'SAMEORIGIN',
  'X-XSS-Protection':       '1; mode=block',
  'Referrer-Policy':        'strict-origin-when-cross-origin',
};

const IMMUTABLE = /\.(?:js|mjs|css|woff2?|ttf|eot|otf|ico)$/i;
const CACHEABLE = /\.(?:png|jpe?g|gif|webp|avif|svg)$/i;

function maybeGzip(res, headers, data) {
  const ct = (headers['Content-Type'] || '').split(';')[0].trim();
  if (!GZIP_TYPES.has(ct) || data.length <= 1024) {
    res.writeHead(res.statusCode, headers);
    res.end(data);
    return;
  }
  zlib.gzip(data, (err, gz) => {
    if (err) {
      res.writeHead(res.statusCode, headers);
      res.end(data);
      return;
    }
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
    res.writeHead(res.statusCode, headers);
    res.end(gz);
  });
}

// ============================================================
// 静态文件 + SPA fallback
// ============================================================
function serveStatic(req, res) {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(DIST_DIR, url === '/' ? '/index.html' : url);

  // 防路径穿越
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback
      filePath = path.join(DIST_DIR, 'index.html');
    }

    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const headers = {
        ...SECURITY_HEADERS,
        'Content-Type': MIME[ext] || 'application/octet-stream',
      };

      if (filePath.endsWith('index.html')) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
      } else if (IMMUTABLE.test(filePath)) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      } else if (CACHEABLE.test(filePath)) {
        headers['Cache-Control'] = 'public, max-age=2592000';
      }

      res.statusCode = 200;
      maybeGzip(res, headers, data);
    });
  });
}

// ============================================================
// 反代 PocketBase（容器内 → 宿主机内网）
// ============================================================
function proxyToPB(req, res) {
  const options = {
    hostname: PB_HOST,
    port: PB_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${PB_HOST}:${PB_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, {
      ...proxyRes.headers,
      ...SECURITY_HEADERS,
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[proxy] ${req.url} → ${PB_HOST}:${PB_PORT} :: ${err.code || err.message}`);
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      `Bad Gateway\n` +
      `无法连接 PocketBase (${PB_HOST}:${PB_PORT})\n` +
      `请确认宿主机 PB 监听 0.0.0.0:${PB_PORT}\n` +
      `错误: ${err.code || err.message}\n`
    );
  });

  req.pipe(proxyReq);
}

// ============================================================
// 路由
// ============================================================
const server = http.createServer((req, res) => {
  // 防御性归一化：把 '//api/...' 合并为 '/api/...'
  // 防止前端用 baseUrl='/' 拼出 'http://host//api/...' 时漏掉反代
  const normalizedUrl = req.url.replace(/^\/+/, '/')
  if (req !== res) {
    // 改写 req.url 让后续 proxyToPB 用正确的路径
    Object.defineProperty(req, 'url', { value: normalizedUrl, writable: true })
  }

  // 转发到 PB：/api/* 和 /_/*
  if (normalizedUrl.startsWith('/api/') || normalizedUrl.startsWith('/_/')) {
    return proxyToPB(req, res);
  }
  // 其他：静态文件
  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  WallPix Server Started');
  console.log(`  Listen:    0.0.0.0:${PORT}`);
  console.log(`  Static:    ${DIST_DIR}`);
  console.log(`  PB proxy:  ${PB_HOST}:${PB_PORT} (内网)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${sig} received, closing...`);
    server.close(() => process.exit(0));
  });
}
