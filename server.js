/* =========================================================
   سيرفر موقع مركز صيانة ذاكر حسين (بدون مكتبات خارجية)
   - بيخدم الموقع
   - بينجز التعديلات من لوحة التحكم لكل الزوار (config.json)
   - بيستقبل رفع الصور ويخزنها في uploads/ ليظهرها لكل الزوار
   التشغيل:  node server.js   (أو  node server.js 8080)
   ========================================================= */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const HOST = '0.0.0.0';
const MAX_BODY = 25 * 1024 * 1024; // 25MB للملفات الكبيرة

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};
const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

function send(res, code, data, ctype) {
  res.writeHead(code, {
    'Content-Type': ctype || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(data);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('file too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function json(res, obj, code) { send(res, code || 200, JSON.stringify(obj), 'application/json; charset=utf-8'); }

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    let p = decodeURIComponent(u.pathname);

    /* ---------- API ---------- */
    if (p === '/api/config' || p === '/api/config/') {
      if (req.method === 'GET') {
        let cfg = {};
        try { if (fs.existsSync(CONFIG_FILE)) cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch (e) { cfg = {}; }
        return json(res, cfg);
      }
      if (req.method === 'POST') {
        const raw = await readBody(req);
        let data = null;
        try { data = JSON.parse(raw.toString('utf8')); } catch (e) { return json(res, { ok: false, error: 'invalid json' }, 400); }
        if (!data || typeof data !== 'object') return json(res, { ok: false, error: 'bad payload' }, 400);
        const tmp = CONFIG_FILE + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tmp, CONFIG_FILE);
        return json(res, { ok: true });
      }
      return send(res, 405, 'method not allowed');
    }

    if (p === '/api/upload' || p === '/api/upload/') {
      if (req.method !== 'POST') return send(res, 405, 'method not allowed');
      const raw = await readBody(req);
      let data = null;
      try { data = JSON.parse(raw.toString('utf8')); } catch (e) { return json(res, { ok: false, error: 'invalid json' }, 400); }
      let name = String(data.name || '').trim();
      let b64 = String(data.data || '');
      // لو وصلت dataURL كاملة نشيل الجزء اللي قبل الفاصلة
      const comma = b64.indexOf(',');
      if (comma > -1 && /^data:/i.test(b64)) b64 = b64.slice(comma + 1);
      b64 = b64.replace(/\s+/g, '');
      if (!b64) return json(res, { ok: false, error: 'empty file' }, 400);
      // امتداد آمن من الاسم الأصلي
      const ext = (path.extname(name).toLowerCase() || '.png');
      if (!ALLOWED_EXT.includes(ext)) return json(res, { ok: false, error: 'extension not allowed' }, 400);
      let buf;
      try { buf = Buffer.from(b64, 'base64'); } catch (e) { return json(res, { ok: false, error: 'bad base64' }, 400); }
      if (!buf.length || buf.length > MAX_BODY) return json(res, { ok: false, error: 'empty or too large' }, 400);
      // فحص سحري بسيط للصور
      const head = buf.slice(0, 16).toString('latin1');
      const lowerName = String(name).toLowerCase();
      const isImg =
        buf.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47])) ||   // PNG
        (buf[0] === 0xFF && buf[1] === 0xD8) ||                            // JPEG
        head.indexOf('GIF8') === 0 ||                                      // GIF
        head.indexOf('RIFF') === 0 || head.indexOf('WEBP') > -1 ||         // WebP
        (lowerName.endsWith('.svg') && (head.indexOf('<svg') > -1 || head.indexOf('<?xml') === 0 || head.indexOf('<') === 0));
      if (!isImg) return json(res, { ok: false, error: 'not an image' }, 400);
      const fname = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
      const full = path.join(UPLOAD_DIR, fname);
      fs.writeFileSync(full, buf);
      return json(res, { ok: true, url: '/uploads/' + fname });
    }

    /* ---------- ملفات ثابتة ---------- */
    if (p === '/' || p === '') p = '/index.html';
    const fp = path.normalize(path.join(ROOT, p));
    if (!fp.startsWith(ROOT)) return send(res, 403, 'forbidden', 'text/plain');
    if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) return send(res, 404, 'not found', 'text/plain');
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=60',
    });
    fs.createReadStream(fp).pipe(res);
  } catch (e) {
    try { send(res, 500, 'server error: ' + e.message, 'text/plain'); } catch (_) {}
  }
});

server.listen(PORT, HOST, () => {
  console.log('ZH site server running at http://' + HOST + ':' + PORT);
  console.log('ROOT:', ROOT);
});
