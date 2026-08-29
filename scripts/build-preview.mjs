#!/usr/bin/env node
/**
 * build-preview.mjs — 記事を note 互換 HTML にして preview/ に出力する
 *
 * note のエディタは text/html を読む。クリップボードに text/html を書き込めば
 * 見出し・太字・リスト・引用・区切り線がそのまま入る。
 *
 * ブラウザ自動操作を廃止した理由:
 *   - note のエディタは重く、スクリーンショットが画像トークンを食う（1本20〜40k）
 *   - HTML からコピペするほうが速く、安く、落ちない
 *
 * 依存なし（Node 標準モジュールのみ）。npm install が要らない。
 *
 * 使い方:
 *     node scripts/build-preview.mjs
 *     node scripts/build-preview.mjs --no-lint
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { encrypt, loadPassphrase, PASSPHRASE_HELP, ITERATIONS } from './crypto-util.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NOTES = join(ROOT, 'notes');

const args = process.argv.slice(2);
const RUN_LINT = !args.includes('--no-lint');

/**
 * --public: GitHub Pages 配信用。
 *   - 有料部分（03-draft.md）を AES-GCM-256 で暗号化して埋め込む
 *   - 投稿済みの記事を除外する
 *   - noindex を付ける（note の記事より先にインデックスされると重複扱いになる）
 */
const PUBLIC = args.includes('--public');
const OUT = PUBLIC ? join(ROOT, 'preview', 'public') : join(ROOT, 'preview');

// ---------------------------------------------------------------------------
// Markdown → HTML
// ---------------------------------------------------------------------------

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * URL が安全なスキームかを判定する。
 *
 * 本文全体は esc() 済みなので <script> は生成されないが、
 * リンクの href だけは任意の文字列が入る。javascript: が書かれると
 * 復号後に innerHTML へ流し込む公開版で XSS になるため、ここで弾く。
 */
function safeHref(url) {
  const u = url.trim();
  return /^(https?:\/\/|#|\/|mailto:)/i.test(u) ? u : '#';
}

/** インライン記法。note が解釈できるものだけに絞る。 */
function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, url) => `<a href="${safeHref(url)}">${label}</a>`);
  return s;
}

/**
 * note が解釈できる HTML だけを吐く。
 * テーブルはあえて実装しない。note が非対応で、lint.py がエラーにするため。
 */
function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let para = [];
  let listStack = [];    // ['ul'] または ['ul','ul'] のように深さを保持する
  let inFence = false;
  let fence = [];
  let quote = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join('<br>')}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    while (listStack.length) out.push(`</${listStack.pop()}>`);
  };
  const flushQuote = () => {
    if (quote.length) {
      out.push(`<blockquote>${quote.map((q) => `<p>${inline(q)}</p>`).join('')}</blockquote>`);
      quote = [];
    }
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');

    // コードブロック
    if (line.trimStart().startsWith('```')) {
      if (inFence) {
        out.push(`<pre><code>${esc(fence.join('\n'))}</code></pre>`);
        fence = [];
        inFence = false;
      } else {
        flushAll();
        inFence = true;
      }
      continue;
    }
    if (inFence) { fence.push(raw); continue; }

    // 空行
    if (!line.trim()) { flushAll(); continue; }

    // 見出し
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushAll();
      // note のタイトルが H1 相当。本文の H1 は H2 に落とす
      const level = Math.max(2, h[1].length);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    // 水平線（note では区切り線になる）
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushAll();
      out.push('<hr>');
      continue;
    }

    // 引用
    if (line.startsWith('>')) {
      flushPara(); flushList();
      quote.push(line.replace(/^>\s?/, ''));
      continue;
    }
    flushQuote();

    // リスト（note は2階層まで。3階層以上は lint.py がエラーにする）
    const ul = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const ol = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (ul || ol) {
      const m = ul || ol;
      const want = ul ? 'ul' : 'ol';
      const indent = m[1].replace(/\t/g, '    ').length;
      const depth = indent >= 2 ? 1 : 0;
      flushPara();

      // 深すぎるぶんを閉じる
      while (listStack.length > depth + 1) out.push(`</${listStack.pop()}>`);
      // 同じ深さで種類が変わったら開き直す
      if (listStack.length === depth + 1 && listStack[depth] !== want) {
        out.push(`</${listStack.pop()}>`);
      }
      // 足りないぶんを開く
      while (listStack.length < depth + 1) {
        out.push(`<${want}>`);
        listStack.push(want);
      }

      out.push(`<li>${inline(m[2])}</li>`);
      continue;
    }
    flushList();

    para.push(line);
  }

  flushAll();
  if (inFence && fence.length) out.push(`<pre><code>${esc(fence.join('\n'))}</code></pre>`);

  return out.join('\n');
}

/** コピー用のプレーンテキスト。note が text/html を読めなかったときの保険。 */
function mdToPlain(md) {
  return md
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, ''))
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .trim();
}

