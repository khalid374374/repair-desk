/* service worker لنسخة الويب (mobile/web/build.js بيحط الإصدار والملفات). الصفحة نفسها من النت الأول (علشان التحديث يوصل)، والباقي من الكاش،
   والسيرفر (Supabase) مابيعديش من هنا. وكمان الإشعارات (Web Push): بيعرضها، والدوسة بتفتح التطبيق. */
const V = 'staff-736cbfd596', FILES = ["./","app.css","app.js","att.js","demo.js","icon-192.png","index.html","link.js","manifest.webmanifest","vendor/jsQR.js","version.js","web.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then(x => { const c = x.clone(); caches.open(V).then(k => k.put('./', c)); return x; }).catch(() => caches.match('./'))); return; }
  e.respondWith(caches.match(r).then(m => m || fetch(r)));
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (er) { d = { title: 'Repair Desk', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Repair Desk', { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || undefined, data: { url: './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if ('focus' in c) return c.focus(); } return self.clients.openWindow('./'); }));
});
