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

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NOTES = join(ROOT, 'notes');
const OUT = join(ROOT, 'preview');

const args = process.argv.slice(2);
const RUN_LINT = !args.includes('--no-lint');

// ---------------------------------------------------------------------------
// Markdown → HTML
// ---------------------------------------------------------------------------

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** インライン記法。note が解釈できるものだけに絞る。 */
function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
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
    });
  }

  items.sort((a, b) => (a.meta.publishDate ?? '').localeCompare(b.meta.publishDate ?? ''));
  return items;
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

function page(title, body, extraJs = '') {
  return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>${CSS}</style>
<div class="wrap">${body}</div>
<script>${COPY_JS}${extraJs}</script>
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

function buildIndex(items, gates) {
  const cards = items.map((it) => {
    const m = it.meta;
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
    <button class="toggle" onclick="togglePosted('${esc(it.slug)}', this)">投稿済みにする</button>
  </div>
</div>`;
  }).join('\n');

  const body = `
<header class="top">
  <h1>投稿キュー</h1>
  <div class="muted">${items.length} 本 ／ 生成 ${new Date().toLocaleString('ja-JP')}</div>
</header>
${items.length ? cards : '<div class="card">記事がありません。<code>お願いします</code> で1本作ってください。</div>'}
<div class="muted" style="margin-top:28px">
  コピーは <code>text/html</code> と <code>text/plain</code> を同時に書き込みます。
  note のエディタは <code>text/html</code> を読むので書式が保持されます。
</div>`;
  return page('投稿キュー — note-factory', body);
}

function buildArticle(it, gates) {
  const m = it.meta;
  const freeHtml = mdToHtml(it.free);
  const freeText = mdToPlain(it.free);
  const paidHtml = it.paid ? mdToHtml(it.paid) : '';
  const paidText = it.paid ? mdToPlain(it.paid) : '';
  const isPaid = m.type === 'paid';
  const tags = (m.hashtags ?? []).map((t) => '#' + t).join(' ');

  const buttons = isPaid
    ? `
    <button class="primary" onclick="copyRich(this,'free')">無料部分をコピー</button>
    ${it.paid ? `<button class="primary" onclick="copyRich(this,'paid')">有料部分をコピー</button>` : ''}`
    : `<button class="primary" onclick="copyRich(this,'free')">本文をコピー</button>`;

  const body = `
<div class="sticky">
  <a href="./index.html" class="muted">← 投稿キュー</a>
  <div class="row">
    <button onclick="copyText(this, ${JSON.stringify(m.title ?? '')})">タイトルをコピー</button>
    ${buttons}
    ${tags ? `<button onclick="copyText(this, ${JSON.stringify(tags)})">ハッシュタグをコピー</button>` : ''}
  </div>
</div>

<header class="top">
  <h1>${esc(m.title ?? it.slug)}</h1>
  <div class="muted">${esc(m.category ?? '')} ／ ${esc(m.publishDate ?? '')} ／ ${esc(tags)}</div>
</header>

${isPaid ? `<div class="warnbox">
  <strong>有料noteの貼り方</strong><br>
  1. 「無料部分をコピー」→ note に貼る<br>
  2. note のエディタで有料エリアの境界線を設定する<br>
  3. 「有料部分をコピー」→ 境界線の下に貼る
</div>` : ''}

${it.paidMissing ? `<div class="warnbox">
  有料部分（<code>03-draft.md</code>）がローカルにありません。
  このファイルは <code>.gitignore</code> 対象で、リポジトリが public のため追跡していません。
  有料noteはローカルで生成してください。
</div>` : ''}

${gateHtml(gates[it.slug])}

<div id="free" data-html="${esc(freeHtml).replace(/"/g, '&quot;')}" data-text="${esc(freeText).replace(/"/g, '&quot;')}"></div>
${it.paid ? `<div id="paid" data-html="${esc(paidHtml).replace(/"/g, '&quot;')}" data-text="${esc(paidText).replace(/"/g, '&quot;')}"></div>` : ''}

<div class="article">
${freeHtml}
${it.paid ? `<div class="paywall">ここから有料エリア</div>\n${paidHtml}` : ''}
</div>`;

  return page(`${m.title ?? it.slug} — note-factory`, body);
}

// ---------------------------------------------------------------------------
// 実行
// ---------------------------------------------------------------------------

function main() {
  const items = collectNotes();

  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const gates = gateResults(items);

  writeFileSync(join(OUT, 'index.html'), buildIndex(items, gates), 'utf-8');
  for (const it of items) {
    writeFileSync(join(OUT, `${it.slug}.html`), buildArticle(it, gates), 'utf-8');
  }

  console.log(`[preview] ${items.length} 本を preview/ に出力しました`);
  if (!items.length) {
    console.log('[preview] notes/ に meta.json を持つ記事がありません');
  }
  if (!RUN_LINT) console.log('[preview] lint / dedup はスキップしました');
}

main();