// ---------------------------------------------------------------------------
// 記事の収集
// ---------------------------------------------------------------------------

function readIfExists(p) {
  return existsSync(p) ? readFileSync(p, 'utf-8') : null;
}

function collectNotes() {
  if (!existsSync(NOTES)) return [];
  const items = [];

  for (const slug of readdirSync(NOTES)) {
    const dir = join(NOTES, slug);
    const metaRaw = readIfExists(join(dir, 'meta.json'));
    if (!metaRaw) continue;

    let meta;
    try {
      meta = JSON.parse(metaRaw);
    } catch {
      console.warn(`[preview] meta.json が壊れています: ${slug}`);
      continue;
    }

    const isPaid = meta.type === 'paid';

    // 無料記事: 02-final.md > 01-draft.md
    // 有料note: 02-letter.md（無料部分）＋ 03-draft.md（有料部分・追跡対象外）
    const free = isPaid
      ? readIfExists(join(dir, '02-letter.md'))
      : readIfExists(join(dir, '02-final.md')) ?? readIfExists(join(dir, '01-draft.md'));
    const paid = isPaid ? readIfExists(join(dir, '03-draft.md')) : null;

    if (!free) {
      console.warn(`[preview] 本文が見つかりません: ${slug}`);
      continue;
    }

    items.push({
      slug, meta, dir,
      free,
      paid,
      // 有料部分は .gitignore 対象。クラウドで生成した記事には存在しない
      paidMissing: isPaid && !paid,
      posted: isPosted(meta),
      // 見出し画像のプロンプト。人間が Gemini に貼る
      thumbPrompt: readThumbnailPrompt(slug),
    });
  }

  items.sort((a, b) => (a.meta.publishDate ?? '').localeCompare(b.meta.publishDate ?? ''));

  // 公開版では投稿済みを載せない。
  // note の記事と同じ内容が2箇所に存在し続けるのを避ける。
  return PUBLIC ? items.filter((it) => !it.posted) : items;
}

/**
 * 投稿済みかどうか。
 *
 * meta.json の posted フラグが最優先。無い場合は publishDate で判定する。
 * 予定日を過ぎていれば投稿したものとみなす。静的サイトからは
 * サーバーに書き戻せないため、日付を唯一の自動判定材料にしている。
 */
