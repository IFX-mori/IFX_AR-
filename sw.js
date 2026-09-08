// ══════════════════════════════════════════════════════════════
//  Service Worker（作業記録ナビ ar-worklog-player.html のオフライン化）
//  ・アプリ本体/HTML/JSON … network-first（オンライン時は最新、オフライン時はキャッシュ）
//  ・CDNライブラリ(AR.js/A-Frame/PDF.js) … cache-first（バージョン固定で安定）
//  ・GitHub API … network-first
//  ・その他(資料/画像/AR.jsの付随ファイル) … cache-first
//  ※ iOS制約によりPWA standalone化はしない（Safariで開く）。SWはキャッシュのみ担当。
//  更新時は CACHE の版数を上げるとキャッシュが刷新される。
// ══════════════════════════════════════════════════════════════
const CACHE = 'worklog-cache-v1';
const PRECACHE = [
  './ar-worklog-player.html',
  'https://aframe.io/releases/1.5.0/aframe.min.js',
  'https://cdn.jsdelivr.net/npm/@ar-js-org/ar.js@3.4.5/aframe/build/aframe-ar.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

self.addEventListener('install', e=>{
  e.waitUntil((async()=>{
    const c = await caches.open(CACHE);
    // クロスオリジンCDNは no-cors で取得して opaque でも保存（1件失敗しても続行）
    await Promise.all(PRECACHE.map(async u=>{
      try{
        const cross = u.startsWith('http') && !u.startsWith(self.location.origin);
        const res = await fetch(new Request(u, cross ? {mode:'no-cors'} : {cache:'no-store'}));
        await c.put(u, res.clone());
      }catch(_){}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  let url; try{ url = new URL(req.url); }catch(_){ return; }
  const sameOrigin = url.origin === self.location.origin;
  const isDoc = req.mode==='navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.json');
  if((sameOrigin && isDoc) || url.hostname==='api.github.com'){
    e.respondWith(networkFirst(req));
  } else {
    e.respondWith(cacheFirst(req));
  }
});

async function cacheFirst(req){
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if(hit) return hit;
  try{
    const res = await fetch(req);
    if(res && (res.ok || res.type==='opaque')) cache.put(req, res.clone());
    return res;
  }catch(e){
    const alt = await cache.match(req, {ignoreSearch:true});
    if(alt) return alt;
    throw e;
  }
}
async function networkFirst(req){
  const cache = await caches.open(CACHE);
  try{
    const res = await fetch(req);
    if(res && res.ok) cache.put(req, res.clone());
    return res;
  }catch(e){
    const hit = await cache.match(req) || await cache.match(req, {ignoreSearch:true});
    if(hit) return hit;
    throw e;
  }
}
