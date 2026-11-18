/* تطبيق المندوب: الربط بالكاشير والسيرفر (خالد 2026-11-08).
   1) الكاشير (الإعدادات ← 🛒 المتجر ← المناديب ← 📱 موبايل المندوب) بيطلّع QR فيه "RDC1:<كود>" باسم المندوب. التطبيق بيبعته mobile-pair وياخد مفتاح + قناة.
   2) courier-get بالمفتاح = طلباته (الكاشير بيبعتها courier-put لما طلب يتغيّر)، والتحديث اللحظي على قناته (Realtime "changed")، وكل 5 دقايق احتياطي.
   3) الأزرار = طلب op-submit بنوع courier (السيرفر بيحط اسمه)، والرد من op-status. لو الكاشير فصله: بيرجع لشاشة الربط. */
(function () {
  const SB = 'https://sgqscttmkhmiqyjsuvio.supabase.co';
  const KEY = 'sb_publishable_y11CnpnNLb6qIx00LVUHJQ_BzzQNXim';   // مفتاح عام زي اللي في البرنامج، والجداول مقفولة عليه
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
  let loading = false, again = false, lastOk = 0;
  async function refresh() {
    const token = store.get('rdc_token'); if (!token) return;
    if (loading) { again = true; return; }
    loading = true; again = false;
    try {
      const r = await gw({ action: 'courier-get', mtoken: token });
      if (r.gone) { forget('المحل فصل الموبايل ده. اربطه تاني.'); return; }
      if (r.error) { Courier.setLive(false, r.net ? 'مفيش نت' : r.error); return; }
      if (r.chan && r.chan !== store.get('rdc_chan')) { store.set('rdc_chan', r.chan); rt.connect(); }
      lastOk = Date.now();
      Courier.setLive(true);
      const kind = r.kind === 'emp' ? 'emp' : 'courier'; store.set('rdc_kind', kind);
      const d = r.data ? { ...r.data, kind } : { v: 1, kind, name: r.name || '', orders: [], done: [], cash: 0, today: { done: 0, cash: 0 }, at: 0, empty: true };
      Courier.load(d); native(d.att);
      checkOps();
    } finally { loading = false; if (again) setTimeout(refresh, 300); }
  }
  // الجزء اللي شغال في الخلفية (AttService.java): المفتاح، واي فاي المحل، ومواعيد الورديات علشان يسجّل لوحده
  function native(att) { try { const N = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.RdAtt; if (!N) return; N.config({ token: store.get('rdc_token'), on: !!(att && att.on && att.phone), wifi: (att && att.wifi) || [], wins: ((att && att.wins) || []).map(w => ({ start: w.start, end: w.end })) }); } catch (e) {} }
  function forget(msg) { rt.close(); native(null); try { const N = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.RdAtt; if (N) N.config({ token: '', on: false, wifi: [], wins: [] }); } catch (e) {} ['rdc_token', 'rdc_chan', 'rdc_pending', 'rdc_name', 'rdc_kind'].forEach(k => store.set(k, '')); Courier.reset(); showPair(msg); }
  /* ---------- Realtime (Phoenix websocket من غير مكتبات) ---------- */
  const rt = (() => {
    let ws = null, hb = null, ref = 0, retry = 0, reT = null, want = false;
    const send = (topic, event, payload) => { try { ws && ws.readyState === 1 && ws.send(JSON.stringify({ topic, event, payload, ref: String(++ref) })); } catch (e) {} };
    function connect() {
      const chan = store.get('rdc_chan'); close(); if (!chan) return;
      want = true;
      ws = new WebSocket(SB.replace('https', 'wss') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(KEY) + '&vsn=1.0.0');
      ws.onopen = () => { retry = 0; send('realtime:' + chan, 'phx_join', { config: { broadcast: { self: false }, presence: { key: '' }, private: false } }); hb = setInterval(() => send('phoenix', 'heartbeat', {}), 25000); };
      ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m.event === 'broadcast' && m.payload && m.payload.event === 'changed') { refresh(); if (navigator.vibrate) navigator.vibrate(40); } };
      ws.onclose = () => { clearInterval(hb); ws = null; if (want) reT = setTimeout(connect, Math.min(30000, 1000 * Math.pow(2, retry++))); };
      ws.onerror = () => { try { ws && ws.close(); } catch (e) {} };
    }
    function close() { want = false; clearTimeout(reT); clearInterval(hb); if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} ws = null; } }
    return { connect, close, live: () => !!ws && ws.readyState === 1 };
  })();
  /* ---------- الطلبات للكاشير ---------- */
  const PK = 'rdc_pending';
  const pend = () => { try { const a = JSON.parse(store.get(PK) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const pendSave = a => store.set(PK, a.length ? JSON.stringify(a.slice(-30)) : '');
  async function act(a, id, why) {
    const token = store.get('rdc_token'); if (!token) return { error: 'الموبايل مش مربوط' };
    const r = await gw({ action: 'op-submit', mtoken: token, op: { kind: 'courier', act: a, id: id || '', ...(why ? { why: String(why).slice(0, 120) } : {}) } });
    if (r.gone) { forget('المحل فصل الموبايل ده. اربطه تاني.'); return { error: r.error }; }
    if (r.error) return { error: r.net ? 'مفيش نت. جرّب تاني.' : r.error };
    pendSave(pend().concat([{ id: r.id, act: a, oid: id || '', at: Date.now() }]));
    fast(); return { ok: true };
  }
  // الحضور: in / back / out / break / leave (السيرفر بيحط الاسم والـ id والوقت)
  async function att(a, extra) {
    const token = store.get('rdc_token'); if (!token) return { error: 'الموبايل مش مربوط' };
    const r = await gw({ action: 'op-submit', mtoken: token, op: { kind: 'att', a, ...(extra || {}) } });
    if (r.gone) { forget('المحل فصل الموبايل ده. اربطه تاني.'); return { error: r.error }; }
    if (r.error) return { error: r.net ? 'مفيش نت. جرّب تاني.' : r.error };
    pendSave(pend().concat([{ id: r.id, kind: 'att', a, at: Date.now() }]));
    fast(); return { ok: true };
  }
  let checking = false, fastT = null, fastN = 0;
  async function checkOps() {
    const token = store.get('rdc_token'), P = pend(); if (!token || !P.length || checking) return;
    checking = true;
    try {
      const r = await gw({ action: 'op-status', mtoken: token, ids: P.map(p => p.id) }); if (!r.ok) return;
      let all = pend(), changed = false;
      for (const x of r.list || []) {
        const p = all.find(q => q.id === x.id); if (!p || x.status === 'pending') continue;
        changed = true; all = all.filter(q => q.id !== x.id);
        const err = x.status === 'done' ? null : ((x.result && x.result.error) || 'المحل رفض');
        if (p.kind === 'att') Courier.attDone(p, err, x.result || {}); else Courier.done(p, err);
      }
      // الطلب اللي عدّى عليه 3 أيام والكاشير ماردّش: بيتشال
      all = all.filter(p => Date.now() - p.at < 3 * 864e5);
      pendSave(all); if (changed) refresh();
    } finally { checking = false; }
  }
  // بعد زرار: بنسأل كل 3 ثواني لحد ما الكاشير يرد (أو دقيقة)، وبعدها مع الإشارة العادية
  function fast() { clearTimeout(fastT); fastN = 0; const tick = () => { if (!pend().length || ++fastN > 20) return; checkOps(); fastT = setTimeout(tick, 3000); }; fastT = setTimeout(tick, 1500); }
  /* ---------- شاشة الربط ---------- */
  let stream = null, scanning = false;
  function showPair(msg) { $('#pair').hidden = false; $('#pair-err').textContent = msg || ''; $('#pair-code').value = ''; }
  async function pair(code) {
    code = String(code || '').toUpperCase().replace(/^RDC1:/, '').replace(/[^A-Z0-9]/g, '');
    if (code.length < 6) { $('#pair-err').textContent = 'الكود ناقص'; return; }
    stopScan(); $('#pair-go').disabled = true; $('#pair-err').textContent = '';
    try {
      const r = await gw({ action: 'mobile-pair', code, want: 'staff' });   // مندوب أو موظف
      if (r.error) { $('#pair-err').textContent = r.error; return; }
      if (r.kind !== 'courier' && r.kind !== 'emp') { $('#pair-err').textContent = 'ده كود موبايل صاحب المحل أو المراقب. اطلب كود الموظف من الكاشير.'; return; }
      store.set('rdc_kind', r.kind);
      store.set('rdc_token', r.token); store.set('rdc_chan', r.chan || ''); store.set('rdc_name', r.name || '');
      $('#pair').hidden = true; Courier.skeleton(r.name); rt.connect(); refresh();
    } finally { $('#pair-go').disabled = false; }
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
        if (res && /^RD[A-Z]1:/.test(res.data)) {
          if (!/^RDC1:/.test(res.data)) { $('#pair-err').textContent = 'ده مش كود الموظف. اطلبه من الكاشير (الحضور ← ⚙ ← 📱 اربط موبايله).'; }
          else { if (navigator.vibrate) navigator.vibrate(60); return pair(res.data); }
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  function stopScan() { scanning = false; if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } const v = $('#pair-video'); if (v) { v.hidden = true; v.srcObject = null; } const b = $('#pair-scan'); if (b) b.hidden = false; }
  /* ---------- التحديث (courier.json على نفس الـ release) ---------- */
  const newer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) > (y[i] || 0)) return true; if ((x[i] || 0) < (y[i] || 0)) return false; } return false; };
  async function checkUpdate() {
    try {
      const H = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.CapacitorHttp; if (!H) return;
      const r = await H.get({ url: 'https://github.com/khalid374374/repair-desk/releases/download/repair-desk/courier.json?t=' + Date.now() });
      const j = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      if (j && j.version && newer(j.version, window.APP_VER || '0')) Courier.showUpdate(j);
    } catch (e) {}
  }
  /* ---------- البداية ---------- */
  function boot() {
    $('#pair-scan').onclick = startScan;
    $('#pair-go').onclick = () => pair($('#pair-code').value);
    $('#pair-code').onkeydown = e => { if (e.key === 'Enter') pair($('#pair-code').value); };
    if (/demo/.test(location.hash + location.search)) return;   // نسخة الشكل (demo.js)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && store.get('rdc_token')) { refresh(); if (!rt.live()) rt.connect(); checkUpdate(); } });
    setInterval(() => { if (document.visibilityState === 'visible' && store.get('rdc_token') && (!rt.live() || Date.now() - lastOk > 330000)) refresh(); }, 60000);   // الدقيقة عند سقوط القناة، واحتياطي كل 5.5 دقيقة لو القناة ساكتة
    setTimeout(checkUpdate, 3000);
    if (!store.get('rdc_token')) { showPair(); return; }
    Courier.skeleton(store.get('rdc_name')); rt.connect(); refresh(); if (pend().length) fast();
  }
  window.CourierLink = { act, att, refresh, forget: () => forget(''), pending: pend, _pair: pair };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
