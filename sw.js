// ══════════════════════════════════════════
// AR操作ナビ Service Worker
// 目的：電波が悪い/混線した会場でも、一度取り込んだ資産で
//       アプリ・.mind・画像・資料をオフライン動作させる
// ══════════════════════════════════════════
const CACHE = 'arnavi-v2';

// インストール時に確実にキャッシュする中核ファイル（存在しないものは無視）
const CORE = [
  './ar-auto-manual.html',
  './aframe.min.js',
  './mindar-image-aframe.prod.js',
  './targets/crossing2.mind',
  './targets/crossing2.jpg',
  './docs/crossing.pdf',
  './docs/crossing.mp4',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  const isApi = url.hostname === 'api.github.com';
  const isScenarioJson = url.pathname.includes('/scenarios/') && url.pathname.endsWith('.json');

  if (isApi || isScenarioJson) {
    // シナリオ一覧・JSON：最新優先。失敗時はキャッシュ（クエリ差は無視して照合）
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
  } else {
    // 静的資産（HTML/JS/.mind/画像/PDF/動画）：キャッシュ優先＋背景更新
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
