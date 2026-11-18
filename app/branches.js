/* الفروع على تطبيق الصاحب (خالد 2026-11-17، فكرة أ): الموبايل يتربط بكذا فرع (كل فرع = ربط لوحده بالـ QR من الكاشير بتاعه).
   - المربوط دلوقتي (الفرع المختار) حاجته في نفس المفاتيح اللي التطبيق كله بيستخدمها (rdo_token / rdo_chan / rdo_fkey ...)،
     فباقي التطبيق ماتغيّرش. الفروع التانية محفوظة في rdo_links، والتبديل = نحفظ ده ونحط التاني ونعيد فتح التطبيق.
   - البيانات الكاملة المتشفّرة (fulldata.js) ليها قاعدة لكل فرع (rdo_fdb) علشان الأرقام ماتتلخبطش.
   - "كل الفروع" = نداء واحد (snap-sum) بأهم الأرقام لكل فرع. الإشعار بيبدأ باسم الفرع (السيرفر). */
(function () {
  const SLOT = ['rdo_token', 'rdo_chan', 'rdo_fkey', 'rdo_fver', 'rdo_pending', 'rdo_notes_seen', 'rdo_act', 'rdo_fdb', 'rdo_push'];
  const ls = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} } };
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const $ = s => document.querySelector(s);
  const read = () => { try { const v = JSON.parse(ls.get('rdo_links') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const write = L => ls.set('rdo_links', L.length ? JSON.stringify(L) : '');
  const cur = () => Math.max(0, +ls.get('rdo_cur') || 0);
  const snapNow = () => { const o = {}; SLOT.forEach(k => { o[k] = ls.get(k); }); return o; };
  const putSlot = o => SLOT.forEach(k => ls.set(k, (o && o[k]) || ''));
  let GW = null;   // gateway (من link.js عن طريق bind)
  const native = () => window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.RdNative;
  // التبديل بيعيد فتح التطبيق: من غير ما يطلب البصمة تاني (التطبيق كان مفتوح أصلًا). lock.js بيقرا العلامة دي مرة واحدة، 15 ثانية بس
  const reload = () => { try { sessionStorage.setItem('rdo_nolock', String(Date.now())); } catch (e) {} location.reload(); };
  // أول مرة بعد التحديث: الربط القديم (فرع واحد) يبقى أول فرع في القايمة
  function migrate() { const L = read(); if (!L.length && ls.get('rdo_token')) { write([{ ...snapNow(), name: '' }]); ls.set('rdo_cur', '0'); } }
  function save() { const L = read(), i = cur(); if (!L[i] || !ls.get('rdo_token')) return; L[i] = { ...L[i], ...snapNow() }; write(L); }
  const list = () => { save(); return read(); };
  function setName(i, name) { const L = read(); if (L[i] && name && L[i].name !== name) { L[i].name = String(name).slice(0, 40); write(L); paintBar(); } }
  async function switchTo(i) {
    const L = list(), o = cur(); if (!L[i] || i === o) return;
    // أزرار وافق/ارفض في الإشعار بتستخدم مفتاح الفرع المفتوح: الفرع اللي بنسيبه يبطّل يبعتها (وإلا الزرار يروح للفرع الغلط)، والجديد بيشغّلها في setupPush
    if (GW && L[o] && L[o].rdo_act && L[o].rdo_token) { try { await Promise.race([GW({ action: 'push-prefs', mtoken: L[o].rdo_token, prefs: { act: false } }), new Promise(r => setTimeout(r, 2500))]); } catch (e) {} L[o].rdo_act = ''; write(L); }
    putSlot(L[i]); ls.set('rdo_cur', String(i));
    try { native() && native().save({ token: L[i].rdo_token || '' }); } catch (e) {}   // أزرار وافق/ارفض في الإشعار للفرع المختار
    reload();
  }
  // ➕ فرع تاني: نحفظ المربوط، ونفضّي المفاتيح، وشاشة الربط بتظهر (ومعاها "رجوع")
  function startAdd() { save(); ls.set('rdo_adding', '1'); putSlot({ rdo_fdb: 'rdo-full-' + Math.random().toString(36).slice(2, 8) }); reload(); }
  function cancelAdd() { const L = read(); ls.set('rdo_adding', ''); if (L[cur()]) putSlot(L[cur()]); reload(); }
  const adding = () => ls.get('rdo_adding') === '1' && read().length > 0;
  // بعد ربط ناجح (QR أو الدخول بالحساب): فرع جديد، أو نفس الفرع اتربط تاني
  function onPaired() {
    const L = read(), now = snapNow();
    if (!now.rdo_fdb) { now.rdo_fdb = L.length && !adding() ? (L[cur()] || {}).rdo_fdb || '' : (L.length ? 'rdo-full-' + Math.random().toString(36).slice(2, 8) : ''); ls.set('rdo_fdb', now.rdo_fdb); }
    if (adding()) { L.push({ ...now, name: '' }); ls.set('rdo_cur', String(L.length - 1)); }
    else if (L.length) L[cur()] = { ...L[cur()], ...now };
    else { L.push({ ...now, name: '' }); ls.set('rdo_cur', '0'); }
    ls.set('rdo_adding', ''); write(L); paintBar(); names();
  }
  // الكاشير فصل الموبايل من الفرع ده: يتشال من القايمة، ولو فيه فروع تانية نروح لأولهم
  function onGone() {
    const L = read(), i = cur(); if (L.length) L.splice(i, 1); write(L); ls.set('rdo_cur', '0');
    if (L.length) { putSlot(L[0]); try { native() && native().save({ token: L[0].rdo_token || '' }); } catch (e) {} return true; }
    return false;
  }
  // "شيل الفرع ده من الموبايل" (الربط على السيرفر بيفضل لحد ما الكاشير يفصله، بس الموبايل مابقاش بيستخدمه)
  function removeCurrent() { if (!onGone()) { putSlot({}); } reload(); }
  // الإشعارات: نفس عنوان الموبايل لكل فرع مربوط (كل فرع صف لوحده على السيرفر)
  async function pushAll(gw, value, web) {   // web: اشتراك Web Push (نسخة الآيفون)، value = بصمته
    const L = list(); let ch = false;
    for (let i = 0; i < L.length; i++) {
      if (i === cur() || !L[i].rdo_token || L[i].rdo_push === value) continue;
      const r = await gw({ action: 'push-token', mtoken: L[i].rdo_token, ...(web ? { web } : { push: value }) });
      if (r && r.ok) { L[i].rdo_push = value; ch = true; }
    }
    if (ch) write(L);
  }

  /* ---------- الشريط تحت الراس + "كل الفروع" ---------- */
  function paintBar() {
    const bar = $('#br-bar'); if (!bar) return;
    const L = read(); document.body.classList.toggle('has-br', L.length > 1);
    if (L.length < 2) { bar.hidden = true; bar.innerHTML = ''; return; }
    bar.hidden = false;
    bar.innerHTML = `<button type="button" data-br="all">🏬 كل الفروع</button>` + L.map((x, i) => `<button type="button" data-br="${i}" class="${i === cur() ? 'on' : ''}">${esc(x.name || ('فرع ' + (i + 1)))}</button>`).join('');
    const on = bar.querySelector('.on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {}
  }
  const money = v => (+v || 0).toLocaleString('en-US');
  async function showAll(gw) {
    const L = list(); if (L.length < 2) return;
    Owner.openSheet(`<button class="x" id="ba-x">✕</button><h3>🏬 كل الفروع</h3><div id="ba-body"><div class="sk" style="height:120px;border-radius:16px"></div><div class="sk" style="height:120px;border-radius:16px;margin-top:10px"></div></div>`, $('#br-bar'), { full: true });
    $('#ba-x').onclick = () => Owner.closeSheet();
    const r = await gw({ action: 'snap-sum', mtokens: L.map(x => x.rdo_token) });
    const box = $('#ba-body'); if (!box) return;
    if (!r || r.error || !Array.isArray(r.list)) { box.innerHTML = `<div class="empty">${esc((r && r.error) || 'مفيش نت')}</div>`; return; }
    r.list.forEach((x, i) => { if (x && x.name) setName(i, x.name); });
    const ok = r.list.filter(x => x && !x.gone && !x.expired && !x.empty);
    const sum = k => ok.reduce((a, x) => a + (k(x) || 0), 0), cur0 = (ok[0] && ok[0].currency) || 'ج';
    const ago = at => { if (!at) return ''; const m = Math.round((Date.now() - at) / 60000); return m < 2 ? 'دلوقتي' : m < 60 ? `من ${m} دقيقة` : m < 1440 ? `من ${Math.round(m / 60)} ساعة` : `من ${Math.round(m / 1440)} يوم`; };
    const card = (x, i) => {
      const nm = esc((L[i] && L[i].name) || x.name || ('فرع ' + (i + 1)));
      if (!x || x.gone) return `<div class="card ba-c off"><b>${nm}</b><small>الكاشير فصل الموبايل من الفرع ده</small></div>`;
      if (x.expired) return `<div class="card ba-c off"><b>${nm}</b><small>اشتراك الفرع ده خلص</small></div>`;
      if (x.empty) return `<div class="card ba-c off"><b>${nm}</b><small>الكاشير لسه مابعتش بيانات</small></div>`;
      const c = x.counts || {}, stale = x.at && Date.now() - x.at > 15 * 60000;
      return `<button type="button" class="card ba-c" data-go="${i}"><div class="ba-h"><b>${nm}</b>${x.appr ? `<span class="ba-pill r">🙋 ${x.appr}</span>` : ''}${x.alerts ? `<span class="ba-pill a">⚠ ${x.alerts}</span>` : ''}<small>${stale ? '⏸ الكاشير مقفول · ' : ''}${ago(x.at)}</small></div>
        <div class="ba-n"><span><small>دخل الوردية${x.cur ? ' ' + x.cur.no : ''}</small><b class="g">${money(x.cur && x.cur.total)}</b></span><span><small>في الدرج</small><b>${x.drawer == null ? '—' : money(x.drawer)}</b></span></div>
        <div class="ba-s"><span>📥 ${c.waiting || 0} استلمت</span><span>🛠 ${c.processing || 0} في الصيانة</span><span>✅ ${c.doneToday || 0} خلصوا النهارده</span></div></button>`;
    };
    box.innerHTML = `<div class="card ba-tot"><small>دخل الورديات المفتوحة · ${ok.length} فرع</small><b>${money(sum(x => x.cur && x.cur.total))} ${esc(cur0)}</b>
        <div class="ba-n"><span><small>في الأدراج</small><b>${money(sum(x => x.drawer))}</b></span><span><small>في الصيانة</small><b>${sum(x => x.counts && x.counts.processing)}</b></span><span><small>محتاج منك</small><b class="${sum(x => x.appr) ? 'r' : ''}">${sum(x => x.appr)}</b></span></div></div>
      ${r.list.map(card).join('')}<p class="mut ba-note">دوس على أي فرع تفتحه. كل فرع بأرقامه لوحده (درجه وورديته)، والمجموع فوق للمعلومة بس.</p>`;
    box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const i = +b.dataset.go; Owner.closeSheet(); if (i === cur()) return; switchTo(i); });
  }
  // أسماء الفروع (من الكاشير: الإعدادات ← 🏬 الفروع) لو لسه مش عندنا: أول ما التطبيق يفتح وبعد ربط فرع جديد
  function names() { const L = read(); if (!GW || L.length < 2 || !L.some(x => !x.name)) return; GW({ action: 'snap-sum', mtokens: L.map(x => x.rdo_token) }).then(r => { if (r && Array.isArray(r.list)) r.list.forEach((x, i) => { if (x && x.name) setName(i, x.name); }); }).catch(() => {}); }
  function bind(gw) {
    const bar = $('#br-bar'); if (!bar) return;
    bar.onclick = e => { const b = e.target.closest('[data-br]'); if (!b) return; if (b.dataset.br === 'all') return showAll(gw); switchTo(+b.dataset.br); };
    paintBar();
    GW = gw; names();
  }
  migrate();
  window.Branches = { list, cur, save, switchTo, startAdd, cancelAdd, adding, onPaired, onGone, removeCurrent, pushAll, setName, paintBar, bind, showAll };
})();
