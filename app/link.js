/* الربط بالكاشير (خالد، 2026-10-29):
   1) أول مرة: الكاشير (الإعدادات ← 📱 موبايل صاحب المحل) بيطلّع QR فيه "RDO1:<كود>". التطبيق بيمسحه بالكاميرا (jsQR) أو الكود بيتكتب،
      ويبعته لـ gateway (mobile-pair) وياخد مفتاح (token) + اسم قناة. المفتاح بيتحفظ على الموبايل بس.
   2) بعد كده: snap-get بالمفتاح = آخر ملخص. والتحديث اللحظي: websocket على Supabase Realtime، والسيرفر بيبعت على القناة
      "changed" بس (من غير أرقام)، فالتطبيق بيطلب الملخص تاني. ولو الـ websocket وقع: كل دقيقة وإحنا فاتحين التطبيق، وأول ما يرجع قدامك.
   3) لو الكاشير فصل الموبايل (gone): المفتاح بيتمسح وبيرجع لشاشة الربط. */
(function () {
  const SB = 'https://sgqscttmkhmiqyjsuvio.supabase.co';
  const KEY = 'sb_publishable_y11CnpnNLb6qIx00LVUHJQ_BzzQNXim';   // مفتاح عام (publishable) زي اللي في البرنامج، والجداول مقفولة عليه
  const GW = SB + '/functions/v1/gateway';
  const $ = s => document.querySelector(s);
  const store = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} } };

  async function gw(body) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(GW, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      let j = null; try { j = await r.json(); } catch (e) {}
      return j || { error: 'تعذر الاتصال بالسيرفر' };
    } catch (e) { return { error: 'مفيش نت', net: true }; } finally { clearTimeout(t); }
  }

  /* ---------- البيانات ---------- */
  let loading = false, again = false, lastOk = 0;   // again: إشارة "اتغيّر" وصلت واحنا بنحمّل = نحمّل تاني بعدها (مانفوّتش آخر تغيير)
  let STOCK = null;   // آخر مخزن وصل (السيرفر مابيبعتهوش تاني لو بصمته زي ما هي)
  async function refresh() {
    const token = store.get('rdo_token'); if (!token) return;
    if (loading) { again = true; return; }
    loading = true; again = false;
    try {
      const r = await gw({ action: 'snap-get', mtoken: token, sv: STOCK && STOCK.v ? STOCK.v : '' });
      if (r.gone || (r.error && /اتفصل/.test(r.error))) { forget('الكاشير فصل الموبايل ده. اربطه تاني.'); return; }
      if (r.error) { Owner.setStatus(r.net ? 'مفيش نت' : r.error, true); return; }
      if (r.chan && r.chan !== store.get('rdo_chan')) { store.set('rdo_chan', r.chan); rt.connect(); }
      lastOk = Date.now();
      if (r.data && r.data.stock) { if (r.data.stock.same && STOCK && STOCK.v === r.data.stock.v) r.data.stock = STOCK; else if (!r.data.stock.same) STOCK = r.data.stock; else { r.data.stock = null; STOCK = null; again = true; } }   // المخزن ماتغيّرش: النسخة اللي عندنا
      if (r.data) Owner.load(r.data); else Owner.empty('الكاشير لسه مابعتش بيانات. افتح البرنامج على الكاشير.');
      if (window.OwnerFull) OwnerFull.sync(gw, token);   // البيانات الكاملة المتشفّرة (fulldata.js): الأجزاء اللي اتغيّرت بس
      checkOps();
    } finally { loading = false; if (again) setTimeout(refresh, 300); }
  }
  const native = () => window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.RdNative;   // بيحفظ المفتاح للكود الأصلي علشان أزرار وافق/ارفض في الإشعار تشتغل والتطبيق مقفول (RdNativePlugin.java)
  function forget(msg) { try { native() && native().save({ token: '' }); } catch (e) {} store.set('rdo_act', ''); store.set('rdo_token', ''); store.set('rdo_chan', ''); store.set('rdo_pending', ''); store.set('rdo_push', ''); if (window.OwnerFull) OwnerFull.forget(); rt.close(); if (window.Branches && Branches.onGone()) { location.reload(); return; } showPair(msg); }   // فيه فروع تانية مربوطة: نروح لأولهم

  /* ---------- Realtime (Phoenix websocket من غير مكتبات) ---------- */
  const rt = (() => {
    let ws = null, hb = null, ref = 0, retry = 0, reT = null, want = false;
    const send = (topic, event, payload) => { try { ws && ws.readyState === 1 && ws.send(JSON.stringify({ topic, event, payload, ref: String(++ref) })); } catch (e) {} };
    function connect() {
      const chan = store.get('rdo_chan'); close(); if (!chan) return;
      want = true;
      ws = new WebSocket(SB.replace('https', 'wss') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(KEY) + '&vsn=1.0.0');
      ws.onopen = () => { retry = 0; send('realtime:' + chan, 'phx_join', { config: { broadcast: { self: false }, presence: { key: '' }, private: false } }); hb = setInterval(() => send('phoenix', 'heartbeat', {}), 25000); Owner.setLive(true); };
      ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m.event === 'broadcast' && m.payload && m.payload.event === 'changed') refresh(); };   // refresh بيسأل عن الطلبات المستنية كمان (checkOps)
      ws.onclose = () => { clearInterval(hb); ws = null; Owner.setLive(false); if (want) { reT = setTimeout(connect, Math.min(30000, 1000 * Math.pow(2, retry++))); } };
      ws.onerror = () => { try { ws && ws.close(); } catch (e) {} };
    }
    function close() { want = false; clearTimeout(reT); clearInterval(hb); if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} ws = null; } }
    return { connect, close, live: () => !!ws && ws.readyState === 1 };
  })();

  /* ---------- شاشة الربط ---------- */
  let stream = null, scanning = false;
  function showPair(msg) {
    $('#pair').hidden = false; $('#pair-err').textContent = msg || ''; $('#pair-code').value = '';
  }
  async function pair(code) {
    // RDO2:<الكود>.<مفتاح التشفير> = الـ QR الجديد (البيانات الكاملة). الكود لوحده (مكتوب بإيد أو RDO1) = الملخص بس زي الأول
    const s0 = String(code || '').trim(), m2 = /^RDO2:([A-Za-z0-9]+)\.([A-Za-z0-9_-]{43})$/.exec(s0), fkey = m2 ? m2[2] : '';
    code = (m2 ? m2[1] : s0).toUpperCase().replace(/^RDO1:/, '').replace(/[^A-Z0-9]/g, '');
    if (code.length < 6) { $('#pair-err').textContent = 'الكود ناقص'; return; }
    stopScan(); $('#pair-go').disabled = true; $('#pair-err').textContent = '';
    try {
      const ua = navigator.userAgent, name = (ua.match(/;\s*([^;)]+)\s+Build/) || [])[1] || (/iPhone/.test(ua) ? 'آيفون' : /iPad/.test(ua) ? 'آيباد' : 'موبايل');   // الآيفون مالوش Build (كان بيظهر موبايل في قايمة الكاشير)
      const r = await gw({ action: 'mobile-pair', code, name: name.slice(0, 40) });
      if (r.error) { $('#pair-err').textContent = r.error; return; }
      store.set('rdo_token', r.token); store.set('rdo_chan', r.chan);
      if (window.OwnerFull) OwnerFull.setKey(fkey);
      if (window.Branches) Branches.onPaired();   // فرع جديد أو نفس الفرع اتربط تاني (branches.js)
      const bk = $('#pair-back'); if (bk) bk.hidden = true;
      $('#pair').hidden = true; Owner.skeleton(); rt.connect(); refresh(); setupPush();
    } finally { $('#pair-go').disabled = false; }
  }
  // اتفصل وانت برّه المحل (خالد 2026-10-30): يوزر وباسورد المحل بدل الـ QR. الباسورد مابيتحفظش، بيروح للسيرفر مرة واحدة
  async function loginAcct(user, pass) {
    user = String(user || '').trim(); pass = String(pass || '');
    if (!user || !pass) { $('#pair-err').textContent = 'اكتب اليوزر والباسورد'; return; }
    stopScan(); $('#acct-go').disabled = true; $('#pair-err').textContent = '';
    try {
      const ua = navigator.userAgent, name = (ua.match(/;\s*([^;)]+)\s+Build/) || [])[1] || (/iPhone/.test(ua) ? 'آيفون' : /iPad/.test(ua) ? 'آيباد' : 'موبايل');   // الآيفون مالوش Build (كان بيظهر موبايل في قايمة الكاشير)
      const r = await gw({ action: 'mobile-login', username: user, password: pass, name: name.slice(0, 40) });
      if (r.error) { $('#pair-err').textContent = r.error; return; }
      $('#acct-pass').value = '';
      store.set('rdo_token', r.token); store.set('rdo_chan', r.chan);
      if (window.Branches) Branches.onPaired();
      const bk = $('#pair-back'); if (bk) bk.hidden = true;
      $('#pair').hidden = true; Owner.skeleton(); rt.connect(); refresh(); setupPush();
    } finally { $('#acct-go').disabled = false; }
  }
  async function startScan() {
    const v = $('#pair-video');
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
    catch (e) { $('#pair-err').textContent = 'محتاجين إذن الكاميرا علشان نقرا الكود. أو اكتب الكود بإيدك.'; return; }
    v.srcObject = stream; v.hidden = false; await v.play().catch(() => {});
    $('#pair-scan').hidden = true; scanning = true;
    const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
    const loop = () => {
      if (!scanning) return;
      if (v.videoWidth) {
        const w = 480, h = Math.round(v.videoHeight / v.videoWidth * w); cv.width = w; cv.height = h; cx.drawImage(v, 0, 0, w, h);
        const res = window.jsQR && jsQR(cx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
        if (res && /^RDO[12]:/.test(res.data)) { if (navigator.vibrate) navigator.vibrate(60); return pair(res.data); }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  function stopScan() { scanning = false; if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } const v = $('#pair-video'); if (v) { v.hidden = true; v.srcObject = null; } const b = $('#pair-scan'); if (b) b.hidden = false; }

  /* ---------- البداية ---------- */
  function boot() {
    $('#pair-scan').onclick = startScan;
    $('#pair-go').onclick = () => pair($('#pair-code').value);
    $('#pair-code').onkeydown = e => { if (e.key === 'Enter') pair($('#pair-code').value); };
    $('#acct-open').onclick = () => { const a = $('#acct'); a.hidden = !a.hidden; if (!a.hidden) $('#acct-user').focus(); };
    $('#acct-go').onclick = () => loginAcct($('#acct-user').value, $('#acct-pass').value);
    $('#acct-pass').onkeydown = e => { if (e.key === 'Enter') loginAcct($('#acct-user').value, $('#acct-pass').value); };
    if (location.hash === '#demo') { Owner.load(window.DEMO); return; }   // للتجربة من غير سيرفر
    // قدامك تاني (رجعت للتطبيق): هات الجديد. ومن غير realtime: كل دقيقة (refresh مابيعملش حاجة لو مش مربوط)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { checkUpdate(); if (store.get('rdo_token')) { refresh(); if (!rt.live()) rt.connect(); } } });
    setTimeout(checkUpdate, 3000);
    setInterval(() => { if (document.visibilityState === 'visible') checkUpdate(); }, 3600e3);   // وكل ساعة وهو قدامك
    setInterval(() => { if (document.visibilityState === 'visible' && (!rt.live() || Date.now() - lastOk > 330000)) refresh(); }, 60000);   // النبضة من الكاشير كل 5 دقايق
    if (window.Branches) Branches.bind(gw);
    if (!store.get('rdo_token')) { showPair(); if (window.Branches && Branches.adding()) { const bk = $('#pair-back'); bk.hidden = false; bk.onclick = () => Branches.cancelAdd(); } return; }
    rt.connect(); refresh(); setTimeout(setupPush, 1500);
  }
  /* ---------- الطلبات للكاشير (actions.js): بتتحفظ هنا لحد ما الكاشير يرد ---------- */
  const PK = 'rdo_pending';
  const pendList = () => { try { const a = JSON.parse(store.get(PK) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const pendSave = a => store.set(PK, a.length ? JSON.stringify(a.slice(-50)) : '');
  async function submit(op, label) {
    const token = store.get('rdo_token'); if (!token) return { error: 'الموبايل مش مربوط' };
    const r = await gw({ action: 'op-submit', mtoken: token, op });
    if (r.gone) { forget('الكاشير فصل الموبايل ده. اربطه تاني.'); return { error: r.error }; }
    if (r.error) return { error: r.net ? 'مفيش نت. جرّب تاني.' : r.error };
    pendSave(pendList().concat([{ id: r.id, kind: op.kind, label: String(label || '').slice(0, 60), at: Date.now(), status: 'pending' }]));
    // الكاشير بيسجّل في ثانية أو اتنين: نسأل بسرعة الأول بدل ما نستنى الـ 15 ثانية (خالد 2026-11-20: "بيقولي مستني الكاشير وبتاخد وقت")
    // لايف (خالد 2026-11-20: "مينفعش يبقى زي اللايف ويوفّر حمل على السيرفر"): الكاشير لما يخلّص بيبعت إشارة "changed" على القناة،
    // والموبايل بيسأل ساعتها بس. لو القناة واقعة: نسأل بسرعة كام مرة بدلها
    if (!rt.live()) [2000, 5000, 10000].forEach(ms => setTimeout(checkOps, ms));
    return { ok: true, id: r.id };
  }
  let checking = false;
  async function checkOps() {
    const token = store.get('rdo_token'), P = pendList().filter(p => p.status === 'pending');
    if (!token || !P.length || checking) return;
    checking = true;
    try {
      const r = await gw({ action: 'op-status', mtoken: token, ids: P.map(p => p.id) });
      if (!r.ok) return;
      let all = pendList(), changed = false;
      for (const x of r.list || []) {
        const p = all.find(q => q.id === x.id); if (!p || x.status === 'pending') continue;
        changed = true;
        if (p.kind === 'find') { all = all.filter(q => q.id !== x.id); if (window.OwnerExtras) OwnerExtras.found(p.label, x.status === 'done' ? x.result : { error: (x.result && x.result.error) || 'الكاشير رفض' }); continue; }   // البحث في الأقدم: مالوش toast
        try { window.dispatchEvent(new CustomEvent('owner:op', { detail: { id: x.id, status: x.status } })); } catch (e) {}   // storetab: يشيل "مستني الكاشير"
        if (x.status === 'done') { all = all.filter(q => q.id !== x.id); Owner.toast('✅ الكاشير سجّل ' + p.label + (x.result && x.result.receiptNo && p.kind === 'intake' ? ' — إيصال #' + x.result.receiptNo : x.result && x.result.receiptNo && p.kind === 'sell' ? ' — فاتورة ' + x.result.receiptNo : '') + (p.kind === 'count' && x.result && x.result.short ? ' — فيه ' + x.result.short + ' صنف ناقص' : '')); }
        else { p.status = 'failed'; p.error = (x.result && x.result.error) || 'الكاشير رفض الطلب'; Owner.toast('⚠ ' + p.label + ': ' + p.error, true); }
      }
      if (changed) { pendSave(all); Owner.repaint(); }
    } finally { checking = false; }
  }
  let lastChk = 0; const chk0 = checkOps;
  setInterval(() => { if (document.visibilityState !== 'visible') return; if (rt.live() && Date.now() - lastChk < 60000) return; lastChk = Date.now(); chk0(); }, 15000);   // لايف: احتياطي كل دقيقة بس، من غيره كل 15 ثانية

  /* ---------- الإشعارات (Firebase FCM، الخطة المجانية) ----------
     بعد الربط: بنطلب إذن الإشعارات، وعنوان الموبايل عند Firebase (token) بيتبعت للسيرفر (push-token).
     السيرفر بيبعت إشعار لما: تحويل على تليفون المحافظ ماتسجلش، أو الكاشير سجّل/رفض طلب من الموبايل ده. */
  let pushInit = false;
  /* الآيفون (نسخة الويب، 2026-11-18): Web Push. أول مرة محتاجة دوسة من الإعدادات (Safari مابيسألش من غيرها)، وبعدين بيتحدّث لوحده لو الإذن موجود.
     العنوان بيتبعت للسيرفر بنفس push-token (web) ولكل الفروع المربوطة */
  async function setupWebPush(ask) {
    if (!window.RdWebPush || !store.get('rdo_token')) return { error: 'مش متاح هنا' };
    if (!ask && !(window.Notification && Notification.permission === 'granted')) return { skip: true };
    const k = await gw({ action: 'push-vapid' }); if (!k || !k.ok) return { error: (k && k.error) || 'مفيش نت' };
    let s; try { s = await RdWebPush.subscribe(k.key); } catch (e) { s = { error: 'الإشعارات ماشتغلتش. جرّب تاني' }; }
    if (!s || s.error) return s || { error: 'حصل خطأ' };
    const sig = JSON.stringify(s.sub);
    if (sig !== store.get('rdo_push')) { const r = await gw({ action: 'push-token', mtoken: store.get('rdo_token'), web: s.sub }); if (r.error) return r; store.set('rdo_push', sig); }
    if (window.Branches && Branches.pushAll) Branches.pushAll(gw, sig, s.sub);
    return { ok: true };
  }
  async function setupPush() {
    if (window.RD_WEB) { setupWebPush(false).catch(() => {}); return; }
    const P = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.PushNotifications;
    if (!P || !store.get('rdo_token')) return;
    if (native()) { try { await native().save({ token: store.get('rdo_token') }); if (store.get('rdo_act') !== store.get('rdo_token')) { const r = await gw({ action: 'push-prefs', mtoken: store.get('rdo_token'), prefs: { act: true } }); if (r.ok) store.set('rdo_act', store.get('rdo_token')); } } catch (e) {} }
    try {
      let st = await P.checkPermissions();
      if (st.receive === 'prompt' || st.receive === 'prompt-with-rationale') st = await P.requestPermissions();
      if (st.receive !== 'granted') return;
      // قناة "تنبيهات المحل" بأهمية عالية: الإشعار بيطلع فوق الشاشة وبصوت (خالد 2026-10-30: كان بييجي ساكت في القايمة ومابياخدش باله منه)
      try { await P.createChannel({ id: 'alerts', name: 'تنبيهات المحل', description: 'تحويل ماتسجلش، تقفيل الوردية، طلبات الموظفين', importance: 5, visibility: 1, vibration: true, lights: true }); } catch (e) {}
      if (!pushInit) {
        pushInit = true;
        P.addListener('registration', async t => {
          if (!t || !t.value) return;
          if (t.value !== store.get('rdo_push')) { const r = await gw({ action: 'push-token', mtoken: store.get('rdo_token'), push: t.value }); if (r.ok) store.set('rdo_push', t.value); }
          if (window.Branches) Branches.pushAll(gw, t.value);   // نفس العنوان للفروع التانية المربوطة
        });
        P.addListener('pushNotificationReceived', n => { Owner.toast((n.title || '') + (n.body ? ' — ' + n.body : '')); refresh(); checkOps(); });
        P.addListener('pushNotificationActionPerformed', () => { refresh(); checkOps(); });
      }
      await P.register();
    } catch (e) { /* من غير إشعارات: التطبيق شغال عادي */ }
  }

  /* ---------- التحديث (من الـ release على GitHub: owner.json + RepairDesk-Owner.apk) ----------
     بنقرا owner.json بـ CapacitorHttp (من غير CORS). لو النسخة أحدث: زرار "تحديث" في الراس بيفتح الـ APK في المتصفح، والأندرويد بيسأل "تثبيت". */
  const UPD = 'https://github.com/khalid374374/repair-desk/releases/download/repair-desk/owner.json';
  const newer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
  let lastUpd = 0;
  // force (من الإعدادات "دوّر على تحديث"): من غير استنى الـ 6 ساعات، وبيرجّع النتيجة
  async function checkUpdate(force) {
    const H = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.CapacitorHttp; if (!H) return { error: 'مش متاح هنا' };
    if (!force && Date.now() - lastUpd < 20 * 60e3) return {};   // كانت 6 ساعات: التطبيق اللي فاضل مفتوح في الخلفية ماكانش بيشوف النسخ الجديدة (خالد 2026-10-29)
    lastUpd = Date.now();
    try {
      const r = await H.get({ url: UPD + '?t=' + Date.now(), responseType: 'json' });
      const j = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      if (j && j.version && j.url && newer(j.version, window.APP_VER || '0')) { Owner.showUpdate(j); return { update: j.version }; }
      return { latest: true };
    } catch (e) { return { error: 'مفيش نت' }; }   // مفيش نت أو الملف مش موجود: نجرّب بعدين
  }
  // أنواع الإشعارات اللي عايزها (الإعدادات): السيرفر مابيبعتش النوع المقفول (gateway: push-prefs)
  async function pushPrefs(prefs) {
    const token = store.get('rdo_token'); if (!token) return { error: 'الموبايل مش مربوط' };
    const r = await gw({ action: 'push-prefs', mtoken: token, prefs });
    // الفروع (2026-11-17): نفس الإعدادات لكل فرع مربوط على الموبايل ده (كانت بتتحفظ للفرع المفتوح بس)
    if (!r.error && window.Branches) { const L = Branches.list(), c = Branches.cur(); for (let i = 0; i < L.length; i++) if (i !== c && L[i].rdo_token) { try { await gw({ action: 'push-prefs', mtoken: L[i].rdo_token, prefs }); } catch (e) {} } }
    return r.error ? { error: r.net ? 'مفيش نت. جرّب تاني.' : r.error } : { ok: true };
  }
  window.OwnerLink = { checkOps, call: body => gw({ ...body, mtoken: store.get('rdo_token') }), refresh, setupPush, webPush: () => setupWebPush(true), pushPrefs, forget: () => forget(''), checkUpdate, submit, checkOps, pending: pendList, dropPending: id => { pendSave(pendList().filter(p => p.id !== id)); }, _pair: pair, _login: loginAcct, _newer: newer };
  boot();
})();
