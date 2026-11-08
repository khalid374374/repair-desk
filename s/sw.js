/* متجر المحل: الصفحة تفتح بسرعة ومن غير نت (ملفات الصفحة + آخر كتالوج + الصور اللي اتشافت).
   الطلبات والتتبّع (gateway) مابتتخزنش أبدًا. غيّر V مع كل تعديل في ملفات الصفحة. */
var V = 'rds-2', SHELL = ['./', './index.html', './store.css', './store.js'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V && k.indexOf('rds-') === 0; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.indexOf('/functions/') >= 0) return;
  // الصور: من التخزين الأول (بتتغيّر باسم جديد)
  if (u.pathname.indexOf('/storage/v1/object/public/store/') >= 0 && /\/i\//.test(u.pathname)) {
    e.respondWith(caches.open(V + '-img').then(function (c) { return c.match(e.request).then(function (hit) { return hit || fetch(e.request).then(function (r) { if (r.ok) c.put(e.request, r.clone()); return r; }); }); }));
    return;
  }
  // ملفات الصفحة: من النت الأول وبعدين المتخزن (علشان التحديثات توصل)
  if (u.origin === self.location.origin) e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(V).then(function (c) { c.put(e.request, cp); }); return r; }).catch(function () { return caches.match(e.request, { ignoreSearch: true }).then(function (h) { return h || caches.match('./index.html'); }); }));
});
