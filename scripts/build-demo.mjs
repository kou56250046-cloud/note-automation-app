#!/usr/bin/env node
/**
 * build-demo.mjs — before/after のライブデモを GitHub Pages 用に組み立てる
 *
 * 記事は note にコピーして貼る。画像を手で貼る作業を発生させないために、
 * before/after は **動くページ**として Pages に置き、記事からリンクする。
 *
 * なぜ build-preview.mjs に統合しないか:
 *   あちらは「投稿済みを自動除外」する。デモは投稿したあとにこそ読者が踏むので、
 *   除外ロジックを共有できない。
 *   また preview/public/ は有料部分の暗号化を伴うためローカル実行が必須だが、
 *   デモは暗号化しないので Actions でもローカルでも動く。
 *
 * 入力:
 *   notes/{slug}/demo/before.html
 *   notes/{slug}/demo/after.html
 *   notes/{slug}/meta.json         （title と demo URL。無くても動く）
 *
 * 出力:
 *   demo/index.html          一覧
 *   demo/{slug}/index.html   比較ビュー
 *   demo/{slug}/before.html  そのままコピー
 *   demo/{slug}/after.html   そのままコピー
 *
 * 依存なし（Node 標準モジュールのみ）。
 *
 * 使い方:
 *     node scripts/build-demo.mjs
 *     node scripts/build-demo.mjs --slug 2026-08-10-admin-ui-spacing
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NOTES = join(ROOT, 'notes');
const OUT = join(ROOT, 'demo');

const args = process.argv.slice(2);
const slugIdx = args.indexOf('--slug');
const ONLY = slugIdx >= 0 ? args[slugIdx + 1] : null;

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// --------------------------------------------------------------------------
// 収集
// --------------------------------------------------------------------------

function collect() {
  if (!existsSync(NOTES)) return [];

  const out = [];
  for (const slug of readdirSync(NOTES)) {
    if (ONLY && slug !== ONLY) continue;

    const dir = join(NOTES, slug, 'demo');
    const before = join(dir, 'before.html');
    const after = join(dir, 'after.html');
    if (!existsSync(before) || !existsSync(after)) continue;

    let meta = {};
    const metaPath = join(NOTES, slug, 'meta.json');
    if (existsSync(metaPath)) {
      try {
        meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
      } catch {
        // meta.json が壊れていてもデモは出す。タイトルが slug になるだけ
      }
    }

    out.push({
      slug,
      title: meta.title || slug,
      category: meta.category || '',
      publishDate: meta.publishDate || '',
      beforeHtml: readFileSync(before, 'utf-8'),
      afterHtml: readFileSync(after, 'utf-8'),
    });
  }

  out.sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''));
  return out;
}

// --------------------------------------------------------------------------
// 共通のスタイル
//
// デザインを見せるアカウントのデモページなので、枠のほうがダサいと本末転倒になる。
// 中身（iframe）を主役にして、枠は限界まで引く。
// --------------------------------------------------------------------------

const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --bg:#fbfbfa; --fg:#1a1a18; --muted:#6b6b66; --line:#e4e4e0;
  --card:#fff; --accent:#2f6f4e; --shadow:0 1px 2px rgba(0,0,0,.05),0 8px 24px rgba(0,0,0,.06);
}
@media (prefers-color-scheme:dark){
  :root{
    --bg:#131314; --fg:#e9e9e6; --muted:#9a9a94; --line:#2c2c2e;
    --card:#1b1b1d; --accent:#7fc7a0; --shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35);
  }
}
:root[data-theme="dark"]{
  --bg:#131314; --fg:#e9e9e6; --muted:#9a9a94; --line:#2c2c2e;
  --card:#1b1b1d; --accent:#7fc7a0; --shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35);
}
:root[data-theme="light"]{
  --bg:#fbfbfa; --fg:#1a1a18; --muted:#6b6b66; --line:#e4e4e0;
  --card:#fff; --accent:#2f6f4e; --shadow:0 1px 2px rgba(0,0,0,.05),0 8px 24px rgba(0,0,0,.06);
}
html,body{margin:0;padding:0}
body{
  background:var(--bg); color:var(--fg);
  font-family:-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Noto Sans JP",
              "Yu Gothic",Meiryo,sans-serif;
  line-height:1.75; -webkit-font-smoothing:antialiased;
}
a{color:var(--accent)}
`;

// --------------------------------------------------------------------------
// 比較ビュー
// --------------------------------------------------------------------------

function buildCompare(item) {
  return `<!doctype html>
<html lang="ja" data-theme="">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
<title>${esc(item.title)} — before / after</title>
<style>
${BASE_CSS}
.wrap{max-width:1400px;margin:0 auto;padding:20px 20px 56px}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline;
  justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--line)}
h1{font-size:17px;font-weight:600;margin:0;letter-spacing:.01em}
.cat{font-size:12px;color:var(--muted);margin-top:2px}
.tabs{display:flex;gap:4px;padding:4px;background:var(--card);
  border:1px solid var(--line);border-radius:10px}
.tabs button{
  appearance:none;border:0;background:transparent;color:var(--muted);
  font:inherit;font-size:13px;padding:6px 14px;border-radius:7px;cursor:pointer;
  transition:background .15s,color .15s;
}
.tabs button[aria-selected="true"]{background:var(--accent);color:#fff}
@media (prefers-color-scheme:dark){.tabs button[aria-selected="true"]{color:#101010}}
.grid{display:grid;gap:16px;margin-top:20px;grid-template-columns:1fr 1fr}
.grid[data-view="before"],.grid[data-view="after"]{grid-template-columns:1fr}
.grid[data-view="before"] .pane[data-side="after"]{display:none}
.grid[data-view="after"] .pane[data-side="before"]{display:none}
@media (max-width:860px){.grid{grid-template-columns:1fr}}
.pane{background:var(--card);border:1px solid var(--line);border-radius:12px;
  overflow:hidden;box-shadow:var(--shadow)}
.pane h2{
  margin:0;font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;
  color:var(--muted);padding:11px 14px;border-bottom:1px solid var(--line);
  display:flex;justify-content:space-between;align-items:center;
}
.pane[data-side="after"] h2{color:var(--accent)}
iframe{display:block;width:100%;height:min(74vh,760px);border:0;background:#fff}
.note{margin-top:22px;font-size:12.5px;color:var(--muted)}
.note code{background:var(--card);border:1px solid var(--line);
  padding:1px 6px;border-radius:4px;font-size:12px}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>${esc(item.title)}</h1>
      ${item.category ? `<div class="cat">${esc(item.category)}</div>` : ''}
    </div>
    <div class="tabs" role="tablist">
      <button role="tab" data-view="split" aria-selected="true">並べて</button>
      <button role="tab" data-view="before" aria-selected="false">Before</button>
      <button role="tab" data-view="after" aria-selected="false">After</button>
    </div>
  </header>

  <div class="grid" data-view="split">
    <section class="pane" data-side="before">
      <h2>Before</h2>
      <iframe src="./before.html" title="before" loading="lazy"></iframe>
    </section>
    <section class="pane" data-side="after">
      <h2>After</h2>
      <iframe src="./after.html" title="after" loading="lazy"></iframe>
    </section>
  </div>

  <p class="note">
    このページは記事の補助です。実際の変更点とコードは note の記事に載せています。<br>
    単体で開くなら <code>./before.html</code> / <code>./after.html</code>。
  </p>
</div>

<script>
const grid = document.querySelector('.grid');
document.querySelectorAll('.tabs button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button')
      .forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    grid.dataset.view = b.dataset.view;
  });
});
</script>
</body>
</html>`;
}

// --------------------------------------------------------------------------
// 一覧
// --------------------------------------------------------------------------

function buildIndex(items) {
  const cards = items.map((it) => `
    <li>
      <a href="./${esc(it.slug)}/">
        <span class="t">${esc(it.title)}</span>
        <span class="m">${esc(it.publishDate)}${it.category ? ' · ' + esc(it.category) : ''}</span>
      </a>
    </li>`).join('');

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
<title>before / after デモ</title>
<style>
${BASE_CSS}
.wrap{max-width:760px;margin:0 auto;padding:56px 20px}
h1{font-size:20px;font-weight:600;margin:0 0 6px}
.sub{color:var(--muted);font-size:13px;margin:0 0 28px}
ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
a{display:block;text-decoration:none;color:inherit;background:var(--card);
  border:1px solid var(--line);border-radius:11px;padding:15px 17px;
  transition:border-color .15s,transform .15s}
a:hover{border-color:var(--accent);transform:translateY(-1px)}
.t{display:block;font-size:15px;font-weight:600;line-height:1.5}
.m{display:block;font-size:12px;color:var(--muted);margin-top:5px}
.empty{color:var(--muted);font-size:14px}
</style>
</head>
<body>
<div class="wrap">
  <h1>before / after デモ</h1>
  <p class="sub">記事で扱った画面を、実際に動く形で置いています。</p>
  ${items.length ? `<ul>${cards}</ul>`
    : '<p class="empty">まだデモがありません。<br>'
      + '<code>notes/{slug}/demo/before.html</code> と <code>after.html</code> を置いて'
      + 'ビルドしてください。</p>'}
</div>
</body>
</html>`;
}

// --------------------------------------------------------------------------
// 実行
// --------------------------------------------------------------------------

const items = collect();

// --slug 指定時は他を消さない。全体ビルドのときだけ作り直す
if (!ONLY && existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const it of items) {
  const dir = join(OUT, it.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'before.html'), it.beforeHtml, 'utf-8');
  writeFileSync(join(dir, 'after.html'), it.afterHtml, 'utf-8');
  writeFileSync(join(dir, 'index.html'), buildCompare(it), 'utf-8');
}

// --slug 指定でも一覧は作り直す（既存の出力を読み直す）
const all = ONLY
  ? readdirSync(OUT)
      .filter((d) => existsSync(join(OUT, d, 'index.html')))
      .map((slug) => {
        const found = items.find((i) => i.slug === slug);
        if (found) return found;
        let meta = {};
        const p = join(NOTES, slug, 'meta.json');
        if (existsSync(p)) {
          try { meta = JSON.parse(readFileSync(p, 'utf-8')); } catch { /* 壊れていても一覧には出す */ }
        }
        return {
          slug,
          title: meta.title || slug,
          category: meta.category || '',
          publishDate: meta.publishDate || '',
        };
      })
      .sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''))
  : items;

writeFileSync(join(OUT, 'index.html'), buildIndex(all), 'utf-8');

console.log(`[demo] ${items.length} 件を demo/ に出力しました`);
for (const it of items) console.log(`       demo/${it.slug}/`);
if (!items.length) {
  console.log('       notes/{slug}/demo/before.html と after.html を置いてください');
}
