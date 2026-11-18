/* نسخة الويب للآيفون (خالد 2026-11-18، بند 3). أول سكريبت في الصفحة (mobile/web/build.js بيحطه):
   - RD_WEB + service worker (الصفحة بتفتح من غير نت، وبتاخد الجديد لوحدها).
   - القفل: بدل بصمة أندرويد (Capacitor NativeBiometric) نفس الشكل بالظبط لـ lock.js: Face ID / Touch ID من المتصفح (WebAuthn، على الموبايل نفسه بس،
     مفيش حاجة بتروح للسيرفر) و PIN من 4 أرقام احتياطي (متخزن بصمة sha256 بس). أي فتح محتاج دوسة (Safari مابيسمحش بـ Face ID من غير دوسة).
   - الإشعارات (Web Push، iOS 16.4+ بعد "أضف للشاشة الرئيسية"): RdWebPush.subscribe() → link.js بيبعته للسيرفر. */
(function () {
  window.RD_WEB = true;
  document.documentElement.classList.add('rd-web');
  const standalone = () => (window.navigator.standalone === true) || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  const ls = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} } };
  const b64u = b => btoa(String.fromCharCode.apply(null, new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
  async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return b64u(d); }
  const hasPin = () => !!ls.get('rdw_pin');
  async function checkPin(p) { const salt = ls.get('rdw_pin_s'); return !!salt && (await sha(salt + ':' + p)) === ls.get('rdw_pin'); }
  async function setPin(p) { const salt = b64u(crypto.getRandomValues(new Uint8Array(12))); ls.set('rdw_pin_s', salt); ls.set('rdw_pin', await sha(salt + ':' + p)); }
  let fidAvail = null;
  async function faceAvail() {
    if (fidAvail != null) return fidAvail;
    try { fidAvail = !!(window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { fidAvail = false; }
    return fidAvail;
  }
  // Face ID: أول مرة بيتسجّل مفتاح على الموبايل ده بس، وبعدها بيتطلب بيه. التحقق محلي (زي بصمة أندرويد)
  async function face() {
    const id = ls.get('rdw_cred'), ch = crypto.getRandomValues(new Uint8Array(32));
    if (!id) {
      const c = await navigator.credentials.create({ publicKey: { challenge: ch, rp: { name: 'Repair Desk', id: location.hostname }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'repairdesk', displayName: 'Repair Desk' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000, attestation: 'none' } });
      if (!c) throw new Error('x');
      ls.set('rdw_cred', b64u(c.rawId)); return true;
    }
    const a = await navigator.credentials.get({ publicKey: { challenge: ch, allowCredentials: [{ type: 'public-key', id: unb64u(id), transports: ['internal'] }], userVerification: 'required', timeout: 60000 } });
    if (!a) throw new Error('x'); return true;
  }
  /* ---------- شاشة الفتح (فوق غطا lock.js) ---------- */
  const css = `#rdw{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#0b1222f2;color:#e7ecf7;font-family:system-ui,'Segoe UI',Tahoma,sans-serif;padding:20px}
#rdw .in{width:100%;max-width:320px;text-align:center}#rdw .ic{font-size:44px}#rdw b{display:block;font-size:20px;margin:6px 0 2px}#rdw small{display:block;color:#8d9bbb;min-height:20px;margin-bottom:14px}
#rdw .dots{display:flex;gap:12px;justify-content:center;margin:6px 0 16px}#rdw .dots i{width:14px;height:14px;border-radius:50%;border:2px solid #4f8ff7}#rdw .dots i.on{background:#4f8ff7}
#rdw .pad{direction:ltr;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}#rdw .pad button{height:58px;border-radius:18px;border:0;background:#18233d;color:#e7ecf7;font-size:22px;font-weight:800}
#rdw .row{display:flex;gap:10px;margin-top:12px}#rdw .row button{flex:1;padding:12px;border-radius:14px;border:0;background:#18233d;color:#e7ecf7;font-weight:800;font-size:14px}#rdw .row button.p{background:#2563eb;color:#fff}
#rdw .err{color:#ff8a8a}`;
  function sheet(mode, sub) {
    return new Promise((res, rej) => {
      let st = document.getElementById('rdw-css'); if (!st) { st = document.createElement('style'); st.id = 'rdw-css'; st.textContent = css; document.head.appendChild(st); }
      const w = document.createElement('div'); w.id = 'rdw'; document.body.appendChild(w);
      let pin = '', first = '', step = mode === 'setup' ? 'new' : 'enter', tries = 0;
      const end = (ok) => { w.remove(); ok ? res(true) : rej(new Error('cancel')); };
      const title = () => step === 'new' ? 'اختار PIN من 4 أرقام' : step === 'again' ? 'اكتب الـ PIN تاني' : 'اكتب الـ PIN';
      async function draw(msg, bad) {
        const fa = await faceAvail();
        w.innerHTML = `<div class="in"><div class="ic">🔒</div><b>${title()}</b><small class="${bad ? 'err' : ''}">${msg || sub || (step === 'new' ? 'علشان محدش يفتح أرقام المحل من موبايلك' : '')}</small>
          <div class="dots">${[0, 1, 2, 3].map(i => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join('')}</div>
          <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button data-x="1">✕</button><button data-n="0">0</button><button data-del="1">⌫</button></div>
          <div class="row">${fa && step === 'enter' ? '<button class="p" data-face="1">🙂 Face ID</button>' : ''}</div></div>`;
      }
      w.addEventListener('click', async e => {
        const t = e.target.closest('button'); if (!t) return;
        if (t.dataset.x) return end(false);
        if (t.dataset.del) { pin = pin.slice(0, -1); return draw(); }
        if (t.dataset.face) { try { await face(); return end(true); } catch (er) { return draw('Face ID ماتأكدش. اكتب الـ PIN', true); } }
        if (t.dataset.n == null || pin.length >= 4) return;
        pin += t.dataset.n; await draw();
        if (pin.length < 4) return;
        if (step === 'new') { first = pin; pin = ''; step = 'again'; return draw(); }
        if (step === 'again') { if (pin !== first) { pin = ''; first = ''; step = 'new'; return draw('مش زي الأول، جرّب تاني', true); } await setPin(pin); if (await faceAvail()) { try { await face(); } catch (er) { /* Face ID اختياري */ } } return end(true); }
        if (await checkPin(pin)) return end(true);
        pin = ''; tries++;
        if (tries >= 5) { w.innerHTML = '<div class="in"><div class="ic">⏳</div><b>محاولات كتير</b><small>استنى دقيقة</small></div>'; setTimeout(() => { tries = 3; draw(); }, 60000); return; }
        draw('الـ PIN غلط', true);
      });
      draw();
    });
  }
  // نفس واجهة البلجن اللي lock.js بيستخدمها
  window.Capacitor = window.Capacitor || { Plugins: {} };
  Capacitor.Plugins = Capacitor.Plugins || {};
  Capacitor.Plugins.NativeBiometric = {
    isAvailable: async () => ({ isAvailable: true }),   // الـ PIN متاح دايمًا
    verifyIdentity: async (o) => sheet(hasPin() ? 'enter' : 'setup', o && o.subtitle && !/البصمة/.test(o.subtitle) ? o.subtitle : ''),
  };
  /* ---------- Web Push ---------- */
  async function subscribe(vapid) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !window.Notification) return { error: 'الآيفون ده مابيدعمش الإشعارات (محتاج iOS 16.4 أو أحدث)' };
    if (!standalone()) return { error: 'ضيف التطبيق للشاشة الرئيسية الأول (زرار المشاركة ← إضافة إلى الشاشة الرئيسية) وافتحه منها' };
    const perm = await Notification.requestPermission(); if (perm !== 'granted') return { error: 'الإشعارات مقفولة. افتحها من إعدادات الآيفون' };
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(vapid) });
    return { ok: true, sub: sub.toJSON() };
  }
  window.RdWebPush = { subscribe, standalone, supported: () => 'serviceWorker' in navigator && 'PushManager' in window && !!window.Notification };
})();