function isPosted(meta) {
  if (meta.posted === true) return true;
  if (!meta.publishDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return meta.publishDate < today;
}

// ---------------------------------------------------------------------------
// lint / dedup の実行（あれば結果を埋める）
// ---------------------------------------------------------------------------

function runPython(script, targets) {
  for (const cmd of ['python', 'python3', 'py']) {
    try {
      const stdout = execFileSync(cmd, [join(ROOT, 'scripts', script), ...targets, '--json'], {
        encoding: 'utf-8',
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return JSON.parse(stdout);
    } catch (e) {
      // 終了コード1（違反あり）でも stdout は取れている
      if (e.stdout) {
        try { return JSON.parse(e.stdout); } catch { /* 次のコマンドを試す */ }
      }
    }
  }
  return null;
}

function gateResults(items) {
  if (!RUN_LINT || !items.length) return {};

  // 有料部分は Actions 上に存在しないため、ローカルでしか検査できない。
  // ここが有料noteの lint を通す唯一の機会になる。
  const files = [];
  for (const it of items) {
    if (it.meta.type === 'paid') {
      if (existsSync(join(it.dir, '02-letter.md'))) files.push(join(it.dir, '02-letter.md'));
      if (it.paid) files.push(join(it.dir, '03-draft.md'));
    } else {
      const f = existsSync(join(it.dir, '02-final.md'))
        ? join(it.dir, '02-final.md') : join(it.dir, '01-draft.md');
      if (existsSync(f)) files.push(f);
    }
  }
  if (!files.length) return {};

  const lint = runPython('lint.py', files) ?? [];
  const dedup = runPython('dedup.py', files) ?? [];

  const bySlug = {};
  for (const it of items) {
    const match = (arr) => arr.filter((r) => (r.file ?? '').replace(/\\/g, '/').includes(`notes/${it.slug}/`));
    bySlug[it.slug] = { lint: match(lint), dedup: match(dedup) };
  }
  return bySlug;
}

// ---------------------------------------------------------------------------
// HTML の組み立て
// ---------------------------------------------------------------------------

const CSS = `
:root{--fg:#1a1a1a;--sub:#666;--line:#e6e6e6;--bg:#fff;--accent:#2b6cb0;--warn:#b7791f;--err:#c53030}
*{box-sizing:border-box}
body{margin:0;background:#f7f7f5;color:var(--fg);
  font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif;
  line-height:1.9;font-size:16px}
.wrap{max-width:720px;margin:0 auto;padding:32px 20px 96px}
a{color:var(--accent)}
header.top{border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:28px}
header.top h1{font-size:20px;margin:0 0 6px}
.muted{color:var(--sub);font-size:13px}
.card{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin-bottom:14px}
.card h2{font-size:16px;margin:0 0 8px;line-height:1.6}
.badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:99px;margin-right:6px;vertical-align:middle}
.badge.free{background:#e6f0ff;color:#2b6cb0}
.badge.paid{background:#fff3e0;color:#b7791f}
.badge.done{background:#e8f5e9;color:#2e7d32}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}
button{font:inherit;font-size:13px;padding:8px 14px;border:1px solid var(--line);
  background:#fff;border-radius:7px;cursor:pointer;transition:.15s}
button:hover{background:#f0f0ee}
button.primary{background:var(--fg);color:#fff;border-color:var(--fg)}
button.primary:hover{opacity:.85}
button.ok{background:#2e7d32;color:#fff;border-color:#2e7d32}
.gate{margin-top:12px;font-size:13px;border-top:1px dashed var(--line);padding-top:10px}
.gate .err{color:var(--err)}
.gate .warn{color:var(--warn)}
.gate ul{margin:4px 0 0;padding-left:18px}
.article{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:28px 32px}
.article h2{font-size:20px;margin:32px 0 12px;padding-bottom:6px;border-bottom:1px solid var(--line)}
.article h3{font-size:17px;margin:26px 0 10px}
.article p{margin:0 0 20px}
.article ul,.article ol{margin:0 0 20px;padding-left:24px}
.article li{margin-bottom:6px}
.article blockquote{margin:0 0 20px;padding:2px 16px;border-left:3px solid var(--line);color:var(--sub)}
.article pre{background:#f5f5f3;border:1px solid var(--line);border-radius:6px;
  padding:14px 16px;overflow-x:auto;font-size:13px;line-height:1.7}
.article code{background:#f0f0ee;padding:1px 5px;border-radius:4px;font-size:13px}
.article pre code{background:none;padding:0}
.article hr{border:0;border-top:1px solid var(--line);margin:32px 0}
.paywall{margin:36px 0;padding:14px 16px;background:#fff8e1;border:1px dashed var(--warn);
  border-radius:8px;color:var(--warn);font-size:13px;text-align:center}
.sticky{position:sticky;top:0;background:#f7f7f5;padding:14px 0;z-index:10;border-bottom:1px solid var(--line);margin-bottom:20px}
.toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);
  background:var(--fg);color:#fff;padding:11px 22px;border-radius:99px;font-size:14px;
  opacity:0;pointer-events:none;transition:.2s}
.toast.show{opacity:1}
.warnbox{background:#fff5f5;border:1px solid #feb2b2;color:var(--err);
  border-radius:8px;padding:12px 14px;font-size:13px;margin-bottom:16px}
/* 読者が踏む before/after を、投稿前にここで確認できるようにする。
   デモページごと埋め込むと iframe が入れ子になってスクロールが三重になるため、
   before.html と after.html を直接並べる */
.demo-embed{margin:0 0 26px;border:1px solid var(--line);border-radius:10px;
  padding:12px 14px 14px;background:#fafafa}
.demo-embed summary{cursor:pointer;font-size:13px;font-weight:600;
  padding:2px 0 10px;user-select:none}
.demo-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:760px){.demo-pair{grid-template-columns:1fr}}
.demo-pane{min-width:0}
.demo-tag{display:block;font-size:10px;font-weight:600;letter-spacing:.09em;
  color:var(--muted);padding:0 0 5px}
.demo-tag.after{color:var(--ok,#2f6f4e)}
/* 縮小して全体を収める。ペインが狭いままだと LP が縦に伸びて
   ファーストビューの形が分からなくなる */
.demo-frame{position:relative;overflow:hidden;height:min(46vh,380px);
  border:1px solid var(--line);border-radius:7px;background:#fff}
.demo-frame iframe{display:block;border:0;width:200%;height:200%;
  transform:scale(.5);transform-origin:0 0}
.demo-embed .muted{font-size:12px;margin-top:10px;word-break:break-all}
/* 見出し画像のプロンプト。人間が Gemini に貼るだけの状態にする */
.thumb-box{margin:0 0 26px;border:1px solid var(--line);border-radius:10px;
  padding:13px 14px 14px;background:#fafafa}
.thumb-head{font-size:13px;font-weight:600;margin-bottom:10px}
/* 閉じたままでもコピーできるよう、ボタンは details の外に置く */
.thumb-box summary{cursor:pointer;font-size:12px;color:var(--muted);
  padding:4px 0 8px;user-select:none}
.thumb-box .row{margin-bottom:8px}
.thumb-prompt{margin:0;padding:13px 15px;background:#fff;border:1px solid var(--line);
  border-radius:7px;font-size:12px;line-height:1.75;max-height:300px;overflow:auto;
  white-space:pre-wrap;word-break:break-word;
  font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
.thumb-box .muted{font-size:12px;margin-top:9px}
.lockbox{margin:36px 0;padding:22px 20px;background:#fffdf5;
  border:1px dashed var(--warn);border-radius:10px;text-align:center}
.lockbox .lead{font-size:14px;color:var(--warn);margin-bottom:14px}
.lockbox input{font:inherit;font-size:15px;padding:11px 14px;width:100%;max-width:320px;
  border:1px solid var(--line);border-radius:7px;margin-bottom:10px;text-align:center}
.lockbox .err{color:var(--err);font-size:13px;min-height:18px;margin-top:8px}
.lockbox .note{font-size:12px;color:var(--sub);margin-top:12px;line-height:1.7}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
`;

const COPY_JS = `
const toast = (msg) => {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800);
};

/**
 * text/html と text/plain を同時に書き込む。
 * note のエディタは text/html を読むので、見出し・太字・リスト・引用・
 * 区切り線がそのまま入る。
 *
 * navigator.clipboard.write() はセキュアコンテキストを要求するため
 * file:// では動かない。必ず localhost 経由で開くこと。
 */
async function copyRich(btn, id) {
  const el = document.getElementById(id);
  const html = el.dataset.html, text = el.dataset.text;
  try {
    if (!navigator.clipboard?.write) throw new Error('clipboard API 無し');
    await navigator.clipboard.write([new ClipboardItem({
      'text/html':  new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    })]);
    toast('コピーしました（書式つき）');
    btn.classList.add('ok');
    setTimeout(() => btn.classList.remove('ok'), 1200);
  } catch (e) {
    try {
      await navigator.clipboard.writeText(text);
      toast('書式なしでコピーしました');
    } catch {
      toast('コピーに失敗しました。localhost で開いていますか？');
    }
  }
}

async function copyText(btn, value) {
  try {
    await navigator.clipboard.writeText(value);
    toast('コピーしました');
    btn.classList.add('ok');
    setTimeout(() => btn.classList.remove('ok'), 1200);
  } catch { toast('コピーに失敗しました'); }
}

const KEY = 'note-factory-posted';
const posted = () => JSON.parse(localStorage.getItem(KEY) || '{}');
function togglePosted(slug, el) {
  const p = posted();
  if (p[slug]) delete p[slug]; else p[slug] = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(p));
  render();
}
function render() {
  const p = posted();
  document.querySelectorAll('[data-slug]').forEach((card) => {
    const done = !!p[card.dataset.slug];
    card.style.opacity = done ? .5 : 1;
    const b = card.querySelector('.done-badge');
    if (b) b.style.display = done ? 'inline-block' : 'none';
    const t = card.querySelector('.toggle');
    if (t) t.textContent = done ? '投稿済みを取り消す' : '投稿済みにする';
  });
}
document.addEventListener('DOMContentLoaded', render);
`;

/**
 * 有料部分の復号。ダッシュボードと完全に同じ形式で読む。
 *   base64( salt[16] || iv[12] || ciphertext+tag )
 */
const DECRYPT_JS = `
const ITER = ${ITERATIONS};
const PASS_KEY = 'nf-pass';
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/**
 * 合言葉は localStorage に保存する。一度入れれば次回以降は自動で開く。
 *
 * 端末に残るため、他人が触れる端末では「合言葉を消す」を押すこと。
 * ボタンを用意していないと、手放すときに消す手段がなくなる。
 */
const savePass = (p) => { try { localStorage.setItem(PASS_KEY, p); } catch {} };
const readPass = () => { try { return localStorage.getItem(PASS_KEY); } catch { return null; } };
function forgetPass() {
  try { localStorage.removeItem(PASS_KEY); } catch {}
  location.reload();
}

async function decryptPayload(pass, enc) {
  const raw = b64(enc), salt = raw.slice(0, 16), iv = raw.slice(16, 28), ct = raw.slice(28);
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  return JSON.parse(new TextDecoder().decode(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)));
}

async function applyPass(pass, quiet) {
  const el = document.getElementById('paid');
  if (!el || !el.dataset.enc) return false;
  const err = document.getElementById('lockerr');
  if (err) err.textContent = quiet ? '' : '復号しています…';
  try {
    const data = await decryptPayload(pass, el.dataset.enc);
    el.dataset.html = data.html;
    el.dataset.text = data.text;
    document.getElementById('paid-body').innerHTML = data.html;
    document.getElementById('paid-lock').style.display = 'none';
    document.getElementById('paid-actions').style.display = '';
    const forget = document.getElementById('forget');
    if (forget) forget.style.display = '';
    savePass(pass);
    if (err) err.textContent = '';
    return true;
  } catch (e) {
    // 保存済みの合言葉で失敗したら、古いものが残っている。消して入力に戻す
    if (quiet) { try { localStorage.removeItem(PASS_KEY); } catch {} }
    if (err) err.textContent = quiet ? '' : '合言葉が違います。';
    return false;
  }
}

async function unlockPaid() {
  const pw = document.getElementById('pw').value;
  if (!pw) { document.getElementById('lockerr').textContent = '合言葉を入力してください。'; return; }
  await applyPass(pw, false);
}

// 一度入れれば次回以降は自動で開く
document.addEventListener('DOMContentLoaded', () => {
  const saved = readPass();
  if (saved) applyPass(saved, true);
  const pw = document.getElementById('pw');
  if (pw) pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') unlockPaid(); });
  // 有料記事が無いページでも、保存済みなら消せるようにしておく
  const forget = document.getElementById('forget');
  if (forget && saved) forget.style.display = '';
});
`;

// PWA。公開版だけに入れる。
//
// ローカル版（preview/）にも入れると、localhost:5173 に Service Worker が
// 居座って古い画面を返すようになる。確認用の画面がキャッシュされると困るので、
// 配信されるほうにだけ付ける。
//
// このファイル群は posts/ 直下に出るため、manifest は同階層、
// アイコンと sw.js は1つ上（配信ルート）を指す。
const PWA_HEAD = `<link rel="manifest" href="./manifest.webmanifest">
<meta name="theme-color" content="#2B6CB0">
<link rel="icon" href="../assets/icons/posts-192.png" type="image/png">
<link rel="apple-touch-icon" href="../assets/icons/posts-apple-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="投稿キュー">
`;

// sw.js は配信ルートに置く。scope はスクリプトの場所と同じ
// /note-automation-app/ になり、ダッシュボードと投稿キューの両方を受け持つ。
// scope がスクリプトの階層より上でなければ Service-Worker-Allowed は要らない。
// isSecureContext は https と localhost / 127.0.0.1 で true、file:// では false。
// 直接ファイルを開いたときに SecurityError を出さないための条件である。
const PWA_JS = `
if('serviceWorker' in navigator && isSecureContext){
  addEventListener('load', function(){ navigator.serviceWorker.register('../sw.js').catch(function(){}); });
}
`;

function page(title, body, extraJs = '') {
  // 公開版は必ず noindex にする。
  // note の記事より先にインデックスされると重複コンテンツ扱いになる。
  const robots = PUBLIC
    ? '<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">\n'
    : '';
  return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${robots}<title>${esc(title)}</title>
${PUBLIC ? PWA_HEAD : ''}<style>${CSS}</style>
<div class="wrap">${body}</div>
<script>${COPY_JS}${PUBLIC ? DECRYPT_JS : ''}${extraJs}${PUBLIC ? PWA_JS : ''}</script>
`;
}

function gateHtml(g) {
  if (!g) return '';
  const errs = (g.lint ?? []).flatMap((r) => r.errors ?? []);
  const warns = (g.lint ?? []).flatMap((r) => r.warnings ?? []);
  const dups = (g.dedup ?? []).flatMap((r) => r.matches ?? []);

  if (!errs.length && !warns.length && !dups.length) {
    return `<div class="gate">ゲート: <span style="color:#2e7d32">問題なし</span></div>`;
  }

  let h = '<div class="gate">';
  if (errs.length) {
    h += `<div class="err">lint エラー ${errs.length} 件</div><ul>` +
      errs.slice(0, 5).map((e) => `<li class="err">L${e.line} ${esc(e.message)}</li>`).join('') + '</ul>';
  }
  if (warns.length) {
    h += `<div class="warn">lint 警告 ${warns.length} 件</div><ul>` +
      warns.slice(0, 3).map((e) => `<li class="warn">L${e.line} ${esc(e.message)}</li>`).join('') + '</ul>';
  }
  if (dups.length) {
    h += `<div class="warn">重複の疑い</div><ul>` +
      dups.map((d) => `<li class="${d.level === 'block' ? 'err' : 'warn'}">${d.similarity.toFixed(2)} — ${esc(d.title)}</li>`).join('') + '</ul>';
  }
  return h + '</div>';
}

/**
 * before/after のデモへのパス。
 *
 * ローカル（serve.mjs）は /demo/ をルート直下で配信し、
 * 公開版（Pages）は /posts/ と /demo/ が並ぶ。基準が違うので切り替える。
 * meta.demo の絶対URLは記事本文に載せる用で、ここでは使わない
 * （デプロイ前でも手元で確認できるようにするため）。
 */
const demoPath = (slug) => (PUBLIC ? `../demo/${slug}/` : `/demo/${slug}/`);

/**
 * デモの実体がどの記事にあるかを meta.demo から求める。
 *
 * 記事の slug とデモの slug は一致しない。日曜の有料noteは、その週の
 * 木曜（画面）で作ったデモを指す。自分の slug で組み立てると
 * /demo/{有料noteのslug}/ を指してしまい 404 になる。
 */
const demoSlugOf = (m) => {
  const hit = String(m?.demo ?? '').match(/\/demo\/([^/?#]+)/);
  return hit ? hit[1] : null;
};

/**
 * デモの実体があるかを確認する。
 *
 * リンク先の demo/{slug}/ は配信時に build-demo.mjs が組み直すので、
 * 元ファイルである notes/{slug}/demo/ でも判定する。
 * 無いのにボタンを出すと、読者にも自分にも 404 を踏ませる。
 */
const demoExists = (slug) =>
  !!slug && (existsSync(join(NOTES, slug, 'demo', 'before.html')) ||
             existsSync(join(ROOT, 'demo', slug, 'index.html')));

/** 記事が指すデモの slug。実体が無ければ null（リンクを出さない）。 */
const resolveDemo = (m) => {
  const slug = demoSlugOf(m);
  if (!slug) return null;
  if (!demoExists(slug)) {
    console.warn(`  ! デモの実体がありません: demo/${slug}/ — リンクを出しません`);
    return null;
  }
  return slug;
};

/**
 * onclick 属性の中に埋め込める JS の文字列リテラルを作る。
 *
 * JSON.stringify の結果は `"..."` の形になる。属性値もダブルクォートで
 * 囲まれているため、そのまま埋めると最初の " で属性が閉じてボタンが動かなくなる。
 * &quot; に逃がすと、ブラウザが属性値を読む段階で " に戻り、JS として正しく解釈される。
 */
const jsStr = (v) => JSON.stringify(v ?? '').replace(/"/g, '&quot;');

/**
 * 06-thumbnail.md から見出し画像のプロンプト本文だけを取り出す。
 *
 * 人間は Gemini に貼るだけでよい状態にしたい。判断の記録（なぜその被写体か）は
 * ファイルに残しつつ、画面にはコピーできる本文だけを出す。
 */
function readThumbnailPrompt(slug) {
  const p = join(ROOT, 'notes', slug, '06-thumbnail.md');
  if (!existsSync(p)) return null;
  // 最初のフェンス付きコードブロックがプロンプト全文
  const m = readFileSync(p, 'utf-8').match(/```[a-z]*\n([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}

/**
 * account.md の「note プロフィール」節から、差し替え用の文案を読む。
 *
 * note のプロフィールは API で書き換えられない。人間が設定画面に1回貼る。
 * ブラウザ自動操作は使わない方針なので、コピーできる形で出すところまでが機械の仕事である。
 */
function readProfileDraft() {
  const p = join(ROOT, 'knowledge', 'account.md');
  if (!existsSync(p)) return null;

  const text = readFileSync(p, 'utf-8');
  // 確定後は「**◯◯**」、検討中は「1. **◯◯**」のどちらの形もありうる
  const name = text.match(/###\s*アカウント名[^\n]*\n+(?:1\.\s*)?\*\*(.+?)\*\*/)?.[1];
  const bioBlock = text.match(/###\s*プロフィール文[^\n]*\n+```\n([\s\S]*?)```/)?.[1];
  if (!name && !bioBlock) return null;

  // 改行はそのまま貼る。note のプロフィール欄は改行を保持するため、
  // account.md に書いた形が実際の見え方になる
  const bio = (bioBlock ?? '').replace(/\s+$/, '');

  // 字数は改行を除いて数える（note の上限は文字数で効く）
  return { name: name ?? '', bio, chars: [...bio.replace(/\n/g, '')].length };
}

function profileCardHtml() {
  // 公開版には出さない。プロフィールの設定は PC でやる作業である
  if (PUBLIC) return '';

  const d = readProfileDraft();
  if (!d) return '';

  return `
<div class="card" style="border-left:3px solid #2f6f4e">
  <h2>note プロフィールを差し替える</h2>
  <div class="muted">
    設定画面に1回貼るだけです。<code>knowledge/account.md</code> の「note プロフィール」節が元になっています。
  </div>

  ${d.name ? `
  <div style="margin-top:14px">
    <div class="muted">アカウント名</div>
    <div style="font-size:15px;font-weight:600;margin:4px 0 6px">${esc(d.name)}</div>
    <button onclick="copyText(this,${jsStr(d.name)})">名前をコピー</button>
  </div>` : ''}

  ${d.bio ? `
  <div style="margin-top:16px">
    <div class="muted">プロフィール文（${d.chars} 字 / 改行は保持されます）</div>
    <div style="margin:4px 0 6px;line-height:1.8;white-space:pre-wrap">${esc(d.bio)}</div>
    <button onclick="copyText(this,${jsStr(d.bio)})">本文をコピー</button>
  </div>` : ''}

  <div class="muted" style="margin-top:14px">
    貼り先: note → 設定 → プロフィール。<strong>旧記事26本は削除しません</strong>（実測値の根拠が消えるため）。
  </div>
</div>`;
}

function buildIndex(items, gates) {
  const cards = items.map((it) => {
    const m = it.meta;
    const dslug = resolveDemo(m);
    const badge = m.type === 'paid'
      ? '<span class="badge paid">有料</span>'
      : '<span class="badge free">無料</span>';
    const chars = (it.free.length + (it.paid?.length ?? 0)).toLocaleString();
    return `
<div class="card" data-slug="${esc(it.slug)}">
  <h2>${badge}<span class="badge done done-badge" style="display:none">投稿済み</span>${esc(m.title ?? it.slug)}</h2>
  <div class="muted">${esc(m.category ?? '')} ／ ${esc(m.publishDate ?? '日付未定')} ／ ${chars} 字</div>
  ${it.paidMissing ? '<div class="muted" style="color:#c53030">※ 有料部分がローカルにありません（03-draft.md は追跡対象外）</div>' : ''}
  ${gateHtml(gates[it.slug])}
  <div class="row">
    <a href="./${esc(it.slug)}.html"><button class="primary">開く</button></a>
    ${dslug ? `<a href="${esc(demoPath(dslug))}" target="_blank" rel="noopener"><button>before / after を見る</button></a>` : ''}
    <button class="toggle" onclick="togglePosted('${esc(it.slug)}', this)">投稿済みにする</button>
  </div>
</div>`;
  }).join('\n');

  const body = `
<header class="top">
  <h1>投稿キュー</h1>
  <div class="muted">${items.length} 本 ／ 生成 ${new Date().toLocaleString('ja-JP')}</div>
  ${PUBLIC ? `<div class="row">
    <button id="forget" style="display:none" onclick="forgetPass()">合言葉を消す</button>
  </div>` : ''}
</header>
${profileCardHtml()}
${items.length ? cards : '<div class="card">記事がありません。<code>お願いします</code> で1本作ってください。</div>'}
<div class="muted" style="margin-top:28px">
  コピーは <code>text/html</code> と <code>text/plain</code> を同時に書き込みます。
  note のエディタは <code>text/html</code> を読むので書式が保持されます。
</div>`;
  return page('投稿キュー — note-factory', body);
}

const attr = (s) => esc(s).replace(/"/g, '&quot;');

function buildArticle(it, gates, passphrase) {
  const m = it.meta;
  const dslug = resolveDemo(m);
  const freeHtml = mdToHtml(it.free);
  const freeText = mdToPlain(it.free);
  const paidHtml = it.paid ? mdToHtml(it.paid) : '';
  const paidText = it.paid ? mdToPlain(it.paid) : '';
  const isPaid = m.type === 'paid';
  const tags = (m.hashtags ?? []).map((t) => '#' + t).join(' ');

  // 公開版では有料部分を暗号化する。平文で置くと商品価値が消える
  const encPaid = (PUBLIC && it.paid)
    ? encrypt(JSON.stringify({ html: paidHtml, text: paidText }), passphrase)
    : null;

  const paidBtn = it.paid
    ? `<span id="paid-actions"${encPaid ? ' style="display:none"' : ''}>` +
      `<button class="primary" onclick="copyRich(this,'paid')">有料部分をコピー</button></span>`
    : '';

  const buttons = isPaid
    ? `<button class="primary" onclick="copyRich(this,'free')">無料部分をコピー</button>${paidBtn}`
    : `<button class="primary" onclick="copyRich(this,'free')">本文をコピー</button>`;

  // 有料部分の格納先。公開版は data-enc（暗号文）、ローカルは data-html/data-text
  const paidHolder = it.paid
    ? (encPaid
      ? `<div id="paid" data-enc="${attr(encPaid)}"></div>`
      : `<div id="paid" data-html="${attr(paidHtml)}" data-text="${attr(paidText)}"></div>`)
    : '';

  // 本文中の有料エリア
  const paidSection = !it.paid ? '' : (encPaid ? `
<div class="lockbox" id="paid-lock">
  <div class="lead">ここから有料エリア（暗号化されています）</div>
  <label class="sr" for="pw">合言葉</label>
  <input type="password" id="pw" placeholder="合言葉" autocomplete="off" spellcheck="false">
  <div><button class="primary" onclick="unlockPaid()">表示する</button></div>
  <div class="err" id="lockerr"></div>
  <div class="note">AES-GCM-256。復号はこのブラウザの中だけで行われます。<br>
    一度入力すれば、次回以降は自動で開きます。<br>
    共用の端末では、読み終えたら「合言葉を消す」を押してください。</div>
</div>
<div id="paid-body"></div>` : `
<div class="paywall">ここから有料エリア</div>
${paidHtml}`);

  const body = `
<div class="sticky">
  <a href="./index.html" class="muted">← 投稿キュー</a>
  <div class="row">
    <button onclick="copyText(this, ${jsStr(m.title)})">タイトルをコピー</button>
    ${buttons}
    ${tags ? `<button onclick="copyText(this, ${jsStr(tags)})">ハッシュタグをコピー</button>` : ''}
    ${dslug ? `<a href="${esc(demoPath(dslug))}" target="_blank" rel="noopener"><button>before / after を開く</button></a>` : ''}
    ${PUBLIC ? '<button id="forget" style="display:none" onclick="forgetPass()">合言葉を消す</button>' : ''}
  </div>
</div>

<header class="top">
  <h1>${esc(m.title ?? it.slug)}</h1>
  <div class="muted">${esc(m.category ?? '')} ／ ${esc(m.publishDate ?? '')} ／ ${esc(tags)}</div>
</header>

${dslug ? `<details class="demo-embed" open>
  <summary>読者が見る before / after</summary>
  <div class="demo-pair">
    <div class="demo-pane">
      <span class="demo-tag">BEFORE</span>
      <div class="demo-frame">
        <iframe src="${esc(demoPath(dslug))}before.html" title="before" loading="lazy"></iframe>
      </div>
    </div>
    <div class="demo-pane">
      <span class="demo-tag after">AFTER</span>
      <div class="demo-frame">
        <iframe src="${esc(demoPath(dslug))}after.html" title="after" loading="lazy"></iframe>
      </div>
    </div>
  </div>
  <div class="muted">
    タブで切り替えられる版は
    <a href="${esc(demoPath(dslug))}" target="_blank" rel="noopener">こちら</a>。
    記事に載せているURL → <code>${esc(m.demo)}</code>
  </div>
</details>` : ''}

${it.thumbPrompt ? `<div class="thumb-box">
  <div class="thumb-head">見出し画像のプロンプト</div>
  <div class="row">
    <button class="primary" onclick="copyText(this, ${jsStr(it.thumbPrompt)})">プロンプトをコピー</button>
    <a href="https://gemini.google.com/" target="_blank" rel="noopener"><button>Gemini を開く</button></a>
  </div>
  <details>
    <summary>全文を見る</summary>
    <pre class="thumb-prompt">${esc(it.thumbPrompt)}</pre>
  </details>
  <div class="muted">
    16:9 で生成し、note の見出し画像に設定します。<strong>画像内に文字は入りません。</strong>
    タイトルは note 側で重なります。
  </div>
</div>` : ''}

${isPaid ? `<div class="warnbox">
  <strong>有料noteの貼り方</strong><br>
  1. 「無料部分をコピー」→ note に貼る<br>
  2. note のエディタで有料エリアの境界線を設定する<br>
  3. 「有料部分をコピー」→ 境界線の下に貼る
</div>` : ''}

${it.paidMissing ? `<div class="warnbox">
  有料部分（<code>03-draft.md</code>）がありません。
  <code>.gitignore</code> 対象のため、クラウドで生成した記事には含まれません。
  有料noteはローカルで生成してください。
</div>` : ''}

${gateHtml(gates[it.slug])}

<div id="free" data-html="${attr(freeHtml)}" data-text="${attr(freeText)}"></div>
${paidHolder}

<div class="article">
${freeHtml}
${paidSection}
</div>`;

  return page(`${m.title ?? it.slug} — note-factory`, body);
}

// ---------------------------------------------------------------------------
// 実行
// ---------------------------------------------------------------------------

function main() {
  const items = collectNotes();
  const passphrase = PUBLIC ? loadPassphrase() : null;

  // 有料部分を平文で公開しない。合言葉が無ければビルドを止める
  if (PUBLIC && items.some((it) => it.paid) && !passphrase) {
    console.error('[preview] 有料部分を含む記事がありますが、合言葉が見つかりません。\n');
    console.error(PASSPHRASE_HELP);
    process.exit(1);
  }

  if (PUBLIC) {
    if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
  } else {
    mkdirSync(OUT, { recursive: true });
    // 直下の .html だけを消す。preview/public/ は残す
    for (const f of readdirSync(OUT)) {
      if (f.endsWith('.html')) rmSync(join(OUT, f), { force: true });
    }
  }

  const gates = gateResults(items);

  writeFileSync(join(OUT, 'index.html'), buildIndex(items, gates), 'utf-8');
  for (const it of items) {
    writeFileSync(join(OUT, `${it.slug}.html`), buildArticle(it, gates, passphrase), 'utf-8');
  }

  const dest = PUBLIC ? 'preview/public/' : 'preview/';
  const encrypted = items.filter((it) => PUBLIC && it.paid).length;

  console.log(`[preview] ${items.length} 本を ${dest} に出力しました`);
  if (PUBLIC) {
    console.log(`[preview] 有料部分 ${encrypted} 本を暗号化しました`);
    console.log('[preview] 投稿済み（publishDate が過去）の記事は除外しています');
  }
  if (!items.length) {
    console.log('[preview] 対象の記事がありません');
  }
  if (!RUN_LINT) console.log('[preview] lint / dedup はスキップしました');
}

main();
