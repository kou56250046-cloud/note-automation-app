#!/usr/bin/env node
/**
 * serve.mjs — preview/ とダッシュボードを localhost:5173 で配信する
 *
 * なぜ file:// で開かないか:
 *   navigator.clipboard.write()（書式つきコピー）はセキュアコンテキストを
 *   要求する。HTML をダブルクリックで開くと使えない。
 *   http://localhost はセキュアコンテキストとして扱われる。
 *
 * なぜ 127.0.0.1 にバインドするか:
 *   preview/ には有料noteの本文が含まれる。0.0.0.0 で待ち受けると
 *   同一ネットワークの他端末から読めてしまう。
 *
 * 依存なし（Node 標準モジュールのみ）。
 *
 * 使い方:
 *     node scripts/serve.mjs
 *     node scripts/serve.mjs --port 5174 --no-open
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PREVIEW = join(ROOT, 'preview');

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const PORT = portIdx >= 0 ? Number(args[portIdx + 1]) : 5173;
const OPEN = !args.includes('--no-open');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

/**
 * パストラバーサル対策。
 * 許可したディレクトリの外に出るリクエストは弾く。
 */
function resolveSafe(baseDir, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const rel = normalize(decoded).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const full = join(baseDir, rel);
  if (!full.startsWith(baseDir)) return null;
  return full;
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, {
    'Content-Type': type,
    // preview には有料本文が含まれる。キャッシュも中継も許可しない
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  res.end(body);
}

function sendFile(res, path) {
  if (!existsSync(path) || !statSync(path).isFile()) return false;
  const type = MIME[extname(path).toLowerCase()] ?? 'application/octet-stream';
  send(res, 200, readFileSync(path), type);
  return true;
}

const NOT_BUILT = `<!doctype html><meta charset="utf-8">
<title>preview がありません</title>
<body style="font-family:sans-serif;max-width:640px;margin:80px auto;line-height:1.9;padding:0 20px">
<h1 style="font-size:20px">preview/ がまだ生成されていません</h1>
<p>先にプレビューをビルドしてください。</p>
<pre style="background:#f5f5f3;padding:14px 16px;border-radius:6px">node scripts/build-preview.mjs</pre>
<p><code>/note-preview</code> はこの2つをまとめて実行します。</p>
</body>`;

const server = createServer((req, res) => {
  const url = req.url ?? '/';

  // ダッシュボード
  if (url === '/dashboard' || url === '/dashboard/') {
    const dash = join(ROOT, 'note-factory-dashboard.html');
    if (sendFile(res, dash)) return;
    return send(res, 404, 'note-factory-dashboard.html が見つかりません');
  }

  // ダッシュボードが読む暗号化済みデータ
  if (url.startsWith('/data/')) {
    const p = resolveSafe(join(ROOT, 'data'), url.slice('/data'.length));
    if (p && sendFile(res, p)) return;
    return send(res, 404, 'not found');
  }

  // before/after のライブデモ。
  // 記事から読者がリンクを踏む先で、preview とは別系統である。
  if (url === '/demo' || url.startsWith('/demo/')) {
    const rest = url.slice('/demo'.length) || '/';
    const p = resolveSafe(join(ROOT, 'demo'), rest === '/' ? '/index.html' : rest);
    if (p) {
      if (sendFile(res, p)) return;
      // ディレクトリを指されたら index.html を返す
      if (sendFile(res, join(p, 'index.html'))) return;
    }
    return send(res, 404, 'demo がありません（node scripts/build-demo.mjs）');
  }

  // preview
  const path = url === '/' || url === ''
    ? join(PREVIEW, 'index.html')
    : resolveSafe(PREVIEW, url);

  if (!existsSync(PREVIEW)) {
    return send(res, 200, NOT_BUILT, 'text/html; charset=utf-8');
  }
  if (path && sendFile(res, path)) return;

  send(res, 404, 'not found');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[serve] ポート ${PORT} は使用中です。--port で変更してください`);
    process.exit(1);
  }
  throw e;
});

// 127.0.0.1 に固定する。0.0.0.0 だと有料本文が同一ネットワークに露出する
server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`[serve] ${url}`);
  console.log(`[serve] ダッシュボード: ${url}dashboard`);
  console.log('[serve] Ctrl+C で終了');

  if (OPEN) {
    const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin' ? ['open', [url]]
        : ['xdg-open', [url]];
    try {
      spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref();
    } catch {
      // ブラウザを開けなくても配信は続ける
    }
  }
});
