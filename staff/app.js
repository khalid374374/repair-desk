/* تطبيق المندوب — الشاشات (خالد 2026-11-08، الشكل اتوافق عليه). البيانات من الكاشير (link.js: courier-get) بنفس شكل courierSnap في mobile.js:
   { name, shop, shopPhone, at, cash, owe, today: { done, cash }, orders: [out + ready], done: [اللي اتسلّم النهارده + اللي الفلوس لسه معاه] }
   الأزرار بتروح للكاشير كطلب (CourierLink.act) ومفيش حاجة بتتغيّر هنا غير لما الكاشير ينفّذ:
   - "📦 استلمت الطلب من المحل" → out، "✓ اتسلّم" → done، "💵 سلّمت الفلوس للمحل" → hand (الكاشير يعدّ ويدوس اتحصّل)، "⚠ مشكلة" → prob.
   #demo / ?m=demo = بيانات وهمية (demo.js) والأزرار بتتقلّد. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
  const ago = t => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'دلوقتي' : m < 60 ? `من ${m} د` : m < 1440 ? `من ${Math.round(m / 60)} س` : `من ${Math.round(m / 1440)} يوم`; };
  const Q = location.hash + location.search, DEMO = /demo/.test(Q);
  let D = null, tab = 'mine', live = true, liveMsg = '', view = 'orders';   // view: orders (طلبات المندوب) / att (الحضور). الموظف (kind emp) حضور بس
  const pend = {};   // اللي اتبعت للكاشير ولسه مارّدش: { <id أو hand>: act }

  const mine = () => (D.orders || []).slice().sort((a, b) => (a.st === 'out' ? 0 : 1) - (b.st === 'out' ? 0 : 1) || (a.km || 99) - (b.km || 99));
  const done = () => D.done || [];
  const owes = () => done().filter(o => o.owe);
  const handWait = () => !!pend.hand || (owes().length && owes().every(o => o.hand));

  function header() {
    $('#h-name').textContent = 'أهلاً ' + (D.name || '');
    $('#h-sub').textContent = (D.shop || '') + (D.at ? ' · آخر تحديث ' + ago(D.at) : '');
    $('#h-av').textContent = String(D.name || '?').charAt(0);
    const l = $('#h-live'); l.textContent = live ? '● متوصّل' : '● ' + (liveMsg || 'مش متوصّل'); l.classList.toggle('off', !live);
  }
  const isEmp = () => !!(D && D.kind === 'emp');
  // تبويبين للمندوب (حضوري / طلباتي)، والموظف من غير تبويبات (الحضور بس)
  const topTabs = () => isEmp() ? '' : `<div class="vtabs"><button class="${view === 'att' ? 'on' : ''}" data-view="att">📍 حضوري</button><button class="${view === 'orders' ? 'on' : ''}" data-view="orders">🛵 طلباتي <i>${(D.orders || []).length}</i></button></div>`;
  function paint() {
    if (!D) return; header();
    if (isEmp() || view === 'att') { $('#main').innerHTML = topTabs() + (window.Att ? Att.html(D) : ''); return; }
    const M = mine(), Dn = done(), cash = +D.cash || 0, ow = owes();
    const cashCard = `<div class="cash${cash > 0 ? '' : ' zero'}"><small>💵 ${cash > 0 ? 'معاك للمحل' : 'مش معاك فلوس للمحل'}</small><div class="v num">${fmt(cash)}<i>ج</i></div>
      <div class="sub">${cash > 0 ? `من ${ow.length} ${ow.length === 1 ? 'طلب اتسلّم' : 'طلبات اتسلّمت'} · سلّمها للمحل وهو يعدّها` : `النهارده: ${(D.today || {}).done || 0} طلب${(D.today || {}).cash ? `، حصّلت ${fmt(D.today.cash)} ج وسلّمتهم ✓` : ''}`}</div>
      ${cash > 0 ? (handWait() ? `<div class="wait" style="background:#ffffff26;color:#fff"><span class="spin"></span> مستني الكاشير يعدّ ويأكد</div>` : `<button class="hand" data-hand="1">💵 سلّمت الفلوس للمحل</button>`) : ''}</div>`;
    const seg = `<div class="seg"><button class="${tab === 'mine' ? 'on' : ''}" data-tab="mine">🛵 طلباتي <i>${M.length}</i></button><button class="${tab === 'done' ? 'on' : ''}" data-tab="done">✓ خلصت النهارده <i>${Dn.length}</i></button></div>`;
    let list;
    if (D.empty) list = '<div class="empty"><div class="e">⏳</div>المحل لسه مابعتش طلبات.<br>أول ما الكاشير يتفتح هتظهر هنا.</div>';
    else if (tab === 'mine') list = M.length ? `<div class="route">${M.map((o, i) => card(o, i + 1)).join('')}</div>` : '<div class="empty"><div class="e">🎉</div>مفيش طلبات معاك دلوقتي<br>أول ما المحل يجهّز طلب للتوصيل هيظهر هنا</div>';
    else list = Dn.length ? `<div class="route done-l">${Dn.map(o => `<div class="ord"><span class="stop">✓</span><div class="oc"><div class="oh"><span class="no num">W-${o.no}${o.doneAt ? ' · ' + ago(o.doneAt) : ''}</span><span class="chip done">${o.owe ? (o.hand ? '⏳ مستني الكاشير' : '💵 معاك') : o.pay === 'cash' ? '✓ اتحاسبت' : '✓ مدفوع'}</span></div><div class="mini" style="margin-top:6px"><span><b>${esc(o.cust.name)}</b> · ${esc(o.items)}</span><b class="num">${fmt(o.total)}</b></div></div></div>`).join('')}</div>` : '<div class="empty">لسه مفيش</div>';
    $('#main').innerHTML = topTabs() + cashCard + seg + list + (D.shopPhone ? `<div class="foot">مشكلة؟ <button data-call="${esc(D.shopPhone)}">📞 كلّم المحل</button></div>` : '');
  }
  function card(o, n) {
    const [cls, label] = o.st === 'out' ? ['out', '🛵 معاك في السكة'] : o.kind === 'repair' ? ['rep', '🛠 ناخد جهاز من البيت'] : ['ready', 'جاهز في المحل'];
    const money = o.kind === 'repair' ? '<div class="money zero"><span>من غير فلوس دلوقتي</span><span>الحساب في المحل</span></div>'
      : o.paid || o.pay !== 'cash' ? `<div class="money paid"><span>✓ ${o.paid ? 'مدفوع' : 'هيدفع'} ${o.pay === 'insta' ? 'انستا' : o.pay === 'card' ? 'فيزا' : ''}</span><span>${o.paid ? 'ماتاخدش فلوس' : 'اتأكد من المحل'}</span></div>`
      : `<div class="money cash1"><span>💵 حصّل من العميل</span><b class="num">${fmt(o.total)}</b></div>`;
    const go = pend[o.id] ? `<div class="wait" style="flex:1;margin:0"><span class="spin"></span> اتبعت للمحل…</div>`
      : o.st === 'ready' ? `<button class="go pick" data-act="out" data-id="${esc(o.id)}">📦 ${o.kind === 'repair' ? 'رايح أجيبه' : 'استلمت الطلب'}</button>`
      : `<button class="go ok" data-act="done" data-id="${esc(o.id)}">✓ اتسلّم</button>`;
    const map = o.cust.lat != null && o.cust.lng != null;
    return `<div class="ord ${o.st}"><span class="stop num">${n}</span><div class="oc">
      <div class="oh"><span class="no num">W-${o.no}${o.at ? ' · ' + ago(o.at) : ''}</span><span class="chip ${cls}">${label}</span></div>
      <div class="cn">${esc(o.cust.name) || '—'}</div>
      ${o.cust.addr || o.km ? `<div class="ad"><span>📍</span><span><b>${esc(o.cust.addr)}</b>${o.km ? ` <span class="km num">· ${o.km} كم</span>` : ''}</span></div>` : ''}
      ${o.items ? `<div class="it">${esc(o.items)}</div>` : ''}${o.cust.note ? `<div class="note">📝 ${esc(o.cust.note)}</div>` : ''}${o.prob ? `<div class="note">⚠ اتبعت للمحل: ${esc(o.prob)}</div>` : ''}
      ${money}
      <div class="acts">${map || o.cust.addr ? `<button class="ic" data-map="${esc(o.id)}" title="الخريطة" aria-label="افتح الخريطة">🗺</button>` : ''}${o.cust.phone ? `<button class="ic" data-call="${esc(o.cust.phone)}" title="اتصل" aria-label="اتصل بالعميل">📞</button><button class="ic wa" data-wa="${esc(o.cust.phone)}" title="واتساب" aria-label="واتساب العميل">💬</button>` : ''}${go}</div>
      ${o.st === 'out' ? `<button class="prob-l" data-prob="${esc(o.id)}">⚠ فيه مشكلة في الطلب ده؟</button>` : ''}
    </div></div>`;
  }
  /* ---------- النوافذ ---------- */
  const sheet = html => { $('#sheet').innerHTML = html; $('#sheet').hidden = false; $('#sheet-bg').hidden = false; };
  const close = () => { $('#sheet').hidden = true; $('#sheet-bg').hidden = true; };
  const byId = id => (D.orders || []).find(x => x.id === id);
  function askDone(o) {
    sheet(`<h3>✓ اتسلّم لـ ${esc(o.cust.name)}؟</h3><div class="lbl num">W-${o.no} · ${esc(o.items)}</div>
      ${o.pay === 'cash' && !o.paid && o.kind !== 'repair' ? `<div class="bigq"><small>خدت من العميل</small><b class="num">${fmt(o.total)}</b> <small>ج كاش</small></div>` : `<div class="bigq g"><small>${o.kind === 'repair' ? 'الحساب في المحل' : 'مدفوع قبل كده'}</small><b>✓</b><small>ماتاخدش فلوس</small></div>`}
      <button class="btn ok" data-yes="${esc(o.id)}">✓ ${o.pay === 'cash' && !o.paid && o.kind !== 'repair' ? 'أيوه، سلّمته وخدت الفلوس' : 'أيوه، سلّمته'}</button>
      <button class="btn ghost" data-prob="${esc(o.id)}">⚠ فيه مشكلة (العميل مش موجود / مش عايزه)</button>`);
  }
  function askHand() {
    const L = owes();
    sheet(`<h3>💵 سلّمت الفلوس للمحل</h3><div class="lbl">الكاشير هيعدّها ويأكد، وبعدها تتشال من عليك</div>
      <div class="bigq"><small>المفروض معاك</small><b class="num">${fmt(D.cash)}</b> <small>ج</small></div>
      ${L.map(o => `<div class="mini" style="padding:6px 2px;border-bottom:1px solid var(--line)"><span class="num">W-${o.no} · ${esc(o.cust.name)}</span><b class="num">${fmt(o.total)}</b></div>`).join('')}
      <button class="btn ok" data-handyes="1" style="margin-top:14px">✓ سلّمتهم للكاشير</button><button class="btn ghost" data-x="1">لسه</button>`);
  }
  function problem(o) {
    sheet(`<h3>⚠ مشكلة في W-${o.no}</h3><div class="lbl">هتتبعت للمحل علطول، وهو يقرر</div>
      <div class="prob"><button data-pr="العميل مش بيرد / مش موجود" data-pid="${esc(o.id)}">📵 العميل مش بيرد / مش موجود</button><button data-pr="العميل مش عايز الطلب" data-pid="${esc(o.id)}">🙅 العميل مش عايز الطلب</button><button data-pr="العنوان غلط" data-pid="${esc(o.id)}">📍 العنوان غلط</button><button data-pr="عايزه في ميعاد تاني" data-pid="${esc(o.id)}">🕘 عايزه في ميعاد تاني</button></div>
      ${D.shopPhone ? `<button class="btn ghost" data-call="${esc(D.shopPhone)}">📞 كلّم المحل</button>` : ''}`);
  }
  const toast = (t, bad) => { const e = document.createElement('div'); e.className = 'toast' + (bad ? ' bad' : ''); e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 2600); };
  const MSG = { out: '✓ المحل عرف إنك خدت الطلب', done: '✓ اتسجل إنه اتسلّم', hand: '✓ الكاشير عرف إنك سلّمت الفلوس', prob: '⚠ اتبعت للمحل' };
  async function send(a, id, why) {
    const k = a === 'hand' ? 'hand' : id; pend[k] = a; paint();
    if (DEMO) { setTimeout(() => demoApply(a, id, why), window.__fast ? 50 : 1200); return; }
    const r = await window.CourierLink.act(a, id, why);
    if (r.error) { delete pend[k]; paint(); toast('⚠ ' + r.error, true); }
  }
  // رد الكاشير (link.js): اتنفّذ = رسالة، اترفض = السبب
  function onDone(p, err) { delete pend[p.act === 'hand' ? 'hand' : p.oid]; if (err) toast('⚠ ' + err, true); else toast(MSG[p.act] || '✓'); paint(); }
  function demoApply(a, id, why) {
    const o = byId(id);
    if (a === 'out' && o) o.st = 'out';
    if (a === 'done' && o) { D.orders = D.orders.filter(x => x !== o); const owe = o.pay === 'cash' && !o.paid && o.kind !== 'repair'; D.done.unshift({ ...o, st: 'done', doneAt: Date.now(), owe }); if (owe) D.cash += o.total; D.today.done++; }
    if (a === 'hand') D.done.forEach(x => { if (x.owe) x.hand = Date.now(); });
    if (a === 'prob' && o) o.prob = why;
    onDone({ act: a, oid: id }, null);
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) { if (e.target.id === 'sheet-bg') close(); return; }
    if (t.dataset.tab) { tab = t.dataset.tab; return paint(); }
    if (t.dataset.view) { view = t.dataset.view; if (view === 'att' && window.Att) Att.refreshHere(); return paint(); }
    if (t.dataset.map) { const o = byId(t.dataset.map); if (!o) return; location.href = o.cust.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${o.cust.lat},${o.cust.lng}&travelmode=driving` : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.cust.addr); return; }
    if (t.dataset.call) { location.href = 'tel:' + String(t.dataset.call).replace(/[^\d+]/g, ''); return; }
    if (t.dataset.wa) { let d = String(t.dataset.wa).replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = '20' + d.slice(1); location.href = 'https://wa.me/' + d; return; }
    if (t.dataset.act === 'out') return send('out', t.dataset.id);
    if (t.dataset.act === 'done') { const o = byId(t.dataset.id); return o && askDone(o); }
    if (t.dataset.yes) { close(); return send('done', t.dataset.yes); }
    if (t.dataset.prob) { const o = byId(t.dataset.prob); return o && problem(o); }
    if (t.dataset.pr) { close(); return send('prob', t.dataset.pid, t.dataset.pr); }
    if (t.dataset.hand) return askHand();
    if (t.dataset.handyes) { close(); return send('hand', ''); }
    if (t.dataset.x) return close();
  });
  $('#sheet-bg').onclick = close;
  // زرار الرجوع بتاع أندرويد: يقفل النافذة الأول
  try { const AppP = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App; if (AppP) AppP.addListener('backButton', () => { if (!$('#sheet').hidden) close(); else if (tab !== 'mine') { tab = 'mine'; paint(); } else if (!isEmp() && view === 'att') { view = 'orders'; paint(); } else AppP.minimizeApp && AppP.minimizeApp(); }); } catch (e) {}

  if (/light/.test(Q) || (!/dark/.test(Q) && matchMedia('(prefers-color-scheme: light)').matches)) { document.body.classList.add('light'); document.documentElement.classList.add('light'); }
  window.Courier = {
    load: d => { const first = !D || D.kind !== d.kind; D = d; if (!D.orders) D.orders = []; if (!D.done) D.done = []; if (!D.today) D.today = { done: 0, cash: 0 }; if (first && D.kind === 'emp') view = 'att'; paint(); if (first && window.Att) Att.refreshHere(true); },   // pend بيتشال من رد الكاشير بس (onDone)
    setLive: (on, msg) => { live = on; liveMsg = msg || ''; if (D) header(); },
    skeleton: name => { D = { name: name || '', orders: [], done: [], cash: 0, today: { done: 0, cash: 0 }, at: 0 }; header(); $('#main').innerHTML = '<div class="cash zero sk"></div><div class="seg sk" style="height:46px"></div><div class="oc sk" style="height:220px"></div><div class="oc sk" style="height:220px"></div>'; },
    reset: () => { D = null; $('#main').innerHTML = ''; },
    done: onDone, attDone: (p, err, res) => window.Att && Att.done(p, err, res),
    showUpdate: j => { if ($('#h-upd')) return; const b = document.createElement('button'); b.id = 'h-upd'; b.className = 'upd'; b.textContent = '⬆ تحديث ' + j.version; b.onclick = () => { location.href = j.url; }; $('.top-r').prepend(b); },
    paint, askDone: id => askDone(byId(id)), askHand, problem: id => problem(byId(id)), data: () => D,
  };
  if (DEMO && window.DEMO) Courier.load(JSON.parse(JSON.stringify(/emp/.test(Q) && window.DEMO_EMP ? window.DEMO_EMP : window.DEMO)));
})();
