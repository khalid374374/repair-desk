/* "الكاشير كله على الفون" (خالد 2026-11-14، memory owner-full-app): البيانات الكاملة من الكاشير، متشفّرة من الأول للآخر.
   - المفتاح جه جوه الـ QR (RDO2:<كود>.<مفتاح>) ومحفوظ على الموبايل بس. السيرفر بيبعت أجزاء متشفّرة (bundle-get) مايقدرش يقراها.
   - كل جزء: base64( iv 12 | متشفّر AES-256-GCM | tag ) لـ JSON مضغوط gzip. kid = أول 8 من sha256(المفتاح): لو مختلف = الكاشير غيّر المفتاح → اربط تاني.
   - الأجزاء بتتخزن على الموبايل (IndexedDB) فالتطبيق بيفتح بآخر نسخة من غير نت، وبنطلب الأحدث بس (have = آخر نسخة عندنا). */
(function () {
  const KK = 'rdo_fkey', KV = 'rdo_fver';
  const DBN = () => { try { return localStorage.getItem('rdo_fdb') || 'rdo-full'; } catch (e) { return 'rdo-full'; } };   // الفروع (branches.js): قاعدة لكل فرع
  const ls = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} } };
  let parts = {}, state = '', busy = false, again = false, ck = null;   // state: '' شغال / nokey اتربط من غير QR / rekey المفتاح اتغيّر
  const raw = () => { const s = ls.get(KK); if (!s) return null; try { return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0)); } catch (e) { return null; } };
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  async function cryptoKey() { if (ck) return ck; const r = raw(); if (!r || r.length !== 32) return null; ck = await crypto.subtle.importKey('raw', r, 'AES-GCM', false, ['decrypt']); return ck; }
  async function kid() { const r = raw(); return r ? hex(await crypto.subtle.digest('SHA-256', r)).slice(0, 8) : ''; }
  async function open(blob) {
    const b = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, await cryptoKey(), b.slice(12));
    // الآيفونات القديمة (Safari أقل من 16.4) مافيهاش DecompressionStream: fflate (vendor/fflate.min.js)
    const txt = typeof DecompressionStream === 'function' ? await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text() : new TextDecoder().decode(window.fflate.gunzipSync(new Uint8Array(plain)));
    return JSON.parse(txt);
  }
  /* ---------- التخزين على الموبايل (IndexedDB) ---------- */
  const db = () => new Promise((res, rej) => { const r = indexedDB.open(DBN(), 1); r.onupgradeneeded = () => r.result.createObjectStore('parts'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function idb(mode, fn) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('parts', mode), st = tx.objectStore('parts'); const out = fn(st); tx.oncomplete = () => { res(out && out.result); d.close(); }; tx.onerror = () => { rej(tx.error); d.close(); }; }); }
  const vers = () => { try { return JSON.parse(ls.get(KV) || '{}'); } catch (e) { return {}; } };
  async function init() {
    if (!ls.get(KK)) { state = 'nokey'; return; }
    try {
      const d = await db(); const all = await new Promise(res => { const out = {}, tx = d.transaction('parts', 'readonly'), c = tx.objectStore('parts').openCursor(); c.onsuccess = () => { const x = c.result; if (x) { out[x.key] = x.value; x.continue(); } else res(out); }; c.onerror = () => res(out); });
      d.close(); parts = all;
      if (Object.keys(parts).length && window.Owner && Owner.setFull) Owner.setFull(parts, state);
    } catch (e) { /* أول مرة */ }
  }
  // بعد كل ملخص: الأجزاء اللي اتغيّرت بس
  async function sync(gw, mtoken) {
    if (!ls.get(KK)) { state = 'nokey'; if (window.Owner && Owner.setFull) Owner.setFull(null, state); return; }
    if (busy) { again = true; return; } busy = true; again = false;
    try {
      const have = vers(), my = await kid();
      const r = await gw({ action: 'bundle-get', mtoken, have });
      if (!r || !r.ok || !Array.isArray(r.parts)) return;
      let changed = false, more = false;
      for (const p of r.parts) {
        if (p.more) { more = true; continue; }
        if (p.kid !== my) { state = 'rekey'; continue; }   // الكاشير غيّر المفتاح (ويندوز جديد مثلًا): مانعرضش أرقام مش متأكدين منها
        try { const obj = await open(p.blob); parts[p.part] = obj; have[p.part] = p.ver; changed = true; await idb('readwrite', st => st.put(obj, p.part)); } catch (e) { state = 'rekey'; }
      }
      if (changed) { ls.set(KV, JSON.stringify(have)); if (state === 'rekey' && r.parts.every(p => p.more || p.kid === my)) state = ''; }
      if (changed || state) { if (window.Owner && Owner.setFull) Owner.setFull(parts, state); }
      if (more) again = true;
    } catch (e) { /* مفيش نت: بنفضل على اللي عندنا */ } finally { busy = false; if (again) setTimeout(() => sync(gw, mtoken), 400); }
  }
  function setKey(k) { ck = null; ls.set(KK, k || ''); ls.set(KV, ''); parts = {}; state = k ? '' : 'nokey'; try { indexedDB.deleteDatabase(DBN()); } catch (e) {} }
  const forget = () => setKey('');
  window.OwnerFull = { init, sync, setKey, forget, parts: () => parts, state: () => state, _open: open };
  init();
})();
