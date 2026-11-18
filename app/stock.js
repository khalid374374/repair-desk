/* المخزن والفاتورة والجرد من موبايل الصاحب (خالد 2026-10-31: "زي الكمبيوتر بالظبط"، والجرد من التليفون أسهل من الرجوع للكمبيوتر).
   الأصناف بتيجي مع ملخص الكاشير (D.stock: [id, الاسم, الكمية, السعر, التكلفة, القسم, الباركود, الحد الأدنى, النوع]).
   أي تغيير = طلب للكاشير (OwnerLink.submit: sell / stock / count) وهو اللي بينفّذه بنفس دوال الكمبيوتر، ولحد ما يرد بيبان "⏳ مستني الكاشير". */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const KIND = { sell: 'فاتورة', stock: 'مخزن', count: 'جرد' };
  const CAT = { part: '🔩 قطع غيار', acc: '🎧 إكسسوار' };
  /* نوع الصنف زي الكاشير بالظبط (renderer/stockui.js: SUBS و PSUBS، خالد 2026-11-01) */
  const SUBS = { acc: [['case', '📱 جراب'], ['scr', '🛡 اسكرينة'], ['lens', '📷 حماية عدسة'], ['chg', '⚡ شاحن'], ['cable', '🔌 وصلة'], ['pbank', '🔋 باور بانك'], ['car', '🚗 شاحن عربية'], ['ear', '🎧 سماعة'], ['buds', '🎵 ايربودز'], ['head', '🎧 هيدفون'], ['sub', '🔊 صب / سبيكر'], ['watch', '⌚ ساعة'], ['band', '🔗 باند / استيك'], ['laptop', '💻 لابتوب'], ['pc', '🖥 كمبيوتر مكتبي'], ['mon', '🖥 شاشة كمبيوتر'], ['kb', '⌨️ ماوس وكيبورد'], ['lbag', '🎒 شنط وستاندات'], ['game', '🎮 جيمنج'], ['net', '📡 شبكات'], ['print', '🖨 طابعات وحبر'], ['pcpart', '🧩 قطع كمبيوتر'], ['drive', '💽 هارد و SSD'], ['mem', '💾 كارت ميموري'], ['flash', '💽 فلاشة'], ['adp', '🔀 محول'], ['batt', '🔋 بطاريات'], ['other', '📦 أخرى']],
    part: [['lcd', '📱 شاشة'], ['glass', '🔲 زجاج / عدسة'], ['bat', '🔋 بطارية'], ['flex', '🎗 فلاتة'], ['port', '🔌 سوكت شحن'], ['back', '🪟 ضهر / فريم'], ['cam', '📷 كاميرا'],
      ['spk', '🔊 سماعة / جرس'], ['mic', '🎙 مايك'], ['btn', '🔘 زراير'], ['ic', '🧩 IC / بوردة'], ['pother', '🔧 أخرى']] };
  const subName = it => { const f = (SUBS[it.cat === 'acc' ? 'acc' : 'part'] || []).find(c => c[0] === it.sub); return f && it.sub !== 'pother' ? f[1] : ''; };
  /* خالد 2026-11-16: "كمبيوتر" اختيار تالت (زي الكاشير). في البيانات هو إكسسوار، القايمة بس اللي بتتقسم */
  const PCS = ['laptop', 'pc', 'mon', 'kb', 'lbag', 'game', 'net', 'print', 'pcpart', 'drive'];
  const isPc = it => it && it.cat === 'acc' && PCS.includes(it.sub);
  const subOpts = (cat, v) => { const L = cat === 'pc' ? SUBS.acc.filter(c => PCS.includes(c[0])) : cat === 'acc' ? SUBS.acc.filter(c => !PCS.includes(c[0])) : SUBS.part; if (!L.some(c => c[0] === v)) v = L[L.length - 1][0]; return L.map(c => `<option value="${c[0]}"${c[0] === v ? ' selected' : ''}>${c[1]}</option>`).join(''); };
  let cat = 'all', q = '';

  const D = () => (window.Owner && Owner.data()) || null;
  const items = () => { const d = D(); return ((d && d.stock && d.stock.items) || []).map(a => ({ id: a[0], name: a[1], qty: a[2], price: a[3], cost: a[4], cat: a[5], code: a[6], min: a[7], sub: a[8] })); };
  const people = () => { const d = D(); return ((d && d.stock && d.stock.people) || []).map(p => ({ id: p[0], name: p[1] })); };
  const find = id => items().find(x => x.id === id);
  const byCode = c => { c = String(c || '').trim(); return c ? items().find(x => x.code === c) : null; };
  const norm = s => String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
  const match = (it, s) => { const n = norm(s); return !n || norm(it.name).includes(n) || it.code === String(s).trim(); };
  const isLow = it => it.qty <= 0 || (it.min > 0 && it.qty <= it.min);

  /* ---------- صفحة المخزن ---------- */
  const qtyChip = it => `<span class="chip ${isLow(it) ? 'late' : ''}">${fmt(it.qty)}</span>`;
  const rowHTML = it => `<button class="tk" data-it="${esc(it.id)}"><span class="t"><b>${esc(it.name)}</b><small>${CAT[it.cat] || ''}${subName(it) ? ' · ' + esc(subName(it)) : ''}${it.price ? ' · ' + fmt(it.price) : ''}</small></span>${qtyChip(it)}</button>`;
  function listHTML() {
    const L = items().filter(it => (cat === 'all' || (cat === 'low' ? isLow(it) : it.cat === cat)) && match(it, q));
    if (!L.length) return `<div class="empty">${items().length ? 'مفيش أصناف بالاسم ده' : 'المخزن فاضي. دوس ➕ صنف'}</div>`;
    return L.slice(0, 200).map(rowHTML).join('') + (L.length > 200 ? `<div class="lbl" style="text-align:center;padding:8px">${fmt(L.length - 200)} صنف كمان — دوّر بالاسم</div>` : '');
  }
  const segHTML = () => { const all = items(), lowN = all.filter(isLow).length; return [['all', 'الكل'], ['acc', 'إكسسوار'], ['part', 'قطع غيار'], ['low', `قرّب يخلص${lowN ? ' ' + lowN : ''}`]].map(([k, n]) => `<button class="${cat === k ? 'on' : ''}" data-pcat="${k}">${n}</button>`).join(''); };
  function pendHTML() {
    const P = window.OwnerLink ? OwnerLink.pending().filter(p => KIND[p.kind]) : [];
    return P.map(p => `<div class="pend ${p.status === 'failed' ? 'bad' : ''}"><span>${p.status === 'failed' ? '⚠' : '⏳'}</span><b>${esc(KIND[p.kind])}: ${esc(p.label)}<small>${p.status === 'failed' ? esc(p.error || 'الكاشير رفض الطلب') : 'مستني الكاشير يسجّله'}</small></b>${p.status === 'failed' ? `<button data-pend-x="${esc(p.id)}">✕</button>` : ''}</div>`).join('');
  }
  function view() {
    const d = D(); if (!d) return '';
    if (!d.stock) return '<div class="empty">حدّث برنامج الكاشير علشان المخزن يظهر هنا</div>';
    const all = items(), val = all.reduce((s, it) => s + Math.max(0, it.qty) * (it.cost || 0), 0);
    return `<div class="grid3"><button class="mini" id="ps-inv"><b>🧾</b><span>فاتورة جديدة</span></button><button class="mini" id="ps-count"><b>📋</b><span>جرد</span></button><button class="mini" id="ps-new"><b>➕</b><span>صنف جديد</span></button></div>
      ${pendHTML()}
      <div class="card"><div class="row"><span>📦 الأصناف</span><b>${fmt(all.length)}</b></div><div class="row"><span>💰 قيمة البضاعة (بسعر الشراء)</span><b>${fmt(val)}</b></div></div>
      <div class="ps-search"><input id="ps-q" type="search" placeholder="🔍 دوّر بالاسم أو الباركود" value="${esc(q)}"><button id="ps-scan" class="ps-cam" aria-label="امسح الباركود">📷</button></div>
      <div class="seg" id="ps-seg">${segHTML()}</div><div id="ps-list">${listHTML()}</div>`;
  }

  /* ---------- الإرسال للكاشير ---------- */
  async function send(op, label, btn) {
    if (JSON.stringify(op).length > 3900) { const e = $('#f-err'); if (e) e.textContent = 'الطلب كبير. قسّمه على مرتين.'; return false; }
    if (btn) btn.disabled = true;
    const r = await OwnerLink.submit(op, label);
    if (btn) btn.disabled = false;
    if (r.error) { const e = $('#f-err'); if (e) e.textContent = r.error; else Owner.toast(r.error, true); return false; }
    return true;
  }
  const done = msg => { Owner.closeSheet(); Owner.toast(msg || '📤 اتبعت للكاشير'); };
  const read = () => { const o = {}; document.querySelectorAll('#sheet [data-f]').forEach(i => { o[i.dataset.f] = i.value.trim(); }); return o; };
  const field = (k, label, v, attrs) => `<label>${label}<input data-f="${k}" value="${esc(v)}" ${attrs || ''}></label>`;
  const money = 'type="number" inputmode="decimal" min="0" step="any"', count = 'type="number" inputmode="numeric" min="0" step="1"';

  /* ---------- الصنف: التفاصيل والفورم ---------- */
  function itemSheet(it, from) {
    Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>${esc(it.name)}</h3><div class="lbl">${CAT[it.cat] || ''}${subName(it) ? ' · ' + esc(subName(it)) : ''}</div>
      <div class="card" style="margin-top:12px">
        <div class="row"><span>📦 الكمية</span><b class="${isLow(it) ? 'o' : ''}">${fmt(it.qty)}</b></div>
        <div class="row"><span>🏷 سعر البيع</span><b>${fmt(it.price)}</b></div>
        <div class="row"><span>💵 سعر الشراء</span><b>${fmt(it.cost)}</b></div>
        <div class="row"><span>⚠ الحد الأدنى</span><b>${fmt(it.min)}</b></div>
        ${it.code ? `<div class="row"><span>▮▯ الباركود</span><b>${esc(it.code)}</b></div>` : ''}
      </div>
      <div class="acts"><button class="act go" data-ia="recv">📥 بضاعة وصلت</button><button class="act" data-ia="adj">🔢 تظبيط الكمية</button></div>
      <div class="acts"><button class="act" data-ia="edit">✏ تعديل</button><button class="act no" data-ia="del">🗑 مسح</button></div>`, from);
    $('#sheet').dataset.item = it.id;
  }
  function itemForm(it, code) {
    const e = !!it, x = it || { cat: 'acc', code: code || '' };
    Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>${e ? '✏ تعديل ' + esc(x.name) : '➕ صنف جديد'}</h3>
      <div class="fm">
        ${field('name', 'اسم الصنف *', x.name, 'maxlength="60" placeholder="اسكرينة A10"')}
        <label>القسم<select data-f="cat"><option value="acc"${x.cat === 'acc' && !isPc(x) ? ' selected' : ''}>🎧 إكسسوار</option><option value="pc"${isPc(x) ? ' selected' : ''}>💻 كمبيوتر</option><option value="part"${x.cat !== 'acc' ? ' selected' : ''}>🔩 قطع غيار</option></select></label>
        <label>نوعه<select data-f="sub">${subOpts(isPc(x) ? 'pc' : x.cat, x.sub)}</select></label>
        <div class="two">${field('cost', 'سعر الشراء', e ? x.cost : '', money)}${field('price', 'سعر البيع', e ? x.price : '', money)}</div>
        <div class="two">${e ? '' : field('qty', 'الكمية', '', count)}${field('min', 'الحد الأدنى', e ? x.min : '', count)}</div>
        <label>الباركود<div class="ps-search"><input data-f="code" value="${esc(x.code)}" inputmode="numeric" dir="ltr" placeholder="فاضي = البرنامج يعمله"><button type="button" class="ps-cam" id="if-scan">📷</button></div></label>
        <div class="err" id="f-err"></div><button class="add-btn" id="if-go">${e ? '💾 حفظ' : '➕ ضيف الصنف'}</button>
      </div>`);
    const cs = document.querySelector('#sheet [data-f="cat"]'), ss = document.querySelector('#sheet [data-f="sub"]');
    cs.onchange = () => { ss.innerHTML = subOpts(cs.value, ''); };
    $('#if-scan').onclick = async () => { const c = await OwnerScan.scan('امسح باركود الصنف'); if (c) document.querySelector('#sheet [data-f="code"]').value = c; };
    $('#if-go').onclick = async ev => {
      const o = read(); if (!o.name) { $('#f-err').textContent = 'اكتب اسم الصنف'; return; }
      const other = items().find(y => y.id !== (it && it.id) && norm(y.name) === norm(o.name)); if (other) { $('#f-err').textContent = 'الصنف ده موجود بالفعل'; return; }
      if (o.code) { const c = byCode(o.code); if (c && c.id !== (it && it.id)) { $('#f-err').textContent = 'الباركود ده متسجل لـ ' + c.name; return; } }
      const pick = { name: o.name, cat: o.cat === 'pc' ? 'acc' : o.cat, sub: o.sub, cost: o.cost, price: o.price, min: o.min, code: o.code };
      if (!e) pick.qty = o.qty;
      for (const k of Object.keys(pick)) if (pick[k] === '' && k !== 'code') delete pick[k];
      if (e && !pick.code) delete pick.code;
      const ok = await send(e ? { kind: 'stock', act: 'edit', id: it.id, o: pick } : { kind: 'stock', act: 'add', o: pick }, (e ? '✏ ' : '➕ ') + o.name, ev.currentTarget);
      if (ok) done();
    };
    setTimeout(() => { const i = $('#sheet [data-f="name"]'); if (i && !e) i.focus(); }, 350);
  }
  function qtyForm(it, mode) {
    const recv = mode === 'recv';
    Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>${recv ? '📥 بضاعة وصلت' : '🔢 تظبيط الكمية'} — ${esc(it.name)}</h3>
      <div class="fm"><div class="card"><div class="row"><span>📦 الكمية دلوقتي</span><b>${fmt(it.qty)}</b></div></div>
        ${recv ? `<div class="two">${field('qty', 'الكمية اللي وصلت *', '', count)}${field('cost', 'سعر الشراء الجديد', '', money + ' placeholder="' + fmt(it.cost) + '"')}</div>`
          : `${field('qty', 'الكمية الصح *', it.qty, count)}${field('note', 'السبب', '', 'maxlength="120" placeholder="اتكسر / اتعد غلط..."')}`}
        <div class="err" id="f-err"></div><button class="add-btn" id="qf-go">${recv ? '📥 ضيف' : '💾 حفظ'}</button></div>`);
    $('#qf-go').onclick = async ev => {
      const o = read(), n = Math.round(num(o.qty));
      if (o.qty === '' || n < (recv ? 1 : 0)) { $('#f-err').textContent = 'اكتب الكمية'; return; }
      const op = recv ? { kind: 'stock', act: 'receive', id: it.id, qty: n, cost: o.cost } : { kind: 'stock', act: 'adjust', id: it.id, qty: n, note: o.note };
      if (await send(op, (recv ? '📥 ' + it.name + ' +' + n : '🔢 ' + it.name + ' ← ' + n), ev.currentTarget)) done();
    };
    setTimeout(() => { const i = $('#sheet [data-f="qty"]'); if (i) { i.focus(); i.select && i.select(); } }, 350);
  }
  async function delItem(it) {
    if (!confirm('تمسح ' + it.name + ' من المخزن؟' + (it.qty ? '\n(عليه ' + it.qty + ' قطعة)' : ''))) return;
    if (window.AppLock && !(await AppLock.confirm('علشان تمسح الصنف'))) return;
    if (await send({ kind: 'stock', act: 'remove', id: it.id }, '🗑 ' + it.name)) done();
  }

  /* ---------- الفاتورة ---------- */
  let inv = null;
  const lineMax = l => { const it = find(l.id); return it ? it.qty : l.qty; };
  function invTotals() { const sub = inv.lines.reduce((s, l) => s + l.qty * num(l.price), 0), disc = Math.min(num(inv.discount), sub); return { sub, disc, total: sub - disc }; }
  function invLinesHTML() {
    if (!inv.lines.length) return '<div class="empty" style="padding:14px 0">ضيف أصناف بالبحث أو 📷</div>';
    return inv.lines.map((l, i) => `<div class="iv-l" data-i="${i}"><div class="iv-n"><b>${esc(l.name)}</b><small>المتاح ${fmt(lineMax(l))}</small></div>
      <div class="iv-q"><button data-q="-1">−</button><span class="num">${l.qty}</span><button data-q="1">+</button></div>
      <input class="iv-p" type="number" inputmode="decimal" min="0" step="any" value="${esc(l.price)}"><button class="iv-x" data-ix>✕</button></div>`).join('');
  }
  function invTotHTML() {
    const t = invTotals();
    return `${t.disc ? `<div class="row"><span>قبل الخصم</span><b>${fmt(t.sub)}</b></div><div class="row"><span>الخصم</span><b class="r">−${fmt(t.disc)}</b></div>` : ''}<div class="row"><span><b>الإجمالي</b></span><b class="g">${fmt(t.total)}</b></div>`;
  }
  function invPersonHTML() {
    if (inv.pay !== 'acct') return '';
    const P = people(); if (!P.length) return '<div class="lbl">مفيش عملا متسجلين. ضيفه من الوردية على الكاشير الأول.</div>';
    return `<label>العميل *<select id="iv-pp"><option value="">— اختار —</option>${P.map(p => `<option value="${esc(p.id)}"${inv.person === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>`;
  }
  const PAY = [['shift', '💵 في درج الوردية'], ['me', '👤 معايا أنا'], ['acct', '📒 على حساب عميل']];
  function invPaint() { $('#iv-lines').innerHTML = invLinesHTML(); $('#iv-tot').innerHTML = invTotHTML(); }
  function invAdd(it) {
    if (!it) return;
    if (it.qty <= 0) { Owner.toast('⚠ ' + it.name + ' خلص من المخزن', true); return; }
    const ex = inv.lines.find(l => l.id === it.id);
    if (ex) { if (ex.qty < it.qty) ex.qty++; else Owner.toast('المتاح ' + it.qty + ' بس', true); }
    else inv.lines.push({ id: it.id, name: it.name, qty: 1, price: it.price || 0 });
    $('#iv-q').value = ''; $('#iv-res').innerHTML = ''; invPaint();
  }
  const resHTML = (s, attr) => {
    if (!norm(s)) return '';
    const L = items().filter(it => match(it, s)).slice(0, 8);
    return L.length ? `<div class="card ps-res">${L.map(it => `<button class="tk" ${attr}="${esc(it.id)}"${it.qty <= 0 && attr === 'data-iva' ? ' disabled' : ''}><span class="t"><b>${esc(it.name)}</b><small>${it.price ? fmt(it.price) + ' · ' : ''}المتاح ${fmt(it.qty)}</small></span></button>`).join('')}</div>` : '<div class="lbl" style="padding:6px 2px">مفيش صنف بالاسم ده</div>';
  };
  function invoice(from) {
    inv = { lines: [], discount: '', customer: '', pay: 'shift', person: '' };
    Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>🧾 فاتورة جديدة</h3>
      <div class="fm">
        <div class="ps-search"><input id="iv-q" type="search" placeholder="🔍 دوّر على صنف"><button type="button" class="ps-cam" id="iv-scan">📷</button></div>
        <div id="iv-res"></div><div id="iv-lines"></div>
        <div class="two"><label>خصم<input id="iv-disc" type="number" inputmode="decimal" min="0" step="any"></label><label>اسم العميل<input id="iv-cust" maxlength="40"></label></div>
        <label>الفلوس فين؟</label><div class="seg" id="iv-pay">${PAY.map(([k, n]) => `<button class="${k === 'shift' ? 'on' : ''}" data-pay="${k}">${n}</button>`).join('')}</div>
        <div class="lbl" id="iv-payn"></div><div id="iv-person"></div>
        <div class="card" id="iv-tot"></div>
        <div class="err" id="f-err"></div><button class="add-btn" id="iv-go">📤 ابعت الفاتورة للكاشير</button>
      </div>`, from);
    invPaint(); payNote();
    $('#iv-scan').onclick = async () => { const c = await OwnerScan.scan('امسح باركود الصنف'); if (!c) return; const it = byCode(c); if (it) invAdd(it); else Owner.toast('الباركود ده مش متسجل في المخزن: ' + c, true); };
    $('#iv-go').onclick = async ev => {
      const err = $('#f-err');
      if (!inv.lines.length) { err.textContent = 'الفاتورة فاضية'; return; }
      for (const l of inv.lines) if (l.qty > lineMax(l)) { err.textContent = 'الكمية مش كفاية: ' + l.name; return; }
      if (inv.pay === 'acct' && !inv.person) { err.textContent = 'اختار العميل'; return; }
      const t = invTotals();
      const op = { kind: 'sell', lines: inv.lines.map(l => ({ id: l.id, qty: l.qty, price: num(l.price) })), discount: t.disc, customer: inv.customer, pay: inv.pay, person: inv.person };
      if (await send(op, `${fmt(t.total)} (${inv.lines.reduce((s, l) => s + l.qty, 0)} قطعة)${inv.pay === 'me' ? ' — معايا' : inv.pay === 'acct' ? ' — على الحساب' : ''}`, ev.currentTarget)) done('📤 الفاتورة اتبعتت للكاشير');
    };
  }
  function payNote() {
    const n = { shift: 'زي الكمبيوتر: الفلوس بتتحسب في درج الوردية', me: 'الفلوس معاك: مابتدخلش الدرج (بتتسجل سحب شخصي)، والمكسب بيتحسب في التقارير', acct: 'بتتسجل على كارت العميل في الوردية' }[inv.pay];
    $('#iv-payn').textContent = n; $('#iv-person').innerHTML = invPersonHTML();
  }

  /* ---------- الجرد ---------- */
  let cnt = null;   // [{ id, actual }] بالترتيب
  function cntHTML() {
    if (!cnt.length) return '<div class="empty" style="padding:14px 0">امسح الصنف أو دوّر عليه، واكتب العدد اللي على الرف</div>';
    return cnt.map((c, i) => { const it = find(c.id) || { name: '؟', qty: 0 }, d = c.actual === '' ? null : Math.round(num(c.actual)) - it.qty;
      return `<div class="iv-l" data-c="${i}"><div class="iv-n"><b>${esc(it.name)}</b><small>البرنامج ${fmt(it.qty)}${d ? ` · <bdi dir="ltr" class="${d < 0 ? 'r' : 'g'}">${d > 0 ? '+' : ''}${d}</bdi>` : d === 0 ? ' · ✓' : ''}</small></div>
        <input class="ct-a" type="number" inputmode="numeric" min="0" step="1" placeholder="العدد" value="${esc(c.actual)}"><button class="iv-x" data-cx>✕</button></div>`; }).join('');
  }
  function cntAdd(it) {
    if (!it) return;
    let i = cnt.findIndex(c => c.id === it.id);
    if (i < 0) { cnt.unshift({ id: it.id, actual: '' }); i = 0; }
    $('#ct-q').value = ''; $('#ct-res').innerHTML = ''; $('#ct-list').innerHTML = cntHTML();
    const inp = document.querySelector(`#ct-list [data-c="${i}"] .ct-a`); if (inp) inp.focus();
  }
  function stockCount(from) {
    cnt = [];
    Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>📋 جرد المخزن</h3><div class="lbl">العد الفعلي ↔ البرنامج. الناقص بيتسجل بقيمته ويوصلك إشعار.</div>
      <div class="fm" style="margin-top:10px">
        <div class="ps-search"><input id="ct-q" type="search" placeholder="🔍 دوّر على صنف"><button type="button" class="ps-cam" id="ct-scan">📷</button></div>
        <button type="button" class="act" id="ct-rand" style="width:100%">🎲 جرد سريع: 10 أصناف عشوائي</button>
        <div id="ct-res"></div><div id="ct-list">${cntHTML()}</div>
        <div class="err" id="f-err"></div><button class="add-btn" id="ct-go">📤 ابعت الجرد للكاشير</button>
      </div>`, from);
    $('#ct-scan').onclick = async () => { const c = await OwnerScan.scan('امسح باركود الصنف'); if (!c) return; const it = byCode(c); if (it) cntAdd(it); else Owner.toast('الباركود ده مش متسجل في المخزن: ' + c, true); };
    $('#ct-rand').onclick = () => {
      const pool = items().filter(it => !cnt.some(c => c.id === it.id));
      for (let k = 0; k < 10 && pool.length; k++) cnt.push({ id: pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id, actual: '' });
      $('#ct-list').innerHTML = cntHTML();
    };
    $('#ct-go').onclick = async ev => {
      const rows = cnt.filter(c => c.actual !== '').map(c => ({ id: c.id, actual: Math.max(0, Math.round(num(c.actual))) }));
      if (!rows.length) { $('#f-err').textContent = 'اكتب العدد لصنف واحد على الأقل'; return; }
      const short = rows.reduce((s, r) => { const it = find(r.id); return s + (it && r.actual < it.qty ? it.qty - r.actual : 0); }, 0);
      for (let k = 0; k < rows.length; k += 60) {   // الطلب الواحد له حد في الحجم
        const part = rows.slice(k, k + 60);
        if (!(await send({ kind: 'count', rows: part }, `${part.length} صنف${short && k === 0 ? ' · ناقص ' + short : ''}`, ev.currentTarget))) return;
      }
      done('📤 الجرد اتبعت للكاشير');
    };
  }

  /* ---------- الأحداث ---------- */
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'ps-q') { q = t.value; const l = $('#ps-list'); if (l) l.innerHTML = listHTML(); return; }
    if (t.id === 'iv-q') { $('#iv-res').innerHTML = resHTML(t.value, 'data-iva'); return; }
    if (t.id === 'ct-q') { $('#ct-res').innerHTML = resHTML(t.value, 'data-cta'); return; }
    if (t.id === 'iv-disc') { inv.discount = t.value; $('#iv-tot').innerHTML = invTotHTML(); return; }
    if (t.id === 'iv-cust') { inv.customer = t.value.trim(); return; }
    if (t.classList.contains('iv-p')) { const l = inv.lines[+t.closest('.iv-l').dataset.i]; if (l) { l.price = t.value; $('#iv-tot').innerHTML = invTotHTML(); } return; }
    if (t.classList.contains('ct-a')) { const c = cnt[+t.closest('.iv-l').dataset.c]; if (c) c.actual = t.value; return; }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'iv-pp') inv.person = e.target.value;
    if (e.target.classList.contains('ct-a')) {   // الفرق يبان بعد ما يخلّص كتابة (السطر ده بس، علشان الخانة اللي بعدها ماتفقدش الكيبورد)
      const row = e.target.closest('.iv-l'), tmp = document.createElement('div'); tmp.innerHTML = cntHTML();
      const fresh = tmp.querySelector(`[data-c="${row.dataset.c}"] .iv-n small`); if (fresh) row.querySelector('.iv-n small').innerHTML = fresh.innerHTML;
    }
  });
  document.addEventListener('keydown', e => {   // قارئ باركود موصّل بالموبايل (بيكتب الكود + Enter)
    if (e.key !== 'Enter') return;
    const t = e.target, it = t && (t.id === 'iv-q' || t.id === 'ct-q') ? byCode(t.value) : null;
    if (it) { e.preventDefault(); if (t.id === 'iv-q') invAdd(it); else cntAdd(it); }
  });
  document.addEventListener('click', async e => {
    const t = e.target;
    const pc = t.closest('[data-pcat]'); if (pc) { cat = pc.dataset.pcat; $('#ps-seg').innerHTML = segHTML(); $('#ps-list').innerHTML = listHTML(); return; }
    if (t.closest('#ps-inv')) return invoice(t.closest('#ps-inv'));
    if (t.closest('#ps-count')) return stockCount(t.closest('#ps-count'));
    if (t.closest('#ps-new')) return itemForm(null);
    if (t.closest('#ps-scan')) {
      const c = await OwnerScan.scan('امسح باركود الصنف'); if (!c) return;
      const it = byCode(c); if (it) return itemSheet(it);
      if (confirm('الباركود ده (' + c + ') مش متسجل. تضيفه صنف جديد؟')) itemForm(null, c);
      return;
    }
    const row = t.closest('#ps-list [data-it]'); if (row) { const it = find(row.dataset.it); if (it) itemSheet(it, row); return; }
    const ia = t.closest('#sheet [data-ia]');
    if (ia) { const it = find($('#sheet').dataset.item); if (!it) return; const a = ia.dataset.ia; if (a === 'edit') return itemForm(it); if (a === 'del') return delItem(it); return qtyForm(it, a); }
    const iva = t.closest('[data-iva]'); if (iva) return invAdd(find(iva.dataset.iva));
    const cta = t.closest('[data-cta]'); if (cta) return cntAdd(find(cta.dataset.cta));
    const qb = t.closest('.iv-q [data-q]');
    if (qb && inv) { const l = inv.lines[+qb.closest('.iv-l').dataset.i]; if (!l) return; const n = l.qty + (+qb.dataset.q); if (n < 1) return; if (n > lineMax(l)) { Owner.toast('المتاح ' + lineMax(l) + ' بس', true); return; } l.qty = n; invPaint(); return; }
    const ix = t.closest('[data-ix]'); if (ix && inv) { inv.lines.splice(+ix.closest('.iv-l').dataset.i, 1); invPaint(); return; }
    const cx = t.closest('[data-cx]'); if (cx && cnt) { cnt.splice(+cx.closest('.iv-l').dataset.c, 1); $('#ct-list').innerHTML = cntHTML(); return; }
    const pay = t.closest('#iv-pay [data-pay]'); if (pay && inv) { inv.pay = pay.dataset.pay; document.querySelectorAll('#iv-pay button').forEach(b => b.classList.toggle('on', b === pay)); payNote(); return; }
  });
  window.OwnerStock = { view };
})();
