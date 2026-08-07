/* note-factory の Service Worker。
 *
 * ダッシュボード（/）と投稿キュー（/posts/）の2つを1つで受け持つ。
 * このファイルは配信ルート（/note-automation-app/）に置かれるため、
 * scope はそのまま両方を含む。posts 側から '../sw.js' を登録しても
 * scope はスクリプトの置き場所と一致するので Service-Worker-Allowed は要らない。
 *
 * 戦略は2つだけ。
 *
 *   HTML          network-first  … 記事も数値も push のたびに変わる。
 *                                  必ず取りに行き、落ちたらキャッシュで開く
 *   アイコン等     cache-first    … 変わらない。毎回取りに行く意味がない
 *
 * **キャッシュに入るのは暗号化済みのものだけである。**
 * ダッシュボードの ENC も有料部分の data-enc も AES-GCM-256 の暗号文で、
 * 合言葉なしでは読めない。端末に残っても平文は増えない。
 *
 * VERSION は deploy-pages がコミット SHA に置換する。
 * 置換されなかったときも動くよう、既定値を入れてある。
 */

const VERSION = '__BUILD__';
const CACHE = `note-factory-${VERSION}`;

/* 起動時に必ず要るものだけ先に取る。
 * 記事の個別ページは数が増えるので、開いたものから順に貯める。 */
const PRECACHE = [
  './',
  './posts/',
  './manifest.webmanifest',
  './posts/manifest.webmanifest',
  './assets/icons/dash-192.png',
  './assets/icons/dash-512.png',
  './assets/icons/posts-192.png',
  './assets/icons/posts-512.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 1つ落ちても install を失敗させない。
    // addAll は1つでも 404 だと全部巻き戻るため、個別に入れる。
    await Promise.all(PRECACHE.map((u) =>
      cache.add(new Request(u, { cache: 'reload' })).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('note-factory-') && k !== CACHE)
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* 更新をすぐ当てたいときにページから叩く */
self.addEventListener('message', (ev) => {
  if (ev.data === 'skip-waiting') self.skipWaiting();
});

const isHtml = (req) =>
  req.mode === 'navigate' ||
  (req.headers.get('accept') || '').includes('text/html');

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isHtml(req)) {
    ev.respondWith((async () => {
      try {
        const res = await fetch(req);
        // opaque やエラーは貯めない
        if (res && res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch (_) {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        // 記事ページを未取得のままオフラインになった場合は一覧に逃がす
        const idx = await caches.match('./posts/') || await caches.match('./');
        if (idx) return idx;
        return new Response(
          '<meta charset="utf-8"><p style="font:15px system-ui;padding:24px">'
          + 'オフラインです。一度オンラインで開いたページだけが読めます。</p>',
          { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  ev.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (_) {
      return new Response('', { status: 504 });
    }
  })());
});
