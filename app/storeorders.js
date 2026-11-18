/* طلبات المتجر على موبايل صاحب المحل (خالد 2026-11-08): كارت في الرئيسية بالجديد والفلوس اللي مع المناديب، وليستة بالطلبات،
   وكل طلب ليه نفس زراير الكاشير (أكّد / جاهز / سلّم للمندوب / اتسلّم / اتحصّل / وصلت انستا / الغي / رجوع). الموبايل بيبعت طلب
   (op store) والكاشير بينفّذه بنفس الحسابات (store.js) ويرد — زي الاستلام والفاتورة من الموبايل. */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
  const ST = { new: 'جديد', ok: 'اتأكد', prep: 'بيتجهز', ready: 'جاهز', out: 'مع المندوب', done: 'اتسلّم', paid: 'خلص', cancel: 'اتلغى', ret: 'مرتجع' };
  const KIND = { order: '🛒', bill: '🧾', repair: '🛠', wish: '🤔' };
  const COL = o => o.status === 'new' ? 'new' : ['ok', 'prep'].includes(o.status) ? 'prep' : o.status === 'ready' ? 'ready' : o.status === 'out' || (o.status === 'done' && o.owes) ? 'out' : 'end';
  const COLC = { new: '#d6455f', prep: '#2b7be0', ready: '#8a5bd8', out: '#f59e0b', end: '#17904f' };
  const sent = window.__stoSent = window.__stoSent || {};   // اللي اتبعت وماوصلش رده: بيستخبى زراره لحد الملخص الجاي
  // المتجر الكامل المتشفّر (fulldata.js: طلبات آخر 30 يوم) لو موجود، وإلا اللي في الملخص
  const S = () => { const f = window.Owner && Owner.full && Owner.full(); return (f && f.store) || ((window.Owner && Owner.data()) || {}).store || null; };
  const ago = t => { const m = Math.round((Date.now() - Date.parse(t)) / 60000); return m < 1 ? 'دلوقتي' : m < 60 ? `من ${m} د` : m < 1440 ? `من ${Math.round(m / 60)} س` : `من ${Math.round(m / 1440)} يوم`; };
  function acts(o) {
    const a = [], pick = o.pick, instaWait = o.pay === 'insta' && o.ps !== 'paid' && !['cancel', 'ret'].includes(o.status);
    if (o.kind === 'wish') { if (o.status === 'new') a.push(['ok', '🔍 بندوّرله']); if (['new', 'ok'].includes(o.status)) a.push(['done', '✓ لقيناه', 1]); }
    else if (o.kind === 'bill') { if (!o.t.amt && !['cancel', 'done'].includes(o.status)) a.push(['billamt', '✍️ اكتب المبلغ', 1]); else if (instaWait) a.push(['insta', '⚡ وصلت الفلوس', 1]); else if (!['done', 'cancel'].includes(o.status)) a.push(['done', '✓ اتدفعت', 1]); }
    else if (o.kind === 'repair') { if (o.status === 'new') a.push(['ok', '✓ أكّد الميعاد', 1]); if (['ok', 'out', 'prep', 'ready'].includes(o.status)) a.push(['done', '✓ خلص', 1]); }
    else {
      if (instaWait) a.push(['insta', '⚡ وصلت الفلوس', o.status !== 'new']);
      if (o.status === 'new') a.push(['ok', '✓ أكّد', 1]);
      if (o.status === 'ok') a.push(['prep', '📦 بيتجهز', 1]);
      if (o.status === 'ok' || o.status === 'prep') a.push(['ready', 'جاهز ←', o.status === 'prep']);
      if (o.status === 'ready') a.push(pick ? ['done', '✓ استلم من المحل', 1] : ['out', '🛵 سلّم للمندوب', 1]);
      if (o.status === 'out') a.push(['done', '✓ اتسلّم', 1]);
      if (o.owes && ['done', 'out'].includes(o.status)) a.push(['paid', '💵 اتحصّل', o.status === 'done']);
    }
    if (['new', 'ok', 'prep', 'ready', 'out'].includes(o.status)) a.push(['cancel', '✕ الغي']);
    if (o.undo) a.push(['undo', '↩ رجوع (آخر خطوة)']);
    return a;
  }
  const what = o => o.kind === 'order' ? o.items.map(x => esc(x[0]) + (x[1] > 1 ? ' ×' + x[1] : '')).join('، ') : o.kind === 'bill' ? '🧾 ' + esc(o.info.svcN) : o.kind === 'repair' ? '🛠 ' + esc(o.info.dev) + ((o.info.prob || []).length ? ' · ' + esc(o.info.prob.join('، ')) : '') : '🤔 ' + esc(o.info.text);
  function row(o) {
    return `<button class="so-r" data-so="${esc(o.id)}" style="--c:${COLC[COL(o)]}"><span class="so-k">${KIND[o.kind] || '🛒'}</span><span class="so-m"><b><span class="num">W-${o.no}</span> · ${esc(o.name)}</b><small>${what(o)}</small></span>
      <span class="so-e"><b class="num">${o.t.total ? fmt(o.t.total) : ''}</b><small class="so-st">${sent[o.id] ? '⏳' : esc(ST[o.status] || o.status)}</small></span></button>`;
  }
  // الكارت في الرئيسية
  function card() {
    const s = S(); if (!s || !s.orders) return '';
    const c = s.counts || {}, open = s.orders.filter(o => COL(o) !== 'end');
    if (!open.length && !c.new) return '';
    return `<div class="card so-card"><div class="lbl">🛒 طلبات المتجر${c.new ? ` <i class="so-n">${c.new} جديد</i>` : ''}</div>
      <div class="so-kp"><span><b class="num">${c.open || 0}</b><small>شغالين</small></span><span><b class="num o">${fmt(c.courierCash || 0)}</b><small>مع المناديب</small></span><span><b class="num">${c.instaWait || 0}</b><small>انستا مستنية</small></span></div>
      ${open.slice(0, 4).map(row).join('')}${open.length > 4 ? `<button class="so-all" data-so-all>كل الطلبات (${open.length}) ←</button>` : ''}</div>`;
  }
  function listSheet() {
    const s = S(); if (!s) return;
    const groups = [['new', '🆕 جديدة'], ['prep', '📦 بيتجهز'], ['ready', '✅ جاهز'], ['out', '🛵 مع المندوب'], ['end', '💰 خلص']];
    Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>🛒 طلبات المتجر</h3>${groups.map(([k, n]) => { const l = s.orders.filter(o => COL(o) === k); return l.length ? `<div class="lbl so-gh">${n} (${l.length})</div>${l.map(row).join('')}` : ''; }).join('') || '<div class="lbl">مفيش طلبات</div>'}`);
  }
  function detail(o) {
    const geo = o.lat != null ? `https://www.google.com/maps?q=${o.lat},${o.lng}` : '';
    const lines = o.kind === 'order' ? o.items.map(x => `<div class="row"><span>${esc(x[0])}${x[1] > 1 ? ' ×' + x[1] : ''}</span><b>${fmt(x[1] * x[2])}</b></div>`).join('') : '';
    const t = o.t || {};
    Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>${KIND[o.kind] || '🛒'} <span class="num">W-${o.no}</span> · ${esc(ST[o.status] || o.status)}</h3><div class="lbl">${esc(o.name)} · ${ago(o.at)}</div>
      <div class="card" style="margin-top:12px">${lines}
        ${o.kind === 'bill' ? `<div class="row"><span>🧾 ${esc(o.info.svcN)}</span><b class="num">${esc(o.info.acct || '')}</b></div>${t.amt ? `<div class="row"><span>المبلغ + العمولة</span><b>${fmt(t.amt)} + ${fmt(t.fee)}</b></div>` : ''}` : ''}
        ${o.kind === 'repair' ? `<div class="row"><span>🛠 ${esc(o.info.dev)}</span><b class="tx">${esc((o.info.prob || []).join('، '))}</b></div><div class="row"><span>الطريقة</span><b class="tx">${{ home: 'ناخده من البيت', shop: 'هيجيبه المحل', ask: 'استشارة' }[o.info.mode] || ''}</b></div>` : ''}
        ${o.kind === 'wish' ? `<div class="row"><span>🤔 بيدوّر على</span><b class="tx">${esc(o.info.text)}</b></div>` : ''}
        ${t.del != null && o.kind === 'order' ? `<div class="row"><span>🚚 التوصيل${t.km != null ? ' (' + t.km + ' كم)' : ''}</span><b>${o.pick ? 'من المحل' : t.del ? fmt(t.del) : 'ببلاش'}</b></div>` : ''}
        ${t.disc ? `<div class="row"><span>🏷 خصم</span><b class="g">− ${fmt(t.disc)}</b></div>` : ''}
        ${t.total ? `<div class="row"><span>💰 الإجمالي</span><b>${fmt(t.total)}</b></div>` : ''}
        <div class="row"><span>💳 الدفع</span><b class="tx">${{ cash: '💵 كاش', insta: '⚡ انستا', card: '💳 فيزا' }[o.pay] || ''}${o.ps === 'paid' ? ' ✓' : ''}${o.owes ? ' · مع ' + esc(o.courier) : ''}</b></div>
        ${o.addr && !o.pick ? `<div class="row"><span>📍 العنوان</span><b class="tx">${esc(o.addr)}</b></div>` : ''}
        ${o.phone ? `<div class="call2"><button class="act" data-call="${esc(o.phone)}">📞 اتصل</button><button class="act wa" data-wa2="${esc(o.phone)}">💬 واتساب</button>${geo ? `<button class="act" data-geo="${esc(geo)}">🗺 المكان</button>` : ''}</div>` : ''}
      </div>
      <div id="so-form"></div>
      ${sent[o.id] ? '<div class="pend"><span>⏳</span><b>مستني الكاشير</b></div>' : `<div class="acts so-acts">${acts(o).map(([a, l, main]) => `<button class="act ${main ? 'go' : a === 'cancel' ? 'no' : ''}" data-sa="${a}" data-sid="${esc(o.id)}">${l}</button>`).join('')}</div>`}`);
  }
  async function send(o, act, extra, btn) {
    if (btn) btn.disabled = true;
    const r = await OwnerLink.submit({ kind: 'store', id: o.id, act, ...(extra || {}) }, `W-${o.no}: ${act}`);
    if (btn) btn.disabled = false;
    if (r.error) return Owner.toast(r.error, true);
    sent[o.id] = Date.now(); Owner.closeSheet(); Owner.toast('📤 اتبعت للكاشير'); Owner.repaint();
  }
  function form(o, act) {
    const box = document.getElementById('so-form'); if (!box) return;
    const s = S() || {};
    if (act === 'out') box.innerHTML = `<div class="card fm"><div class="lbl">🛵 مين المندوب؟</div><div class="so-chips">${(s.couriers || []).map(n => `<button class="act" data-cour="${esc(n)}">🛵 ${esc(n)}</button>`).join('')}</div><label>أو اكتب الاسم<input id="so-cn" maxlength="30"></label><button class="add-btn" id="so-go">سلّم للمندوب</button></div>`;
    if (act === 'cancel') box.innerHTML = `<div class="card fm"><label>سبب الإلغاء<input id="so-rs" maxlength="160" placeholder="مثلًا: العميل مش بيرد"></label><button class="add-btn no" id="so-go">✕ الغي الطلب</button></div>`;
    if (act === 'billamt') box.innerHTML = `<div class="card fm"><label>مبلغ الفاتورة بعد الاستعلام<input id="so-am" type="number" inputmode="decimal" min="1"></label><button class="add-btn" id="so-go">ابعت</button></div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    box.querySelectorAll('[data-cour]').forEach(b => { b.onclick = () => send(o, 'out', { courier: b.dataset.cour }, b); });
    const go = document.getElementById('so-go');
    if (go) go.onclick = () => {
      if (act === 'out') { const v = document.getElementById('so-cn').value.trim(); if (!v) return Owner.toast('اختار المندوب', true); send(o, 'out', { courier: v }, go); }
      if (act === 'cancel') { const v = document.getElementById('so-rs').value.trim(); if (!v) return Owner.toast('اكتب السبب', true); send(o, 'cancel', { reason: v }, go); }
      if (act === 'billamt') { const v = +document.getElementById('so-am').value; if (!(v > 0)) return Owner.toast('اكتب المبلغ', true); send(o, 'billamt', { amt: v }, go); }
    };
  }
  document.addEventListener('click', e => {
    const s = S(); if (!s) return;
    const r = e.target.closest('[data-so]'); if (r) { const o = s.orders.find(x => x.id === r.dataset.so); if (o) detail(o); return; }
    if (e.target.closest('[data-so-all]')) return listSheet();
    const g = e.target.closest('[data-geo]'); if (g) { location.href = g.dataset.geo; return; }
    const b = e.target.closest('[data-sa]'); if (b) { const o = s.orders.find(x => x.id === b.dataset.sid); if (!o) return; const a = b.dataset.sa; if (['out', 'cancel', 'billamt'].includes(a)) return form(o, a); return send(o, a, {}, b); }
  });
  // الطلب اللي اتنفّذ: الملخص الجاي بيجيب الحالة الجديدة، فنشيل علامة "مستني"
  window.addEventListener('owner:data', () => { for (const k of Object.keys(sent)) if (Date.now() - sent[k] > 15000) delete sent[k]; });
  window.OwnerStore = { card, listSheet, row, COL, S };
})();
