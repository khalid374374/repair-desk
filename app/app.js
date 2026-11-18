/* تطبيق صاحب المحل: 4 شاشات (الرئيسية / الوردية / الصيانة / التقارير)، قراية بس.
   الحركة: Shimmer وقت التحميل، الصفحة بتدخل من ناحية التبويب، الأرقام بتعدّ، وتفاصيل التذكرة بتكبر من الكارت (Hero) وترجعله.
   زرار الرجوع في الموبايل بيقفل التفاصيل (history). البيانات من الكاشير عن طريق link.js (Owner.load)، و#demo = data.js. */
(function () {
  const $ = s => document.querySelector(s);
  const ORDER = ['home', 'shift', 'repair', 'store', 'stock', 'reports'];
  const TITLES = { home: 'الرئيسية', shift: 'الوردية', repair: 'الصيانة', store: 'المتجر', stock: 'المخزن', reports: 'التقارير' };
  let D = null, cur = 'home', repairTab = 'processing';
  let repKind = 'repair', repSel = '';   // التقارير الكاملة: الصيانة / الإكسسوار، والشهر المختار
  let FULL = null, FULLST = '', shiftTab = 'now', monthSel = '', pplTab = 'cust', pplQ = '', payM = '';   // الناس: العملا / الموظفين   // monthSel: الشهر المختار في تبويب الشهر   // البيانات الكاملة من الكاشير (fulldata.js) وتبويب الوردية (فكرة 1: دلوقتي / الورديات / الشهر / الناس)
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
  const money = n => (n < 0 ? '−' : '') + fmt(Math.abs(n));
  // {..} جوه النص = رقم ملوّن (من التنبيهات)
  const rich = (t, lvl) => esc(t).replace(/\{(.+?)\}/g, `<b class="${lvl || ''} num">$1</b>`);
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'دلوقتي' : m === 1 ? 'من دقيقة' : m < 60 ? `من ${m} دقيقة` : `من ${Math.round(m / 60)} ساعة`; };
  const count = (v, cls) => `<span class="cnt ${cls || ''}" data-to="${Math.round(v)}">0</span>`;

  /* ---------- الشاشات ---------- */
  // مقارنة (خالد 2026-11-07): ▲ أخضر لو زاد، ▼ أحمر لو قل، ومن غير حاجة لو مفيش رقم قبله
  const cmpChip = (a, b, label) => { if (!(b > 0)) return ''; const p = Math.round((a - b) / b * 100); return `<span class="cmp ${p > 0 ? 'up' : p < 0 ? 'down' : ''}">${p > 0 ? '▲' : p < 0 ? '▼' : '='} ${Math.abs(p)}% ${esc(label)}</span>`; };
  const todayVsYday = () => (D.week && D.week.length > 1 ? cmpChip(D.week[D.week.length - 1].v, D.week[D.week.length - 2].v, 'عن امبارح') : '');
  function home() {
    const t = D.today, c = D.counts;
    const dr = D.drawer;
    // طلبات الموظفين (approvals.js على الكاشير): وافق / ارفض. اللي اتبعت قراره بيستخبى لحد الملخص الجاي
    const apr = (D.approvals || []).filter(a => !(window.__aprSent || {})[a.id]);
    const aprCard = apr.length ? `<div class="card apr"><div class="lbl">🙋 طلبات الموظفين (${apr.length})</div>${apr.map(a => `<div class="apr-r"><div><b>${esc(a.kindName)} — ${esc(a.by)}</b><small>${esc(a.title)}</small></div>
      <div class="apr-b"><button class="ok" data-apr="${esc(a.id)}">✓ وافق</button><button class="no" data-apn="${esc(a.id)}">✕</button></div></div>`).join('')}</div>` : '';
    // تحويلات على تليفون المحافظ ماتسجلتش (watcher.js على الكاشير): سجّلها / اتسجلت / تجاهل — زي الكاشير (خالد 2026-10-30)
    const wl = (D.watch || []).filter(w => !(window.__waSent || {})[w.id]);
    const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'دلوقتي' : m < 60 ? `من ${m} دقيقة` : m < 1440 ? `من ${Math.round(m / 60)} ساعة` : `من ${Math.round(m / 1440)} يوم`; };
    const waCard = wl.length ? `<div class="card apr wa"><div class="lbl">📲 تحويلات ماتسجلتش (${wl.length})</div>${wl.map(w => `<div class="apr-r col"><div><b>${w.dir === 'in' ? '📥 دخل' : '📤 خرج'} ${fmt(w.amt)} — ${esc(w.name)}${w.line4 ? ` <bdi dir="ltr" class="num lbl">…${esc(w.line4)}</bdi>` : ''}</b>
        <small>${w.status === 'diff' ? '⚠ اتسجل بمبلغ تاني' : 'مش في الوردية'} · ${ago(w.at)}${w.who ? ' · ' + esc(w.who) : ''}</small></div>
      <div class="apr-b">${w.status === 'missing' ? `<button class="ok" data-wa="record" data-wid="${esc(w.id)}">➕ سجّلها</button>` : ''}<button class="ok2" data-wa="done" data-wid="${esc(w.id)}">✓ اتسجلت</button><button class="no" data-wa="ignore" data-wid="${esc(w.id)}">تجاهل</button></div></div>`).join('')}</div>` : '';
    const X = window.OwnerExtras;
    return aprCard + waCard + (window.OwnerStore ? OwnerStore.card() : '') + (X ? X.todayCard() : '') + `<div class="card"><div class="lbl">💵 في الدرج دلوقتي (تقريبي)</div>${dr ? `<div class="big">${count(dr.now)}</div><div class="lbl">وردية ${dr.shiftNo} · مفتوحة من ${esc(D.cur && D.cur.from ? D.cur.from : dr.openedAt)}${dr.by ? ' · ' + esc(dr.by) : ''}</div>` : '<div class="empty" style="padding:12px 0">مفيش وردية مفتوحة</div>'}</div>
      ${D.cur ? `<div class="card"><div class="lbl">💰 دخل الوردية ${D.cur.no}${D.cur.from ? ' · من ' + esc(D.cur.from) : ''}</div><div class="big g">${count(D.cur.total)}</div>${todayVsYday() ? `<div class="lbl">مكسب النهاردة ${todayVsYday()}</div>` : ''}
        <div class="row"><span>🛠 صافي الصيانة${D.cur.repairN ? ` <small class="lbl">(${D.cur.repairN} جهاز)</small>` : ''}</span><b>${fmt(D.cur.repairNet)}</b></div>
        <div class="row"><span>🎧 مبيعات الإكسسوار${D.cur.accN ? ` <small class="lbl">(${D.cur.accN} فاتورة)</small>` : ''}</span><b>${fmt(D.cur.accSales)}</b></div>
        <div class="row"><span>🔁 عمولات التحويل والكارت</span><b>${fmt(D.cur.fees)}</b></div>
        <div class="lbl" style="margin-top:6px">المكسب الحقيقي في التقارير 📊</div></div>`
      : `<div class="card"><div class="lbl">💰 مكسب النهاردة لحد دلوقتي ${todayVsYday()}</div><div class="big g">${count(t.profit)}</div>
        <div class="row"><span>🔁 عمولات التحويل والكارت</span><b>${fmt(t.fees)}</b></div><div class="row"><span>🛠 صافي الصيانة</span><b>${fmt(t.repairNet)}</b></div><div class="row"><span>🎧 إكسسوار</span><b>${fmt(t.acc)}</b></div></div>`}
      <div class="grid3"><button class="mini" data-go="repair" data-rt="waiting"><b>${c.waiting}</b><span>استلمت</span></button><button class="mini" data-go="repair" data-rt="processing"><b>${c.processing}</b><span>في الصيانة</span></button><button class="mini" data-go="repair" data-rt="done"><b class="g">${c.doneToday}</b><span>اتسلّم النهاردة</span></button></div>
      ${D.alerts.length ? `<div class="card"><div class="lbl">🔔 محتاج تاخد بالك</div>${D.alerts.map(a => `<div class="al"><i>${a.icon}</i><div>${rich(a.text, a.lvl)}${a.sub ? `<small>${esc(a.sub)}</small>` : ''}</div></div>`).join('')}</div>` : ''}`;
  }
  /* ---------- الوردية كاملة (خالد 2026-11-14، فكرة 1): نفس أرقام شاشة الكاشير بالظبط (shift.state كصاحب المحل، متشفّرة من الكاشير) ---------- */
  const SH_KIND = { out: ['➖', 'سحب'], loan: ['📝', 'ملاحظة (على حد)'], in: ['➕', 'إضافة'], credit: ['🧾', 'على الحساب'], xfer: ['🔁', 'تحويل'], devbuy: ['📱', 'شراء جهاز'], devsell: ['📱', 'بيع جهاز'], devret: ['↩', 'مرتجع جهاز'], acc: ['🎧', 'إكسسوار اتنسى'], found: ['💰', 'لقينا فلوس'], card: ['💳', 'سحب من الكارت'], bill: ['🧾', 'دفع فاتورة'], rep: ['🏢', 'المندوب'] };
  const SH_OUT = { out: 1, loan: 1, devbuy: 1, devret: 1 };
  const SH_GROUPS = [['out', '➖', 'السحب'], ['loan', '📝', 'الملاحظات على حد'], ['credit', '🧾', 'على الحساب'], ['in', '➕', 'الإضافات'], ['xfer', '🔁', 'التحويلات'], ['rep', '🏢', 'المندوب']];
  const shKind = e => e.kind === 'xfer' ? (e.dir === 'recv' ? ['📥', 'سحب من محفظة'] : ['📤', 'إيداع / تحويل']) : e.kind === 'rep' ? (e.dir === 'in' ? ['📥', 'رصيد من المندوب'] : ['💸', 'للمندوب']) : SH_KIND[e.kind] || ['•', e.kind];
  const hm = t => { try { return new Date(t).toLocaleTimeString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  const shGroups = es => { const known = SH_GROUPS.map(g => g[0]); return [...SH_GROUPS.map(([k, ic, t]) => [k, ic, t, es.filter(e => e.kind === k)]), ['etc', '📦', 'حركات تانية', es.filter(e => !known.includes(e.kind))]].filter(g => g[3].length); };
  const entryOut = e => (e.kind === 'rep' ? e.dir === 'out' : SH_OUT[e.kind] || (e.kind === 'found' && e.amt < 0));
  function shiftNow(F) {
    const s = F.shift; if (!s) return '<div class="card"><div class="empty">مفيش وردية مفتوحة على الكاشير</div></div>';
    const who = s.holder || s.who || '';
    const drawer = `<div class="card"><div class="sh-h"><div class="lbl">💵 في الدرج لحد دلوقتي <small>تقريبي</small></div><small>وردية ${s.no}${who ? ' · ' + esc(who) : ''} · من ${hm(s.openedAt)}</small></div>
      <div class="big">${count(s.cashNow)}</div>
      <div class="row"><span>نقدي أول الوردية</span><b>${money(s.openCash)}</b></div>${s.feesCash ? `<div class="row"><span>🔁 عمولات دخلت الدرج</span><b class="g">+${fmt(s.feesCash)}</b></div>` : ''}</div>`;
    const bals = (s.bal || []).length ? `<div class="card"><div class="lbl">💳 الأرصدة <small>· الفرق من أول الوردية</small></div>${s.bal.map(b => { const now = b.close != null ? b.close : b.auto ? b.now : null, d = now != null && b.open != null ? now - b.open : null;   // مكنة (مش من الحركات) بتتكتب في التقفيل زي الكاشير
      return `<div class="row"><span>${esc(b.name)}</span><b>${now == null ? '<small class="mut">بيتكتب في التقفيل</small>' : money(now)}${d ? ` <small class="${d < 0 ? 'r' : 'g'}">${d > 0 ? '+' : ''}${money(d)}</small>` : ''}</b></div>`; }).join('')}</div>` : '';
    const es = F.entries || [], groups = shGroups(es);
    const moves = `<div class="card"><div class="lbl">🧾 حركات الوردية <small>· ${es.length} حركة</small></div>${groups.length ? groups.map(([k, ic, t, l]) => {
      const tot = l.reduce((a, e) => a + (+e.amt || 0), 0), fee = l.reduce((a, e) => a + (+e.fee || 0), 0), out = l.every(entryOut), names = [...new Set(l.map(e => e.personName || e.note || e.lineName).filter(Boolean))].slice(0, 3).join('، ');
      return `<button class="sh-sec" data-sg="${k}"><i>${ic}</i><span>${t}<small>${l.length} ${l.length === 1 ? 'حركة' : 'حركات'}${k === 'xfer' && fee ? ' · عمولة ' + fmt(fee) : names ? ' · ' + esc(names) : ''}</small></span><b class="${k === 'rep' || k === 'etc' || k === 'xfer' ? '' : out ? 'r' : 'g'}">${k === 'rep' || k === 'etc' || k === 'xfer' ? fmt(tot) : (out ? '−' : '+') + fmt(tot)}</b><em>‹</em></button>`; }).join('') : '<div class="empty">لسه مفيش حركات في الوردية دي</div>'}</div>`;
    return drawer + bals + moves;
  }
  /* الخطوة 2: الورديات اللي اتقفلت زي الكاشير: سطر لكل شهر (عدد الورديات، العمولات، الزيادة والعجز، الاتنين مع بعض)، ودوسة على وردية = تفاصيلها */
  const ymOf = t => new Date(t).toLocaleDateString('sv').slice(0, 7);
  const monthTitle = m => { try { return new Date(m + '-15T12:00').toLocaleDateString('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' }); } catch (e) { return m; } };
  const dayTitle = t => { try { return new Date(t).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'short', day: 'numeric', month: 'numeric' }); } catch (e) { return ''; } };
  const diffTxt = d => d == null ? '<span class="mut">—</span>' : d > 0 ? `<b class="g">+${fmt(d)}</b> <small>زيادة</small>` : d < 0 ? `<b class="r">−${fmt(-d)}</b> <small>عجز</small>` : '<b>مظبوط</b>';
  function shiftHist() {
    const list = (FULL.hist && FULL.hist.list) || [];
    if (!list.length) return '<div class="card"><div class="empty">لسه ماقفلتش أي وردية</div></div>';
    const groups = []; list.forEach(s => { const m = ymOf(s.closedAt), g = groups[groups.length - 1]; if (g && g.m === m) g.l.push(s); else groups.push({ m, l: [s] }); });
    return groups.map(g => {
      const fees = g.l.reduce((a, s) => a + (+s.fees || 0), 0), dd = g.l.filter(s => s.diff != null), diff = dd.reduce((a, s) => a + s.diff, 0), both = fees + diff;
      return `<div class="sh-mrow"><b>${monthTitle(g.m)}</b><span>${g.l.length} وردية</span><span>🔁 عمولات <b class="g">${fmt(fees)}</b></span><span>⚖ ${dd.length ? diffTxt(diff) : '—'}</span><span>الاتنين <b class="${both < 0 ? 'r' : 'g'}">${both < 0 ? '−' : '+'}${fmt(Math.abs(both))}</b></span></div>
        <div class="card">${g.l.map(s => `<button class="sh-sec" data-shd="${esc(s.id)}"><i class="num">${s.no}</i><span>${esc(s.who || s.closedBy || '—')} · ${dayTitle(s.closedAt)}<small>${s.fees ? 'عمولات ' + fmt(s.fees) : 'من غير عمولات'}${s.segs && s.segs.length > 1 ? ' · ' + s.segs.length + ' تسليم' : ''}</small></span><b class="sh-d">${diffTxt(s.diff)}</b><em>‹</em></button>`).join('')}</div>`;
    }).join('');
  }
  // نفس سطور التقفيل على الكاشير (shiftui.js breakdownRows): مجموعهم = المفروض في الدرج
  function closeRows(s) {
    const row = (l, v, sub) => `<div class="row"><span>${l}${sub ? `<small class="mut"> ${sub}</small>` : ''}</span><b class="${v < 0 ? 'r' : v > 0 ? 'g' : ''}">${v < 0 ? '−' : v > 0 ? '+' : ''}${fmt(Math.abs(v))}</b></div>`;
    return [row('💵 نقدي أول الوردية', s.openCash),
      ...(s.bal || []).map(b => row(esc(b.name), b.effect || 0, `${fmt(b.open)} ← ${b.close == null ? '?' : fmt(b.close)}`)),
      row('🎧 إكسسوار (الفواتير)', s.accSales || 0), s.accReturns ? row('↩ مرتجع إكسسوار', -s.accReturns) : '', s.acc ? row('🎧 إكسسوار اتنسى', s.acc) : '',
      row('➕ إضافة', s.in || 0), row('➖ سحب + ملاحظات', -((s.out || 0) + (s.loan || 0))),
      s.feesCash ? row('🔁 عمولات دخلت الدرج', s.feesCash) : '', s.repIn ? row('📥 رصيد من المندوب', s.repIn) : '', s.repOut ? row('💸 للمندوب', -s.repOut) : '',
      s.devSell || s.devBuy || s.devRet ? row('📱 أجهزة (بيع − شراء − مرتجع)', (s.devSell || 0) - (s.devBuy || 0) - (s.devRet || 0)) : ''].join('');
  }
  function shiftDetailSheet(id) {
    const s = ((FULL.hist && FULL.hist.list) || []).find(x => x.id === id); if (!s) return;
    const det = ((FULL['shd-' + ymOf(s.closedAt)] || {}).shifts || {})[id];
    const live = det ? det.entries.filter(e => !e.del) : [], groups = shGroups(live);
    const segs = (s.segs || []).length > 1 ? `<div class="card"><div class="lbl">🔁 تسليم الوردية</div>${s.segs.map(x => `<div class="row"><span>${esc(x.who || '—')}</span><span>${x.seg == null ? 'لسه شغّال' : diffTxt(x.seg)}</span></div>`).join('')}</div>` : '';
    openSheet(`<button class="x" id="sh-x">✕</button><h3>🗂 وردية ${s.no} <span class="lbl">${esc(s.who || s.closedBy || '')}</span></h3><div class="lbl">${dayTitle(s.openedAt)} ${hm(s.openedAt)} ← ${dayTitle(s.closedAt)} ${hm(s.closedAt)}</div>
      <div class="card" style="margin-top:12px"><div class="lbl">🧮 المفروض في الدرج</div>${closeRows(s)}
        <div class="row sh-tot"><span><b>المفروض</b></span><b>${fmt(s.expected)}</b></div>
        ${s.counted != null ? `<div class="row"><span>اتعد${s.found ? ` <small class="mut">(منهم ${fmt(s.found)} لقيناهم بعدين)</small>` : ''}</span><b>${fmt(s.counted)}</b></div><div class="row sh-tot"><span><b>الفرق</b></span><span>${diffTxt(s.diff)}</span></div>` : ''}
        ${s.fees ? `<div class="row"><span>🔁 عمولات الوردية كلها</span><b class="g">${fmt(s.fees)}</b></div>` : ''}</div>
      ${segs}
      <div class="card"><div class="lbl">🧾 الحركات <small>· ${live.length}</small></div>${det ? (groups.length ? groups.map(([k, ic, t, l]) => `<div class="sh-gh">${ic} ${t} <small>${l.length}</small></div>${l.map(e => { const kk = shKind(e), out = entryOut(e), who = [e.personName, e.lineName, e.devModel].filter(Boolean).join(' · ');
        return `<div class="sh-e"><span class="sh-t">${hm(e.t)}</span><span class="sh-m">${kk[0]} ${kk[1]}${who ? ` <b class="tx">${esc(who)}</b>` : ''}${e.note ? `<small>${esc(e.note)}</small>` : ''}<small class="mut">${esc(e.by || '')}${e.fee ? ' · عمولة ' + fmt(e.fee) : ''}${e.late ? ' · اتضافت بعد التقفيل' : ''}</small></span><b class="${out ? 'r' : e.kind === 'xfer' || e.kind === 'rep' ? '' : 'g'}">${money(e.amt)}</b></div>`; }).join('')}`).join('') : '<div class="empty">مفيش حركات</div>')
        : '<div class="empty">تفاصيل الحركات متاحة لآخر 12 شهر بس</div>'}
        ${det && det.sales && det.sales.length ? `<div class="sh-gh">🎧 فواتير الإكسسوار <small>${det.sales.length}</small></div>${det.sales.map(x => `<div class="sh-e"><span class="sh-t">${hm(x.t)}</span><span class="sh-m">F${esc(x.no)}<small>${esc(x.items || '')}</small></span><b class="g">${money(x.total)}</b></div>`).join('')}` : ''}</div>`);
  }
  /* الخطوة 3: تقفيلة الشهر زي الكاشير (shift.month): رأس المال أول الشهر وآخره، المكسب، والشهر بالأرقام. ورأس المال دلوقتي (بسعر الشرا والبيع) */
  const CAP_L = { cash: '💵 نقدي في الدرج', rec: '👥 فلوس على الناس', held: '🤝 أمانات العملا (مش بتاعتك)', acc: '🎧 إكسسوار', part: '🔩 قطع غيار', dev: '📱 أجهزة لسه مااتباعتش', pending: '⏳ كاش اوت عند المندوب', company: '🏢 عليك للشركات', sup: '🧾 على المحل للتجار' };
  const sgn = n => `<b class="${n < 0 ? 'r' : 'g'}">${n < 0 ? '−' : '+'}${fmt(Math.abs(n))}</b>`;
  const v0 = n => n == null ? '<span class="mut">—</span>' : n < 0 ? '−' + fmt(-n) : fmt(n);
  function shiftMonth() {
    const M = FULL.month; if (!M || !(M.list || []).length) return (M && M.cap ? capCard(M.cap) : '') + '<div class="card"><div class="empty">لسه مفيش ورديات اتقفلت. تقفيلة الشهر بتتحسب من أول وردية اتقفلت في الشهر لآخر وردية.</div></div>';
    if (!monthSel || !M.calc[monthSel]) monthSel = M.list[0].m;
    const r = M.calc[monthSel]; if (!r) return '';
    const S = r.start, E = r.end, I = r.info, row = (l, a, b) => `<tr><td>${l}</td><td>${a}</td><td>${b}</td></tr>`;
    const chips = `<div class="sh-chips">${M.list.map(x => `<button class="${x.m === monthSel ? 'on' : ''}" data-mo="${x.m}">${monthTitle(x.m)}${x.saved ? ' ✓' : ''}</button>`).join('')}</div>`;
    const head = `<div class="card sh-profit ${r.profit < 0 ? 'neg' : ''}"><div class="lbl">${r.profit < 0 ? '📉 خسارة الشهر' : '💰 مكسب الشهر'} · ${monthTitle(r.m)}</div><div class="big">${count(Math.abs(r.profit))}</div>
      <div class="lbl">من وردية ${I.firstNo} (${dayTitle(I.from)}) لوردية ${I.lastNo} (${dayTitle(I.to)})${r.saved ? ' · ✓ اتحفظت' : ''}</div>
      <div class="row"><span>رأس المال زاد / قل</span>${sgn(r.capChange)}</div>${r.capAdded ? `<div class="row"><span>رأس مال اتضاف من برا</span>${sgn(-r.capAdded)}</div>` : ''}${r.ownOut ? `<div class="row"><span>سحب أرباح / شخصي</span>${sgn(r.ownOut)}</div>` : ''}${r.takenAtClose ? `<div class="row"><span>اتشال من الدرج وقت التقفيل</span>${sgn(r.takenAtClose)}</div>` : ''}
      ${r.saved && r.saved.note ? `<div class="row"><span>📝 ${esc(r.saved.note)}</span></div>` : ''}</div>`;
    const capT = `<div class="card"><div class="lbl">💼 رأس المال</div><table class="sh-tb"><tr><th></th><th>أول الشهر</th><th>آخر الشهر</th></tr>
      ${row(CAP_L.cash, v0(S.cash), v0(E.cash))}${S.balances.map((b, i) => row(esc(b.name), v0(b.v), v0((E.balances[i] || {}).v))).join('')}
      ${row(CAP_L.rec, v0(S.rec), v0(E.rec))}${row('📦 المخزن <small>(بسعر الشرا)</small>', v0(S.stock), v0(E.stock))}${row(CAP_L.dev, v0(S.devices), v0(E.devices))}
      ${S.pending || E.pending ? row(CAP_L.pending, v0(S.pending), v0(E.pending)) : ''}${S.company || E.company ? row(CAP_L.company, v0(-S.company), v0(-E.company)) : ''}${S.sup || E.sup ? row(CAP_L.sup, v0(-S.sup), v0(-E.sup)) : ''}
      <tr class="tot"><td>💼 رأس المال</td><td>${v0(S.capital)}</td><td>${v0(E.capital)}</td></tr></table>
      ${r.needStock ? '<div class="lbl" style="margin-top:8px">⚠ المخزن أول الشهر لسه مااتكتبش على الكاشير</div>' : ''}</div>`;
    const nums = `<div class="card"><div class="lbl">📊 الشهر ده بالأرقام</div>
      <div class="row"><span>🎧 إكسسوار (من غير المرتجع)</span><b>${fmt(I.accSales)}</b></div><div class="row"><span>📱 بيع أجهزة</span><b>${fmt(I.devSell)}</b></div>
      <div class="row"><span>🔁 عمولات التحويل</span><b class="g">${fmt(I.fees)}</b></div><div class="row"><span>➖ مصاريف (سحب)</span><b class="r">−${fmt(I.expenses)}</b></div>
      <div class="row"><span>📝 فلوس اتاخدت على الناس</span><b class="r">−${fmt(I.lent)}</b></div><div class="row"><span>➕ فلوس رجعت من الناس</span><b class="g">+${fmt(I.repaid)}</b></div>
      <div class="row"><span>⚖ فرق الورديات (زيادة/عجز)</span>${sgn(I.diffs)}</div></div>`;
    const note = '<div class="lbl sh-note">المكسب = رأس المال آخر الشهر − أوله، من غير رأس المال اللي اتضاف من برا، ومن غير السحب الشخصي. المخزن محسوب بسعر الشرا.</div>';
    return (M.cap ? capCard(M.cap) : '') + chips + head + capT + nums + note;
  }
  function capCard(c) {
    return `<div class="card"><div class="sh-h"><div class="lbl">💼 رأس المال دلوقتي</div><small>وردية ${c.shift}</small></div>
      <div class="grid2"><div><small>بسعر الشرا</small><b>${fmt(c.cost)}</b></div><div><small>بسعر البيع</small><b class="g">${fmt(c.sale)}</b></div></div>
      ${c.rows.map(x => `<div class="row"><span>${x.k === 'bal' ? esc(x.name) : CAP_L[x.k] || x.k}${x.n ? ` <small class="mut">(${x.n})</small>` : ''}</span><b>${v0(x.v)}${x.sale != null && x.sale !== x.v ? ` <small class="g">بيع ${fmt(x.sale)}</small>` : ''}</b></div>`).join('')}
      ${c.noStock ? '<div class="lbl">المخزن مش محسوب (مفيش أصناف)</div>' : ''}</div>`;
  }
  /* الخطوة 4: الناس = حسابات العملا (زي الكاشير: مين عليه ومين ليه، وكارت كل واحد) ورواتب الموظفين (shift.payroll) */
  const PP_K = { loan: 'خد فلوس (ملاحظة)', credit: 'خد حاجة على الحساب', in: 'رجّع', out: 'خد من فلوسه', xfer: 'تحويل' };
  const owesTxt = v => v > 0 ? `<b class="o">عليه ${fmt(v)}</b>` : v < 0 ? `<b class="b">ليه ${fmt(-v)}</b>` : '<b class="g">خالص</b>';
  const normQ = x => String(x || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
  function shiftPeople() {
    const seg = `<div class="seg"><button class="${pplTab === 'cust' ? 'on' : ''}" data-ppt="cust">👥 حسابات العملا</button><button class="${pplTab === 'emp' ? 'on' : ''}" data-ppt="emp">👷 رواتب الموظفين</button></div>`;
    return seg + (pplTab === 'emp' ? shiftPay() : shiftCust());
  }
  function shiftCust() {
    const P = FULL.people; if (!P) return '<div class="card"><div class="empty">لسه مفيش حسابات عملا</div></div>';
    const tot = P.list.reduce((a, p) => a + Math.max(0, p.owes), 0), held = P.list.reduce((a, p) => a + Math.max(0, -p.owes), 0);
    const f = normQ(pplQ), list = P.list.filter(p => !f || normQ(p.name + ' ' + (p.phone || '')).includes(f));
    return `<div class="grid2"><div><small>👥 إجمالي اللي على الناس</small><b class="o">${fmt(tot)}</b></div><div><small>💼 أمانات الناس معانا</small><b class="b">${fmt(held)}</b></div></div>
      <input class="sh-q" id="ppl-q" type="search" placeholder="🔍 دوّر بالاسم أو التليفون" value="${esc(pplQ)}">
      <div class="card">${list.length ? list.map(p => `<button class="sh-sec" data-pp="${esc(p.id)}"><i>${esc((p.name || '؟').trim()[0] || '؟')}</i><span>${esc(p.name)}<small class="num">${esc(p.phone || '')}</small></span><span class="sh-d">${owesTxt(p.owes)}</span><em>‹</em></button>`).join('') : '<div class="empty">مفيش حد بالاسم ده</div>'}</div>`;
  }
  function personSheet(id) {
    const P = FULL.people; if (!P) return;
    const p = P.list.find(x => x.id === id), c = P.cards[id]; if (!p) return;
    const es = (c && c.entries) || [], byM = []; es.forEach(e => { const m = ymOf(e.t), g = byM[byM.length - 1]; if (g && g.m === m) g.l.push(e); else byM.push({ m, l: [e] }); });
    openSheet(`<button class="x" id="sh-x">✕</button><h3>👤 ${esc(p.name)} <span class="lbl num">${esc(p.phone || '')}</span></h3>
      <div class="card sh-owes" style="margin-top:12px">${owesTxt(c ? c.owes : p.owes)}</div>
      ${byM.length ? byM.map(g => `<div class="sh-gh">${monthTitle(g.m)}</div><div class="card">${g.l.map(e => `<div class="sh-e ${e.settled ? 'done' : ''}"><span class="sh-t">${dayTitle(e.t)}</span><span class="sh-m">${e.held ? 'أمانة (فلوسه معانا)' : PP_K[e.kind] || e.kind}${e.viaName ? ` <small class="mut">${esc(e.viaName)}</small>` : ''}${e.note ? `<small>${esc(e.note)}</small>` : ''}<small class="mut">${e.shiftNo ? 'وردية ' + e.shiftNo + ' · ' : ''}${esc(e.by || '')}${e.settled ? ' · اتدفعت' : ''}</small></span><span class="sh-d"><b>${money(e.amt)}</b><small class="mut">بعدها ${e.after > 0 ? 'عليه ' + fmt(e.after) : e.after < 0 ? 'ليه ' + fmt(-e.after) : 'خالص'}</small></span></div>`).join('')}</div>`).join('') : '<div class="card"><div class="empty">مفيش حركات</div></div>'}`);
  }
  function shiftPay() {
    const PY = FULL.pay; const ms = PY ? Object.keys(PY.months).sort().reverse() : [];
    if (!ms.length) return '<div class="card"><div class="empty">لسه مفيش رواتب. ضيف الموظفين من الكاشير (الوردية ← رواتب الموظفين).</div></div>';
    if (!payM || !PY.months[payM]) payM = ms[0];
    const r = PY.months[payM], T = r.total;
    return `<div class="sh-chips">${ms.map(m => `<button class="${m === payM ? 'on' : ''}" data-pm="${m}">${monthTitle(m)}</button>`).join('')}</div>
      <div class="grid2 g4"><div><small>المرتبات</small><b>${fmt(T.salary)}</b></div><div><small>المستحق</small><b>${fmt(T.earned)}</b></div><div><small>اتصرف من الدرج</small><b class="r">${fmt(T.paid)}</b></div><div><small>باقي ليهم</small><b class="g">${fmt(T.left)}</b></div></div>
      <div class="card">${r.list.length ? r.list.map((x, i) => `<button class="sh-sec" data-emp="${i}"><i>👷</i><span>${esc(x.name)}<small>${x.noCfg ? 'من غير مرتب' : 'المرتب ' + fmt(x.salary)}${x.defPending ? ' · ⚠ عجز ' + fmt(x.defPending) + ' مستني قرارك' : ''}</small></span><span class="sh-d"><b class="${x.left < 0 ? 'r' : 'g'}">${x.left < 0 ? 'خد زيادة ' + fmt(-x.left) : 'باقيله ' + fmt(x.left)}</b><small class="mut">اتصرف ${fmt(x.paid)}</small></span><em>‹</em></button>`).join('') : '<div class="empty">مفيش موظفين الشهر ده</div>'}</div>`;
  }
  function empSheet(i) {
    const r = FULL.pay && FULL.pay.months[payM], x = r && r.list[+i]; if (!x) return;
    const ln = (l, v, cls) => `<div class="row"><span>${l}</span><b class="${cls || ''}">${v}</b></div>`;
    openSheet(`<button class="x" id="sh-x">✕</button><h3>👷 ${esc(x.name)} <span class="lbl">${monthTitle(r.m)}</span></h3>
      <div class="card" style="margin-top:12px">${ln('المرتب', fmt(x.salary))}${x.inc ? ln('⭐ حوافز', '+' + fmt(x.inc), 'g') : ''}${x.bonus ? ln('🎁 مكافآت', '+' + fmt(x.bonus), 'g') : ''}${x.cut ? ln('➖ خصومات', '−' + fmt(x.cut), 'r') : ''}
        ${x.offDays ? ln(`🌴 غياب ${x.offDays} يوم (الإجازة ${x.leave})`, x.offCut ? '−' + fmt(x.offCut) : x.waived && x.extra ? 'الخصم اتلغى' : '—', x.offCut ? 'r' : '') : ''}
        ${x.defCut ? ln('عجز اتخصم', '−' + fmt(x.defCut), 'r') : ''}
        <div class="row sh-tot"><span><b>المستحق</b></span><b>${fmt(x.earned)}</b></div>${ln('اتصرف من الدرج', fmt(x.paid), 'r')}
        <div class="row sh-tot"><span><b>${x.left < 0 ? 'خد زيادة' : 'باقيله'}</b></span><b class="${x.left < 0 ? 'r' : 'g'}">${fmt(Math.abs(x.left))}</b></div></div>
      ${(x.defs || []).length ? `<div class="sh-gh">⚖ العجز في الوردية</div><div class="card">${x.defs.map(d => `<div class="sh-e"><span class="sh-t">${dayTitle(d.t)}</span><span class="sh-m">${esc(d.at || '')} وردية ${esc(d.shiftNo || '')}</span><span class="sh-d"><b class="r">${fmt(d.amt)}</b><small class="mut">${d.status === 'cut' ? 'اتخصم' : d.status === 'forgive' ? 'اتسامح' : 'مستني قرارك على الكاشير'}</small></span></div>`).join('')}</div>` : ''}
      ${(x.paidList || []).length ? `<div class="sh-gh">💵 اتصرف من الدرج</div><div class="card">${x.paidList.map(e => `<div class="sh-e"><span class="sh-t">${dayTitle(e.t)}</span><span class="sh-m">${esc(e.note || 'سحب لموظف')}<small class="mut">${esc(e.by || '')}</small></span><b class="r">${fmt(e.amt)}</b></div>`).join('')}</div>` : ''}`);
  }
  function shiftGroupSheet(k) {
    const F = FULL && FULL.shift && FULL.shift.st; if (!F) return;
    const g = shGroups(F.entries || []).find(x => x[0] === k); if (!g) return;
    openSheet(`<button class="x" id="sh-x">✕</button><h3>${g[1]} ${g[2]} <span class="num lbl">${g[3].length}</span></h3>
      <div class="card" style="margin-top:12px">${g[3].map(e => { const kk = shKind(e), out = entryOut(e), who = [e.personName, e.lineName, e.devModel].filter(Boolean).join(' · ');
        return `<div class="sh-e"><span class="sh-t">${hm(e.t)}</span><span class="sh-m">${kk[0]} ${kk[1]}${who ? ` <b class="tx">${esc(who)}</b>` : ''}${e.note ? `<small>${esc(e.note)}</small>` : ''}<small class="mut">${esc(e.by || '')}${e.fee ? ' · عمولة ' + fmt(e.fee) : ''}</small></span><b class="${out ? 'r' : e.kind === 'xfer' || e.kind === 'rep' ? '' : 'g'}">${money(e.amt)}</b></div>`; }).join('')}</div>`);
  }
  function shift() {
    const F = FULL && FULL.shift && FULL.shift.st;
    if (F) {
      const seg = [['now', 'دلوقتي'], ['hist', 'الورديات'], ['month', 'الشهر'], ['ppl', 'الناس']];
      return `<div class="seg s4">${seg.map(([k, n]) => `<button class="${shiftTab === k ? 'on' : ''}" data-sht="${k}">${n}</button>`).join('')}</div>`
        + (shiftTab === 'now' ? shiftNow(F) : shiftTab === 'hist' ? shiftHist() : shiftTab === 'month' ? shiftMonth() : shiftPeople());
    }
    const hint = FULLST === 'rekey' ? '<div class="card sh-hint">🔐 الكاشير غيّر مفتاح التشفير: اربط الموبايل تاني بالـ QR علشان تشوف الوردية كاملة</div>' : '';
    return hint + shiftOld();
  }
  function shiftOld() {
    const lineCol = p => (p > 75 ? 'var(--rd)' : p > 50 ? 'var(--or)' : 'var(--gr)');   // نفس ألوان البرنامج: لحد 50 أخضر، 51–75 برتقالي، فوق 75 أحمر
    return (window.OwnerExtras ? OwnerExtras.owesCard() : '') + `<div class="card"><div class="lbl">💳 الأرصدة دلوقتي</div>${D.balances.length ? '' : '<div class="empty" style="padding:12px 0">مفيش وردية مفتوحة</div>'}${D.balances.map(b => `<div class="row"><span>${esc(b.name)}</span><b class="${b.manual ? 'a' : ''}">${money(b.amt)}</b></div>`).join('')}</div>
      ${D.lines.length ? '' : '<!--'}<div class="card"><div class="lbl">📶 حد الخطوط الشهري</div>${D.lines.map(l => { const p = Math.min(100, Math.round(l.used / l.limit * 100)); return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between"><span>${esc(l.name)}</span><b>${fmt(l.used)} / ${fmt(l.limit)}</b></div><div class="bar"><i data-w="${p}" style="width:0;background:${lineCol(p)}"></i></div></div>`; }).join('')}</div>${D.lines.length ? '' : '-->'}
      <div class="card"><div class="lbl">🧾 آخر الحركات</div>${D.moves.length ? D.moves.map(m => `<div class="al"><i>${m.icon}</i><div>${esc(m.text)}<small>${esc(m.t)} · ${esc(m.by)}</small></div></div>`).join('') : '<div class="empty">لسه مفيش حركات</div>'}</div>`;
  }
  function repair() {
    const list = D.tickets.filter(t => (repairTab === 'done' ? t.status === 'done' && t.doneToday : t.status === repairTab));
    // "الكل" (خالد 2026-11-08): اللي خلص آخر 60 يوم من الملخص (D.hist)، والأقدم بطلب للكاشير. الكاشير القديم مابيبعتش hist = مفيش التبويب
    const X = window.OwnerExtras, hasAll = !!(X && Array.isArray(D.hist));
    if (repairTab === 'all' && !hasAll) repairTab = 'processing';
    const cnt = k => (k === 'all' ? D.hist.length : D.tickets.filter(t => (k === 'done' ? t.status === 'done' && t.doneToday : t.status === k)).length);
    const seg = [['waiting', 'استلمت'], ['processing', 'في الصيانة'], ['done', 'اتسلّم النهاردة']].concat(hasAll ? [['all', 'الكل']] : []);
    const A = window.OwnerActions;
    return `${A ? A.repairTop() : ''}${X ? X.searchBox() : ''}<div class="seg${hasAll ? ' s4' : ''}">${seg.map(([k, n]) => `<button class="${repairTab === k ? 'on' : ''}" data-rt="${k}">${n} <span class="num">${cnt(k)}</span></button>`).join('')}</div>
      ${repairTab === 'all' ? X.allTab() : list.length ? list.map(t => `<button class="tk" data-tk="${esc(t.id || t.no)}"><span class="no num">#${t.no}</span><span class="t"><b>${esc(t.dev)}</b><small>${esc(t.type)}${t.customer ? ' · ' + esc(t.customer) : ''}</small></span>${t.status === 'processing' ? `<span class="chip ${t.days >= 3 ? 'late' : ''}">${t.days ? t.days + ' يوم' : 'النهاردة'}</span>` : `<b class="num">${fmt(t.price)}</b>`}</button>`).join('') : '<div class="empty">مفيش أجهزة هنا</div>'}`;
  }
  /* الخطوة 5: التقارير كاملة زي الكاشير (renderer/reports.js بيحسبها بنفس معادلات الفلوس ويبعتها متشفّرة) */
  // زي الكاشير (reports.js early): الشهر الحالي قبل يوم 25 مايظهرش فيه النزول (خالد 2026-11-01: "أول الشهر وطالعلي 100% بالأحمر")
  const earlyM = () => repSel === new Date().toLocaleDateString('sv').slice(0, 7) && new Date().getDate() < 25;
  const pct = (c, p, goodUp) => { c = +c || 0; p = +p || 0; if (earlyM() && c < p) return ''; if (!p && !c) return ''; if (!p) return '<i class="rp-d up">جديد</i>'; const v = Math.round((c - p) / Math.abs(p) * 100); if (!v) return '<i class="rp-d">0%</i>'; const good = goodUp == null ? null : goodUp ? v > 0 : v < 0; return `<i class="rp-d ${good == null ? '' : good ? 'up' : 'down'}">${v > 0 ? '▲' : '▼'} ${Math.abs(v)}%</i>`; };
  const shortM = k => { try { return new Date(k + '-15T12:00').toLocaleDateString('ar-EG-u-nu-latn', { month: 'short' }); } catch (e) { return k.slice(5); } };
  function reportsFull(R) {
    const ms = R.months || [], acc = repKind === 'acc';
    if (!repSel || !ms.includes(repSel)) repSel = ms[ms.length - 1];
    const prevK = ms[ms.indexOf(repSel) - 1];
    const seg = `<div class="seg"><button class="${!acc ? 'on' : ''}" data-rk="repair">🔧 الصيانة</button><button class="${acc ? 'on' : ''}" data-rk="acc">🎧 الإكسسوار</button></div>`;
    const chips = `<div class="sh-chips">${ms.slice().reverse().map(k => `<button class="${k === repSel ? 'on' : ''}" data-rm="${k}">${monthTitle(k)}</button>`).join('')}</div>`;
    const kpi = (l, v, d, cls) => `<div class="mini ${cls || ''}"><b class="num">${v}</b><span>${l}</span>${d || ''}</div>`;
    const bars = (vals, fmtv) => { const mx = Math.max(1, ...vals.map(x => Math.abs(x.v))); return `<div class="rp-bars">${vals.map(x => `<button data-rm="${x.k}" class="${x.k === repSel ? 'on' : ''} ${x.v < 0 ? 'neg' : ''}"><i style="height:${Math.max(3, Math.round(Math.abs(x.v) / mx * 96))}px"></i><span>${shortM(x.k)}</span></button>`).join('')}</div>`; };
    const list = (t, arr, unit, withNet) => arr && arr.length ? `<div class="card"><div class="lbl">${t}</div>${arr.map(x => { const mx = arr[0].n || 1; return `<div class="rp-li"><div><b>${esc(x.k)}</b><small>${x.n} ${unit}${withNet && x.net != null ? ' · ' + money(x.net) : ''}</small></div><div class="bar"><i style="width:${Math.round(x.n / mx * 100)}%"></i></div></div>`; }).join('')}</div>` : '';
    if (acc) {
      const A = R.acc; if (!A) return seg + '<div class="card"><div class="empty">تقارير الإكسسوار هتظهر أول ما الكاشير يتفتح بحساب صاحب المحل</div></div>';
      const m = A.months[repSel] || { s: {}, top: [] }, p = prevK ? A.months[prevK] : null, s = m.s, ps = p ? p.s : {};
      return seg + chips + `<div class="grid3">${kpi('المبيعات', fmt(s.rev), pct(s.rev, ps.rev, true))}${A.canCost ? kpi('تكلفة البضاعة', fmt(s.cost), pct(s.cost, ps.cost, false)) + kpi('الربح', fmt(s.net), pct(s.net, ps.net, true), s.net < 0 ? 'neg' : 'pos') : ''}${kpi('الفواتير', s.jobs || 0, pct(s.jobs, ps.jobs, true))}${kpi('القطع المتباعة', s.items || 0, pct(s.items, ps.items, true))}${kpi('متوسط الفاتورة', fmt(s.avg), pct(s.avg, ps.avg, true))}</div>
        <div class="card"><div class="lbl">📊 ${A.canCost ? 'ربح الإكسسوار' : 'المبيعات'} آخر 12 شهر</div>${bars(ms.map(k => ({ k, v: A.canCost ? (A.months[k] || { s: {} }).s.net || 0 : (A.months[k] || { s: {} }).s.rev || 0 })))}</div>
        ${list('🏆 أكتر الأصناف بيعًا', m.top, 'قطعة', A.canCost)}<div class="lbl sh-note">الربح = سعر البيع − سعر الشراء وقت البيع، من غير المرتجع.</div>`;
    }
    const m = (R.rep || {})[repSel] || { s: {} }, p = prevK ? (R.rep || {})[prevK] : null, s = m.s || {}, ps = (p && p.s) || {};
    const dd = s.days ? Math.round(s.days * 10) / 10 + ' يوم' : '—';
    const techs = (m.techs || []).length ? `<div class="card"><div class="lbl">👷 الفنيين</div><table class="sh-tb"><tr><th>الفني</th><th>عمليات</th><th>الصافي</th><th>متوسط الوقت</th><th>ضمان</th></tr>${m.techs.map(g => `<tr><td>${esc(g.k)}</td><td>${g.n}</td><td>${fmt(g.net)}</td><td>${g.dn ? Math.round(g.dsum / g.dn * 10) / 10 + ' يوم' : '—'}</td><td class="${g.back ? 'r' : ''}">${g.back ? g.back + (g.n ? ' (' + Math.round(g.back / Math.max(1, g.n) * 100) + '%)' : '') : '—'}</td></tr>`).join('')}</table></div>` : '';
    const w = m.war || { n: 0 };
    const war = `<div class="card"><div class="lbl">🛡 الرجوع في الضمان</div>${w.n ? `<div class="grid2"><div><small>جهاز رجع</small><b class="r">${w.n}</b></div><div><small>تكلفة القطع</small><b class="r">${fmt(w.cost)}</b></div></div>${[['السبب', w.reasons], ['👷 على الفني', w.techs], ['📇 من التاجر', w.traders]].filter(x => x[1] && x[1].length).map(([t, a]) => `<div class="sh-gh">${t}</div>${a.map(x => `<div class="row"><span>${esc(x.k)}</span><b>${x.n}${x.cost ? ' · ' + fmt(x.cost) : ''}</b></div>`).join('')}`).join('')}` : '<div class="empty">✅ مفيش أجهزة رجعت في الضمان الشهر ده</div>'}</div>`;
    return seg + chips + `<div class="grid3">${kpi('الإيراد', fmt(s.rev), pct(s.rev, ps.rev, true))}${kpi('تكلفة القطع', fmt(s.parts), pct(s.parts, ps.parts, false))}${kpi('الصافي', fmt(s.net), pct(s.net, ps.net, true), s.net < 0 ? 'neg' : 'pos')}${kpi('العمليات', s.jobs || 0, pct(s.jobs, ps.jobs, true))}${kpi('متوسط العملية', fmt(s.avg), pct(s.avg, ps.avg, true))}${kpi('لسه عند العملا', fmt(s.owed))}</div>
      <div class="card"><div class="row"><span>⏱ متوسط وقت الإصلاح</span><b>${dd}</b></div>${R.all ? `<div class="row"><span>🧾 من أول ما بدأت: ${fmt(R.all.jobs)} عملية</span><b class="g">${fmt(R.all.net)}</b></div>` : ''}</div>
      <div class="card"><div class="lbl">📊 الصافي آخر 12 شهر</div>${bars(ms.map(k => ({ k, v: ((R.rep[k] || {}).s || {}).net || 0 })))}</div>
      ${techs}${list('🛠 أكتر الأعطال', m.faults, 'عملية', true)}${list('📱 أكتر الماركات', m.brands, 'عملية', true)}${list('📲 أكتر الموديلات', m.models, 'عملية', true)}${war}
      <div class="lbl sh-note">الحسابات على الأجهزة اللي اتسلمت في الشهر، والصافي = اللي اتحصّل − القطع (زي الكاشير).</div>`;
  }
  function reports() {
    if (FULL && FULL.rep) return reportsFull(FULL.rep);
    const mx = Math.max(1, ...D.week.map(w => w.v)), m = D.month, split = D.week.some(w => w.rep != null);
    // الرسم متقسم (خالد 2026-10-31: "مش مفرّق بين صيانة والإكسسوار"): كل يوم عمود فيه الصيانة والإكسسوار والعمولات بلون لكل واحد
    const bar = (w, i) => !split ? `<i style="height:${Math.round(w.v / mx * 95)}px;animation-delay:${i * 45}ms"></i>`
      : `<i class="stk" style="height:${Math.max(2, Math.round(w.v / mx * 95))}px;animation-delay:${i * 45}ms">${[['fees', 'c-fee'], ['acc', 'c-acc'], ['rep', 'c-rep']].map(([k, c]) => (w[k] > 0 ? `<u class="${c}" style="flex:${w[k]}"></u>` : '')).join('')}</i>`;
    const r = m.rep, a = m.accD;
    const repCard = r ? `<div class="card"><div class="lbl"><u class="dot c-rep"></u>🛠 الصيانة · ${esc(m.name)}</div>
        <div class="row"><span>اتسلّم واتدفع خالص</span><b class="tx">${fmt(r.n)} جهاز</b></div>
        <div class="row"><span>اللي اتدفع</span><b>${fmt(r.rev)}</b></div>
        <div class="row"><span>تمن القطع</span><b class="r">−${fmt(r.parts)}</b></div>
        <div class="row"><span><b>الصافي</b></span><b class="g">${count(r.net)}</b></div>
        ${r.oweN ? `<div class="row"><span>لسه عليهم باقي (${fmt(r.oweN)} جهاز)</span><b class="o">+${fmt(r.oweNet)} لما يدفعوا</b></div>` : ''}</div>` : '';
    const accCard = a ? `<div class="card"><div class="lbl"><u class="dot c-acc"></u>🎧 الإكسسوار · ${esc(m.name)}</div>
        <div class="row"><span>الفواتير</span><b>${fmt(a.n)}</b></div>
        <div class="row"><span>المبيعات</span><b>${fmt(a.rev)}</b></div>
        <div class="row"><span>تمن البضاعة</span><b class="r">−${fmt(a.cost)}</b></div>
        <div class="row"><span><b>المكسب</b></span><b class="g">${count(a.profit)}</b></div></div>` : '';
    const wk = D.week.reduce((a, w) => a + (w.v || 0), 0);
    return `<div class="card"><div class="lbl">📈 مكسب آخر 7 أيام: <b class="num">${fmt(wk)}</b> ${D.weekPrev != null ? cmpChip(wk, D.weekPrev, 'عن الأسبوع اللي فات') : ''}</div><div class="chart">${D.week.map((w, i) => `<div>${bar(w, i)}${esc(w.d)}</div>`).join('')}</div>
        ${split ? '<div class="legend"><span><u class="dot c-rep"></u>صيانة</span><span><u class="dot c-acc"></u>إكسسوار</span><span><u class="dot c-fee"></u>عمولات</span></div>' : ''}</div>
      ${repCard}${accCard}
      <div class="card"><div class="lbl">🔒 آخر التقفيلات</div>${D.closings.map(c => `<div class="row"><span>وردية ${c.no} · ${esc(c.by)} · ${esc(c.day)}</span><b class="${c.diff > 0 ? 'g' : c.diff < 0 ? 'r' : ''}">${c.diff > 0 ? '+' : ''}${money(c.diff)}</b></div>`).join('')}</div>
      <div class="card"><div class="lbl">📅 ${esc(m.name)}${r ? ' · الشهر كله' : ''} ${m.prevGross != null && m.gross != null ? cmpChip(m.gross, m.prevGross, 'عن نفس الأيام الشهر اللي فات') : ''}</div><div class="row"><span>🛠 صيانة (صافي)</span><b>${fmt(m.repair)}</b></div><div class="row"><span>🔁 عمولات</span><b>${fmt(m.fees)}</b></div><div class="row"><span>🎧 إكسسوار${a ? ' (مكسب)' : ''}</span><b>${fmt(m.acc)}</b></div><div class="row"><span>➖ مصاريف</span><b class="r">−${fmt(m.exp)}</b></div><div class="row"><span><b>💰 المكسب</b></span><b class="g">${count(m.profit)}</b></div></div>`;
  }
  const VIEWS = { home, shift, repair, reports, stock: () => (window.OwnerStock ? OwnerStock.view() : ''), store: () => (window.OwnerStoreTab ? OwnerStoreTab.view() : '') };   // المخزن والفاتورة والجرد: stock.js
  const skeletonHTML = () => '<div class="sk" style="height:96px"></div><div class="sk" style="height:150px"></div><div class="sk" style="height:62px"></div><div class="sk" style="height:120px"></div>';

  /* ---------- الحركة ---------- */
  function animateNumbers(root) {
    const still = document.body.classList.contains('still');   // "وقّف الحركة" من الإعدادات
    root.querySelectorAll('.cnt').forEach(el => {
      const to = +el.dataset.to, t0 = performance.now(), dur = 700;
      if (still) { el.textContent = money(to); return; }
      const step = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = money(to * e); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    requestAnimationFrame(() => root.querySelectorAll('.bar i[data-w]').forEach(i => { i.style.width = i.dataset.w + '%'; }));
  }
  /* التحديث الهادي (خالد 2026-11-14: "الريفريش مايبقاش باين"): بنبني الصفحة الجديدة برّه (من غير ما تترسم) ونغيّر بس اللي اتغيّر،
     من غير ما الأرقام تعدّ تاني ولا الصفحة تطلع لفوق ولا الخانة اللي بتكتب فيها تتمسح. الأرقام والشرايط بقيمتها النهائية على طول */
  const painted = {};   // الصفحة دي اترسمت قبل كده (أول مرة بس الأرقام بتعدّ)
  function settle(root) {
    root.querySelectorAll('.cnt[data-to]').forEach(el => { el.textContent = money(+el.dataset.to); });
    root.querySelectorAll('.bar i[data-w]').forEach(i => { i.style.width = i.dataset.w + '%'; });
  }
  function syncNode(x, y) {
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { x.replaceWith(y); return; }
    if (x.nodeType === 3) { if (x.data !== y.data) x.data = y.data; return; }
    if (x.nodeType !== 1 || x.isEqualNode(y)) return;
    const typing = x === document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(x.tagName);
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
    for (const at of [...y.attributes]) if (x.getAttribute(at.name) !== at.value && !(typing && at.name === 'value')) x.setAttribute(at.name, at.value);
    syncKids(x, y);
  }
  function syncKids(a, b) {
    const A = [...a.childNodes], B = [...b.childNodes];
    // اللي زي ما هو من فوق ومن تحت بيفضل (نفس العنصر)، والتغيير (جهاز اتضاف/اتشال/اتغيّر) في النص بس
    let s = 0; while (s < A.length && s < B.length && A[s].isEqualNode(B[s])) s++;
    let ea = A.length - 1, eb = B.length - 1; while (ea >= s && eb >= s && A[ea].isEqualNode(B[eb])) { ea--; eb--; }
    const na = ea - s + 1, nb = eb - s + 1, both = Math.min(na, nb);
    for (let i = 0; i < both; i++) syncNode(A[s + i], B[s + i]);
    if (nb > na) { const ref = A[s + na] || null; for (let i = both; i < nb; i++) a.insertBefore(B[s + i], ref); }
    else for (let i = both; i < na; i++) A[s + i].remove();
  }
  function paint(v, dir, quiet) {
    const el = $(`.view[data-v="${v}"]`), html = VIEWS[v]();
    // دخول الصفحة من ناحية التبويب: بـ animate بدل ما نشيل الكلاس ونرجّعه (ده كان بيعمل layout إجباري للصفحة كلها في نفس اللحظة)
    if (dir && !document.body.classList.contains('still')) el.animate([{ opacity: 0, transform: `translateX(${dir === 'in-l' ? -26 : 26}px)` }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    if (quiet && painted[v] && !el.querySelector('.sk')) {
      const t = document.createElement('div'); t.innerHTML = html; settle(t); syncKids(el, t);
      if (painted[v] === 'warm') { painted[v] = true; if (dir) animateNumbers(el); }   // اتجهّز مستخبي: أول زيارة الأرقام بتعدّ زي الأول
      return;
    }
    el.innerHTML = html; painted[v] = true;
    animateNumbers(el);
  }
  function go(v, rt) {
    if (rt) repairTab = rt;
    if (v === cur) { if (rt) paint(v); return; }
    const dir = ORDER.indexOf(v) > ORDER.indexOf(cur) ? 'in-l' : 'in-r';   // RTL: التبويب اللي على الشمال بيدخل من الشمال
    $(`.view[data-v="${cur}"]`).classList.remove('on');
    cur = v; $(`.view[data-v="${v}"]`).classList.add('on');
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    $('#h-title').textContent = v === 'home' ? D.shop : TITLES[v];
    paint(v, dir, true);   // رجعت لصفحة اتفتحت قبل كده: بنحدّث اللي اتغيّر بس (من غير ما الأرقام تعدّ تاني)
  }

  /* ---------- Hero: تفاصيل التذكرة ---------- */
  let heroFrom = null, fullOpen = false, stale = false;   // stale: بيانات جديدة وصلت والنافذة مفتوحة
  function openTicket(btn) {
    const t = D.tickets.find(x => String(x.id || x.no) === btn.dataset.tk); if (!t) return;
    openSheet(ticketHTML(t), btn);
  }
  function ticketHTML(t) {
    const rem = t.price - t.paid, net = t.price - t.parts;
    return (`<button class="x" id="sh-x">✕</button><h3>${esc(t.dev)} <span class="num lbl">#${t.no}</span></h3><div class="lbl">${esc(t.type)}</div>
      <div class="card" style="margin-top:12px">
        ${t.customer ? `<div class="row"><span>👤 العميل</span><b class="tx">${esc(t.customer)}</b></div>` : ''}
        <div class="row"><span>🏷 سعر التصليح</span><b>${fmt(t.price)}</b></div>
        <div class="row"><span>💵 اتدفع</span><b>${fmt(t.paid)}</b></div>
        <div class="row"><span>⏳ الباقي</span><b class="${rem > 0 ? 'o' : 'g'}">${fmt(rem)}</b></div>
        <div class="row"><span>🔩 قطع الغيار</span><b>${fmt(t.parts)}</b></div>
        <div class="row"><span>💰 الصافي</span><b class="${net < 0 ? 'r' : 'g'}">${money(net)}</b></div>
        ${t.status === 'processing' ? `<div class="row"><span>📅 في الصيانة من</span><b class="tx">${t.days ? t.days + ' يوم' : 'النهاردة'}</b></div>` : ''}
        ${t.tech ? `<div class="row"><span>🧑‍🔧 الفني</span><b class="tx">${esc(t.tech)}</b></div>` : ''}
        ${t.phone ? `<div class="row"><span>📞 التليفون</span><b>${esc(t.phone)}</b></div><div class="call2"><button class="act" data-call="${esc(t.phone)}">📞 اتصل</button><button class="act wa" data-wa2="${esc(t.phone)}">💬 واتساب</button></div>` : ''}
        ${t.notes ? `<div class="row"><span>📝 ملاحظات</span><b class="tx">${esc(t.notes)}</b></div>` : ''}
      </div>${window.OwnerActions ? OwnerActions.ticketButtons(t) : ''}`);
  }
  // نافذة من تحت (Hero من العنصر اللي اتداس عليه لو موجود). زرار الرجوع بيقفلها
  // opts.full: صفحة كاملة (الإعدادات) بدل النافذة اللي من تحت
  function openSheet(html, from, opts) {
    const sh = $('#sheet'), bg = $('#sheet-bg'), was = !sh.hidden;
    sh.innerHTML = html;
    sh.classList.toggle('full', !!(opts && opts.full));
    const still = document.body.classList.contains('still');   // "وقّف الحركة": النافذة بتظهر على طول
    if (was) { const x = $('#sh-x'); if (x) x.onclick = () => history.back(); if (!still) sh.animate([{ opacity: .5, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' }); return sh; }   // نافذة جوه نافذة: نفس خطوة الرجوع
    // الصفحة الكاملة (الإعدادات): بتدخل من الجنب بحركة خفيفة (transform + opacity بس)، مش zoom من زرار ⋮ الصغير؛
    // خالد 2026-10-30: كانت بتقطّع (أول فريم ~0.6 ثانية على موبايل متوسط). والصفحة اللي وراها بتستخبى علشان الموبايل مايرسمهاش
    if (opts && opts.full) {
      sh.hidden = false; heroFrom = null; fullOpen = true;
      const done = () => { if (fullOpen) document.body.classList.add('full-open'); };
      if (!still) { const an = sh.animate([{ transform: 'translate3d(-24%,0,0)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }); an.onfinish = done; } else done();
      const x = $('#sh-x'); if (x) x.onclick = () => history.back();
      history.pushState({ sheet: 1 }, '');
      return sh;
    }
    sh.hidden = false; bg.hidden = false;
    const b = sh.getBoundingClientRect(), a = from ? from.getBoundingClientRect() : { left: b.left, top: b.bottom, width: b.width, height: 40 };
    heroFrom = from && !still ? a : null;
    const tr = `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${a.width / b.width}, ${a.height / b.height})`;
    if (!still) sh.animate([{ transform: tr, opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.25,1.05)' });
    requestAnimationFrame(() => bg.classList.add('on'));
    const x = $('#sh-x'); if (x) x.onclick = () => history.back();
    history.pushState({ sheet: 1 }, '');
    return sh;
  }
  function closeSheet() {
    const sh = $('#sheet'), bg = $('#sheet-bg'); if (sh.hidden) return;
    if (sh.classList.contains('full')) {
      fullOpen = false; document.body.classList.remove('full-open');
      const end = () => { sh.hidden = true; sh.innerHTML = ''; sh.classList.remove('full'); if (D) { stale = false; paint(cur, null, true); } };   // تحديث هادي: بس اللي اتغيّر (ولو مفيش حاجة ولا عنصر بيتلمس)
      if (document.body.classList.contains('still')) return end();
      sh.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate3d(-24%,0,0)', opacity: 0 }], { duration: 200, easing: 'cubic-bezier(.4,0,1,1)' }).onfinish = end;
      return;
    }
    const b = sh.getBoundingClientRect(), a = heroFrom || b;
    const tr = `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${a.width / b.width}, ${a.height / b.height})`;
    bg.classList.remove('on');
    const an = sh.animate([{ transform: 'none', opacity: 1 }, { transform: tr, opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.4,0,1,1)' });
    // كانت بترسم الصفحة اللي ورا كلها تاني والأرقام تعدّ (خالد 2026-11-14: "بيقطّع وأنا بقفل"): دلوقتي بس لو بيانات جديدة وصلت وهي مفتوحة، وبهدوء
    an.onfinish = () => { sh.hidden = true; bg.hidden = true; sh.innerHTML = ''; sh.classList.remove('full'); if (D) { stale = false; paint(cur, null, true); } };   // تحديث هادي: بس اللي اتغيّر (ولو مفيش حاجة ولا عنصر بيتلمس)
  }
  window.addEventListener('popstate', closeSheet);
  $('#sheet-bg').onclick = () => history.back();

  /* ---------- الأحداث ---------- */
  document.addEventListener('click', e => {
    const tab = e.target.closest('#tabs button'); if (tab) return go(tab.dataset.v);
    const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go, g.dataset.rt);
    const rt = e.target.closest('.seg [data-rt]'); if (rt) { repairTab = rt.dataset.rt; return paint('repair'); }
    const sht = e.target.closest('.seg [data-sht]'); if (sht) { shiftTab = sht.dataset.sht; return paint('shift', null, true); }
    const sg = e.target.closest('[data-sg]'); if (sg) return shiftGroupSheet(sg.dataset.sg);
    const shd = e.target.closest('[data-shd]'); if (shd) return shiftDetailSheet(shd.dataset.shd);
    const mo = e.target.closest('.sh-chips [data-mo]'); if (mo) { monthSel = mo.dataset.mo; return paint('shift', null, true); }
    const rk = e.target.closest('[data-rk]'); if (rk) { repKind = rk.dataset.rk; return paint('reports', null, true); }
    const rm = e.target.closest('[data-rm]'); if (rm) { repSel = rm.dataset.rm; return paint('reports', null, true); }
    const ppt = e.target.closest('[data-ppt]'); if (ppt) { pplTab = ppt.dataset.ppt; return paint('shift', null, true); }
    const pm = e.target.closest('.sh-chips [data-pm]'); if (pm) { payM = pm.dataset.pm; return paint('shift', null, true); }
    const ppc = e.target.closest('[data-pp]'); if (ppc) return personSheet(ppc.dataset.pp);
    const em = e.target.closest('[data-emp]'); if (em) return empSheet(em.dataset.emp);
    const hk = e.target.closest('[data-hk]'); if (hk && window.OwnerExtras) return OwnerExtras.openHist(hk);   // سطر من "الكل"
    const tk = e.target.closest('[data-tk]'); if (tk) return openTicket(tk);
    // اتصال / واتساب للعميل من تفاصيل الجهاز (خالد 2026-11-07). الرقم اللي بيبدأ بصفر بياخد كود الدولة من الكاشير (D.cc)
    const cl = e.target.closest('[data-call]'); if (cl) { location.href = 'tel:' + String(cl.dataset.call).replace(/[^\d+]/g, ''); return; }
    const w2 = e.target.closest('[data-wa2]'); if (w2) { let d = String(w2.dataset.wa2).replace(/\D/g, ''); const cc = String((D && D.cc) || '20'); if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = cc + d.slice(1); location.href = 'https://wa.me/' + d; return; }
  });

  /* ---------- البداية (link.js بيقرر: شاشة الربط، أو بيانات الكاشير) ---------- */
  const ONLINE_MS = 5 * 60 * 1000;   // نبضة كل 4 دقايق (خالد 2026-11-16: كانت دقيقتين من 2.45.0)؛ لو الملخص بقاله 5 دقايق يبقى الكاشير مقفول
  let live = false;
  function paintLive() {
    const el = $('#h-live'); if (!D) { el.textContent = live ? '● متوصّل' : '● بيتوصّل'; el.classList.toggle('off', !live); return; }
    const on = Date.now() - (+D.at || 0) < ONLINE_MS;
    el.textContent = on ? (live ? '● لايف' : '● الكاشير شغال') : '● الكاشير مقفول'; el.classList.toggle('off', !on);
    $('#h-sub').textContent = 'آخر تحديث: ' + ago(+D.at || Date.now());
  }
  /* 🔔 الإشعارات والطلبات (خالد 2026-11-01): كل الإشعارات اللي وصلت (كاملة، من snap.notes) + طلبات الموظفين + التحويلات اللي ماتسجلتش.
     العدّاد = الجديد من آخر مرة فتحتها (rdo_notes_seen) + الطلبات المستنية */
  const seenT = () => { try { return +localStorage.getItem('rdo_notes_seen') || 0; } catch (e) { return 0; } };
  const pend = () => (D ? (D.approvals || []).filter(a => !(window.__aprSent || {})[a.id]).length + (D.watch || []).filter(w => !(window.__waSent || {})[w.id]).length : 0);
  /* الإشعارات: اسحب شمال = تتمسح، اسحب يمين = ⭐ مهمة (بتفضل لحد ما تمسحها، حتى لو الكاشير شالها من آخر 40). الحالة على التليفون
     (rdo_notes_del = مفاتيح اللي اتمسحت، rdo_notes_star = نسخة كاملة من المهمة) (خالد 2026-11-05) */
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const nkey = x => x.t + '|' + String(x.title || '').length;
  const delKeys = () => new Set(lsGet('rdo_notes_del', []));
  const starList = () => lsGet('rdo_notes_star', []);
  function visibleNotes() {   // المهمة الأول، وبعدها الأحدث؛ من غير اللي اتمسح
    const del = delKeys(), stars = starList(), sk = new Set(stars.map(nkey)), all = new Map();
    for (const x of (D && D.notes) || []) if (!del.has(nkey(x))) all.set(nkey(x), x);
    for (const x of stars) if (!del.has(nkey(x)) && !all.has(nkey(x))) all.set(nkey(x), x);
    return [...all.values()].map(x => ({ ...x, star: sk.has(nkey(x)) })).sort((p, q) => (q.star - p.star) || (q.t - p.t));
  }
  function setStar(x, on) { let l = starList().filter(y => nkey(y) !== nkey(x)); if (on) l.unshift({ t: x.t, title: x.title, body: x.body, kind: x.kind }); lsSet('rdo_notes_star', l.slice(0, 60)); }
  function delNote(x) { const d = [...delKeys(), nkey(x)]; lsSet('rdo_notes_del', d.slice(-400)); setStar(x, false); }
  function paintBell() {
    const n = (D ? visibleNotes().filter(x => x.t > seenT() && !x.star).length : 0) + pend(), el = $('#h-bell-n'); if (!el) return;
    el.hidden = !n; el.textContent = n > 99 ? '99+' : n;
  }
  const when = t => { const d = new Date(t), m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'دلوقتي' : m < 60 ? `من ${m} دقيقة` : m < 1440 ? `من ${Math.round(m / 60)} ساعة` : d.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' }); };
  const noteHTML = (x, s0) => `<div class="nt-w" data-nk="${esc(nkey(x))}"><div class="nt-bg"><span class="st">⭐ ${x.star ? 'شيل النجمة' : 'مهمة'}</span><span class="dl">🗑 مسح</span></div>
      <div class="nt-r${x.t > s0 ? ' new' : ''}${x.star ? ' star' : ''}"><b>${x.star ? '⭐ ' : ''}${esc(x.title)}</b>${x.body ? `<p>${esc(x.body)}</p>` : ''}<small>${when(x.t)}</small></div></div>`;
  function bindSwipe(root, s0) {
    root.querySelectorAll('.nt-w').forEach(w => {
      const row = w.querySelector('.nt-r'), key = w.dataset.nk;
      let x0 = 0, y0 = 0, dx = 0, on = false, lock = false, id = null;
      const note = () => visibleNotes().find(x => nkey(x) === key);
      row.addEventListener('pointerdown', e => { on = true; lock = false; dx = 0; x0 = e.clientX; y0 = e.clientY; id = e.pointerId; row.style.transition = 'none'; });
      row.addEventListener('pointermove', e => {
        if (!on) return; const ddx = e.clientX - x0, ddy = e.clientY - y0;
        if (!lock) { if (Math.abs(ddy) > 12 && Math.abs(ddy) > Math.abs(ddx)) { on = false; return; } if (Math.abs(ddx) < 10) return; lock = true; try { row.setPointerCapture(id); } catch (er) {} }
        dx = ddx; row.style.transform = `translateX(${dx}px)`; w.classList.toggle('to-del', dx < -10); w.classList.toggle('to-star', dx > 10);
      });
      const end = () => {
        if (!on) return; on = false; const x = note(); row.style.transition = 'transform .2s ease';
        if (!lock || !x) { row.style.transform = ''; return; }
        if (dx <= -90) {   // مسح: بتخرج وتتقفل
          row.style.transform = `translateX(-110%)`; delNote(x);
          setTimeout(() => { w.style.maxHeight = w.offsetHeight + 'px'; void w.offsetHeight; w.style.transition = 'max-height .2s ease, opacity .2s'; w.style.maxHeight = '0'; w.style.opacity = '0'; setTimeout(() => { w.remove(); paintBell(); if (!root.querySelector('.nt-w')) root.innerHTML = '<div class="lbl">لسه مفيش إشعارات</div>'; }, 220); }, 160);
        } else if (dx >= 90) {   // نجمة (أو شيلها): بترجع مكانها، والترتيب بيتحدّث
          setStar(x, !x.star); row.style.transform = ''; root.innerHTML = visibleNotes().map(n => noteHTML(n, s0)).join(''); bindSwipe(root, s0);   // root = قايمة الإشعارات نفسها
        } else row.style.transform = '';
        w.classList.remove('to-del', 'to-star');
      };
      row.addEventListener('pointerup', end); row.addEventListener('pointercancel', end);
    });
  }
  function bellHTML(s0, notes) {
    const reqs = VIEWS.home().split('<div class="card"><div class="lbl">💵')[0];   // نفس كروت الطلبات والتحويلات اللي في الرئيسية (بنفس الزراير)
    return `<button class="x" id="sh-x">✕</button><h3>🔔 الإشعارات والطلبات</h3>${reqs}
      <div class="card"><div class="lbl">📨 الإشعارات <small class="mut">⬅ اسحب شمال تمسح · اسحب يمين ⭐ مهمة ➡</small></div><div id="nt-list">${notes.length ? notes.map(x => noteHTML(x, s0)).join('') : '<div class="lbl">لسه مفيش إشعارات</div>'}</div></div>`;
  }
  function openBell() {
    if (!D) return;
    const s0 = seenT(), notes = visibleNotes();
    openSheet(bellHTML(s0, notes), $('#h-bell'));
    const nl = $('#nt-list'); if (nl) bindSwipe(nl, s0);
    if (notes.length) try { localStorage.setItem('rdo_notes_seen', String(Math.max(...notes.map(x => x.t)))); } catch (e) {}
    paintBell();
  }
  $('#h-bell').onclick = openBell;
  // البحث في حسابات العملا: بيحدّث القايمة بس (التحديث الهادي بيسيب الخانة والكلام زي ما هما)
  document.addEventListener('input', e => { if (e.target && e.target.id === 'ppl-q') { pplQ = e.target.value; paint('shift', null, true); } });
  // تبويب المتجر بيظهر بس لو المحل عنده متجر شغال (خالد 2026-11-14، فكرة 1)
  function storeTabShow() { const b = document.querySelector('#tabs [data-v="store"]'); if (b) b.hidden = !((FULL && FULL.store) || (D && D.store)); }
  function load(data) {
    D = data; storeTabShow();
    try { window.dispatchEvent(new Event('owner:data')); } catch (e) {}
    // الويدجت على الشاشة الرئيسية (RdWidget.java): الدرج ومكسب النهاردة والأجهزة في الصيانة
    try { const N = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.RdNative; if (N && N.widget) N.widget({ shop: data.shop || '', drawer: data.drawer ? money(data.drawer.now) : 'مفيش وردية', today: money(data.week && data.week.length ? data.week[data.week.length - 1].v : (data.today ? data.today.profit : 0)), proc: `🔧 ${(data.counts && data.counts.processing) || 0} في الصيانة · 📥 ${(data.counts && data.counts.waiting) || 0} استلمت` }).catch(() => {}); } catch (e) {}
    paintBell();
    if (window.Look && data && data.look) Look.fromCashier(data.look);   // الشكل زي الكاشير (theme.js)
    $('#h-title').textContent = cur === 'home' ? (D.shop || 'Repair Desk') : TITLES[cur];
    paintLive();
    if (!$('#sheet').hidden) { stale = true; return; }   // التفاصيل مفتوحة: مانرسمش من تحتها، هتترسم لما تتقفل
    paint(cur, null, true);   // أول مرة بتترسم عادي (بالعدّ)، وبعد كده التحديث هادي
    warmSoon();
  }
  /* أول فتح لتفاصيل جهاز / الإشعارات / أي تبويب كان تقيل (الستايل والإيموجي بيتحمّلوا أول مرة: ~160ms على موبايل متوسط، والمرة التانية ~35)،
     فبنرسمهم مرة مستخبيين لما الموبايل يبقى فاضي، واحد واحد علشان مانعملش تقطيع (خالد 2026-11-14، زي الإعدادات settings.js warm) */
  let warmed = false;
  function warmSoon() {
    if (warmed) return; warmed = true;
    const jobs = [
      () => { const t = (D.tickets || [])[0]; return t ? ['sheet', ticketHTML(t)] : null; },
      () => ['sheet', bellHTML(seenT(), visibleNotes())],
      ...ORDER.map(v => () => { if (v !== cur && !painted[v]) { const el = $(`.view[data-v="${v}"]`); el.innerHTML = VIEWS[v](); settle(el); painted[v] = 'warm'; } return null; }),   // التبويب اتجهّز مستخبي: أول ما تفتحه بيظهر على طول
    ];
    const idle = f => setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2000 }) : f()), 400);
    const next = () => {
      const j = jobs.shift(); if (!j) return;
      try {
        const r = D && $('#sheet').hidden && document.visibilityState === 'visible' ? j() : null;
        if (r) {
          const w = document.createElement(r[0] === 'view' ? 'section' : 'div'); w.className = r[0] === 'view' ? 'view on' : 'sheet'; w.setAttribute('aria-hidden', 'true');
          w.style.cssText = 'visibility:hidden;pointer-events:none;z-index:-1;position:fixed;left:0;right:0;top:0';
          w.innerHTML = r[1].replace(/ id="[^"]*"/g, ''); (r[0] === 'view' ? $('#views') : document.body).appendChild(w); void w.offsetHeight;
          requestAnimationFrame(() => requestAnimationFrame(() => w.remove()));
        }
      } catch (e) {}
      idle(next);
    };
    setTimeout(() => idle(next), 1500);
  }
  const skeleton = () => document.querySelectorAll('.view').forEach(v => { v.innerHTML = skeletonHTML(); });

  /* زرار الرجوع بتاع أندرويد (خالد 2026-10-30: كان بيخرج من التطبيق وهو فاتح الإعدادات):
     نافذة مفتوحة = تتقفل، صفحة غير الرئيسية = الرئيسية، الرئيسية = "دوس تاني علشان تخرج" (ثانيتين)، والتطبيق مقفول بالبصمة = يروح الخلفية */
  let lastBack = 0;
  function onBack() {
    const AppP = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
    const lk = document.getElementById('lock');
    if (lk && !lk.hidden) { if (AppP) AppP.minimizeApp(); return 'min'; }
    if (window.OwnerScan && OwnerScan.open()) { OwnerScan.close(); return 'scan'; }   // الكاميرا مفتوحة (scan.js)
    if (!$('#sheet').hidden) { history.back(); return 'sheet'; }
    if ($('#pair').hidden && cur !== 'home') { go('home'); return 'home'; }
    if (Date.now() - lastBack < 2000) { if (AppP) AppP.exitApp(); return 'exit'; }
    lastBack = Date.now(); window.Owner.toast('دوس رجوع تاني علشان تخرج'); return 'ask';
  }
  try { const AppP = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App; if (AppP) AppP.addListener('backButton', onBack); } catch (e) {}
  window.Owner = {
    back: onBack,
    setFull: (p, st) => { FULL = p && Object.keys(p).length ? p : null; FULLST = st || ''; storeTabShow(); if (D && $('#sheet').hidden) paint(cur, null, true); },
    full: () => FULL,
    load, skeleton, openSheet, closeSheet: () => { if (!$('#sheet').hidden) history.back(); },
    data: () => D, repaint: () => { if (D && $('#sheet').hidden) paint(cur, null, true); }, go,
    toast: (msg, bad) => { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3000); },
    // نسخة جديدة من التطبيق: زرار في الراس بيفتح ملف التثبيت
    showUpdate: j => {
      if ($('#h-upd')) return;
      const b = document.createElement('button'); b.id = 'h-upd'; b.className = 'upd'; b.textContent = '⬆ تحديث ' + j.version;
      b.onclick = () => { if (confirm('فيه نسخة جديدة (' + j.version + ')' + (j.notes ? ':\n' + j.notes : '') + '\n\nهتنزل في المتصفح، وبعدين دوس عليها وثبّتها.')) location.href = j.url; };
      $('.top-r').prepend(b);
    },
    empty: msg => { D = null; document.querySelectorAll('.view').forEach(v => { v.innerHTML = `<div class="empty">${esc(msg)}</div>`; }); paintLive(); },
    setLive: v => { live = !!v; paintLive(); },
    setStatus: (msg, bad) => { $('#h-sub').textContent = msg; if (bad && !D) Owner.empty(msg); },
  };
  skeleton();
  setInterval(paintLive, 30000);
  $('#h-menu').onclick = () => {
    if (window.AppSettings) return AppSettings.open();
    const sh = $('#sheet'), bg = $('#sheet-bg');
    sh.innerHTML = `<button class="x" id="sh-x">✕</button><h3>⋮ الإعدادات</h3><div class="lbl">التطبيق بيقرا بس من الكاشير.</div>
      <div class="card" style="margin-top:12px"><button class="tk" id="m-refresh">🔄 <span class="t"><b>حدّث دلوقتي</b></span></button></div>
      <div class="card" style="margin-top:10px" id="m-lock-c" hidden><button class="tk" id="m-lock">🔒 <span class="t"><b>قفل بالبصمة</b><small id="m-lock-s"></small></span></button></div>
      <div class="card" style="margin-top:10px"><button class="tk" id="m-unlink">🔓 <span class="t"><b>افصل الموبايل ده</b><small>علشان تربطه تاني: كود من الكاشير، أو ادخل بحساب المحل</small></span></button></div>`;
    sh.hidden = false; bg.hidden = false; requestAnimationFrame(() => bg.classList.add('on'));
    heroFrom = null; history.pushState({ sheet: 1 }, '');
    $('#sh-x').onclick = () => history.back();
    $('#m-refresh').onclick = () => { history.back(); if (window.OwnerLink) OwnerLink.refresh(); };
    // قفل البصمة (lock.js): بيظهر بس لو الموبايل عليه بصمة
    const lockTxt = () => { $('#m-lock-s').textContent = AppLock.on() ? 'شغال: بيقفل لما تفتح التطبيق أو ترجعله بعد دقيقة' : 'مقفول'; };
    if (window.AppLock) AppLock.available().then(ok => { if (!ok || !$('#m-lock-c')) return; $('#m-lock-c').hidden = false; lockTxt();
      $('#m-lock').onclick = async () => { const r = await AppLock.toggle(); if (r.error) alert(r.error); else lockTxt(); }; });
    $('#m-unlink').onclick = async () => { if (!confirm('تفصل الموبايل ده من الكاشير؟')) return; if (window.AppLock && !(await AppLock.confirm('علشان تفصل الموبايل'))) return; history.back(); if (window.OwnerLink) OwnerLink.forget(); };   // البصمة الأول علشان مايتفصلش بالغلط
  };
})();
